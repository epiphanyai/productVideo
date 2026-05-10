import { createMiroMcpServer, listMiroMcpToolNames } from "@/lib/agent-runtime/miro-mcp";
import { createShotlist } from "@/lib/agent-runtime/shotlist";
import { Agent, run } from "@openai/agents";
import { z } from "zod";
import type {
  ImageShotlistResult,
  MiroBoardContext,
  MiroBoardContextItem,
  MiroBoardResult,
  ProductBrief,
  ProductPhoto,
  Shotlist
} from "@/lib/workflow/types";

type RouteShotlistToMiroOptions = {
  boardUrl?: string;
};

const boardShotSchema = z.object({
  title: z.string(),
  durationSeconds: z.number().int().min(2).max(12),
  framing: z.string(),
  motion: z.string(),
  prompt: z.string(),
  assets: z.array(z.string())
});

const boardShotlistSchema = z.object({
  productName: z.string(),
  concept: z.string(),
  shots: z.array(boardShotSchema).min(3).max(12)
});

const boardInterpreterAgent = new Agent({
  name: "Miro Product Video Board Interpreter",
  instructions: [
    "Interpret a Miro board as the source of truth for a product video shotlist.",
    "Use all board text, document content, item metadata, and image references provided.",
    "Preserve collaborator intent over the original brief when the board differs.",
    "Return only structured output matching the schema.",
    "Write image-to-video-ready prompts that describe the first frame, product framing, and action."
  ].join(" "),
  outputType: boardShotlistSchema
});

export async function createMiroBoardFromBrief(
  brief: ProductBrief,
  options: RouteShotlistToMiroOptions = {}
): Promise<MiroBoardResult> {
  const seedShotlist = await createShotlist(brief);

  return routeShotlistToMiro(seedShotlist, options);
}

export async function createImageShotlistFromMiro({
  boardUrl,
  brief,
  photos
}: {
  boardUrl: string;
  brief: ProductBrief;
  photos: ProductPhoto[];
}): Promise<ImageShotlistResult> {
  const normalizedBoardUrl = normalizeMiroBoardUrl(boardUrl);
  if (!normalizedBoardUrl) {
    throw new Error("Miro board URL is required.");
  }
  const boardContext = await runStage("Miro board readback", () => readMiroBoardContext(normalizedBoardUrl));
  const shotlist = await runStage("Miro board interpretation", () => interpretMiroBoardAsShotlist(brief, boardContext));

  return {
    shotlist: {
      ...shotlist,
      shots: shotlist.shots.map((shot, index) => ({
        ...shot,
        imagePrompt: buildStartingImagePrompt(shotlist, shot, index),
        sourceImageUrls: Array.from(new Set([...photos.map((photo) => photo.url), ...boardContext.imageUrls]))
      }))
    },
    boardContext,
    imageStatus: "mocked",
    message: `${boardContext.items.length} Miro item${
      boardContext.items.length === 1 ? "" : "s"
    } interpreted. Starting images will generate one shot at a time.`
  };
}

async function runStage<T>(stage: string, task: () => Promise<T>): Promise<T> {
  try {
    return await task();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(`${stage} failed: ${message}`);
  }
}

export async function routeShotlistToMiro(
  shotlist: Shotlist,
  options: RouteShotlistToMiroOptions = {}
): Promise<MiroBoardResult> {
  const server = createMiroMcpServer(getMiroMcpConfigWithFallback(), {
    redirectUrl: getMiroOAuthRedirectUrl()
  });

  if (!server) {
    const boardUrl = normalizeMiroBoardUrl(options.boardUrl) ?? null;

    return {
      boardId: boardUrl ? extractBoardId(boardUrl) ?? `mcp-${shotlist.id}` : `mcp-${shotlist.id}`,
      boardUrl,
      provider: "miro-mcp",
      status: "mocked",
      itemCount: shotlist.shots.length + 1,
      itemIds: [],
      message:
        "Miro MCP is not configured. Set MIRO_MCP_URL or MIRO_MCP_COMMAND/MIRO_MCP_ARGS to enable live Miro board routing."
    };
  }

  try {
    const tools = await listMiroMcpToolNames(server);

    if (!tools.includes("board_create") || !tools.includes("layout_create")) {
      return await routeShotlistWithCurrentMiroTools(server, shotlist, tools, normalizeMiroBoardUrl(options.boardUrl));
    }

    const boardResult = await server.callTool("board_create", {
      description: `Product video shotlist for ${shotlist.productName}. ${shotlist.concept}`,
      name: `${truncate(shotlist.productName, 60)} Shotlist`
    });
    const boardText = getMcpText(boardResult);
    const boardUrl = findMiroBoardUrl(boardText);

    if (!boardUrl) {
      throw new Error(`Miro board_create did not return a board URL: ${truncate(boardText, 500)}`);
    }

    if (tools.includes("layout_get_dsl")) {
      await server.callTool("layout_get_dsl", {});
    }

    const layoutResult = await server.callTool("layout_create", {
      dsl: createShotlistLayoutDsl(shotlist),
      miro_url: boardUrl
    });
    const layoutText = getMcpText(layoutResult);
    const itemUrls = findMiroItemUrls(layoutText);

    return {
      boardId: extractBoardId(boardUrl) ?? `mcp-${shotlist.id}`,
      boardUrl,
      provider: "miro-mcp",
      status: "created",
      itemCount: shotlist.shots.length * 2,
      itemIds: itemUrls,
      tools,
      message: `Created a Miro board with ${shotlist.shots.length} linked shot sticky notes.`
    };
  } finally {
    await server.close();
  }
}

async function routeShotlistWithCurrentMiroTools(
  server: NonNullable<ReturnType<typeof createMiroMcpServer>>,
  shotlist: Shotlist,
  tools: string[],
  boardUrl: string | null
): Promise<MiroBoardResult> {
  if (!boardUrl) {
    throw new Error(
      "This Miro MCP session does not expose board_create, and its create tools reject new-board requests. Paste an existing Miro board URL or connect to an MCP endpoint that advertises board_create."
    );
  }

  if (tools.includes("diagram_create")) {
    const placement = await getNextMiroPlacement(server, tools, boardUrl);

    if (tools.includes("diagram_get_dsl")) {
      await server.callTool("diagram_get_dsl", {
        diagram_type: "flowchart",
        miro_url: boardUrl
      });
    }

    const diagramResult = await server.callTool("diagram_create", {
      diagram_dsl: createShotlistFlowchartDsl(shotlist),
      diagram_type: "flowchart",
      miro_url: boardUrl,
      title: `${truncate(shotlist.productName, 60)} Shot Flow`,
      x: placement.x,
      y: placement.y
    });
    const diagramText = getMcpText(diagramResult);
    assertMiroToolSuccess(diagramResult, "diagram_create");
    const resultBoardUrl = findMiroBoardUrl(diagramText) ?? boardUrl;

    return {
      boardId: extractBoardId(resultBoardUrl) ?? `mcp-${shotlist.id}`,
      boardUrl: resultBoardUrl,
      provider: "miro-mcp",
      status: "created",
      itemCount: shotlist.shots.length,
      itemIds: Array.from(new Set(findMiroItemUrls(diagramText))),
      tools,
      message: `Created a linked Miro shot flow for ${shotlist.shots.length} shots.`
    };
  }

  if (!tools.includes("doc_create")) {
    throw new Error(`Miro MCP does not expose a supported write tool. Available tools: ${tools.join(", ")}`);
  }

  const docResult = await server.callTool("doc_create", {
    content: createShotlistMarkdown(shotlist),
    miro_url: boardUrl,
    x: 0,
    y: 0
  });
  const docText = getMcpText(docResult);
  assertMiroToolSuccess(docResult, "doc_create");
  const resultBoardUrl = findMiroBoardUrl(docText) ?? boardUrl;

  return {
    boardId: extractBoardId(resultBoardUrl) ?? `mcp-${shotlist.id}`,
    boardUrl: resultBoardUrl,
    provider: "miro-mcp",
    status: "created",
    itemCount: 1,
    itemIds: Array.from(new Set(findMiroItemUrls(docText))),
    tools,
    message: `Created a Miro shotlist document for ${shotlist.shots.length} shots because this MCP session does not expose sticky note or diagram creation.`
  };
}

export async function inspectMiroMcp(): Promise<MiroBoardResult> {
  const server = createMiroMcpServer(getMiroMcpConfigWithFallback(), {
    redirectUrl: getMiroOAuthRedirectUrl()
  });

  if (!server) {
    return {
      boardId: "mcp-not-configured",
      boardUrl: null,
      provider: "miro-mcp",
      status: "mocked",
      itemCount: 0,
      itemIds: [],
      message:
        "Miro MCP is not configured. Set MIRO_MCP_URL or MIRO_MCP_COMMAND/MIRO_MCP_ARGS to run a live MCP smoke test."
    };
  }

  try {
    const tools = await listMiroMcpToolNames(server);

    return {
      boardId: "mcp-connected",
      boardUrl: null,
      provider: "miro-mcp",
      status: "mocked",
      itemCount: 0,
      itemIds: [],
      tools,
      message: `Miro MCP connected. Found ${tools.length} available tool${tools.length === 1 ? "" : "s"}.`
    };
  } finally {
    await server.close();
  }
}

async function readMiroBoardContext(boardUrl: string): Promise<MiroBoardContext> {
  const server = createMiroMcpServer(getMiroMcpConfigWithFallback(), {
    redirectUrl: getMiroOAuthRedirectUrl()
  });

  if (!server) {
    return {
      boardUrl,
      tools: [],
      text: `Miro MCP is not configured. Board URL supplied by user: ${boardUrl}`,
      items: [],
      imageUrls: [],
      raw: []
    };
  }

  try {
    const tools = await listMiroMcpToolNames(server);
    const raw: unknown[] = [];

    if (tools.includes("board_list_items")) {
      raw.push(
        await callMiroToolSafely(server, "board_list_items", {
          item_type: null,
          limit: 100,
          miro_url: boardUrl
        })
      );
    }

    if (tools.includes("layout_read")) {
      raw.push(
        await callMiroToolSafely(server, "layout_read", {
          miro_url: boardUrl
        })
      );
    }

    const itemCandidates = collectBoardItems(raw);
    const itemIds = itemCandidates.map((item) => item.id).filter((id): id is string => Boolean(id));

    if (tools.includes("doc_get")) {
      for (const itemId of itemIds.slice(0, 20)) {
        raw.push(
          await callMiroToolSafely(server, "doc_get", {
            item_id: itemId,
            miro_url: boardUrl
          })
        );
      }
    }

    if (tools.includes("image_get_url")) {
      for (const itemId of itemIds.slice(0, 30)) {
        raw.push(
          await callMiroToolSafely(server, "image_get_url", {
            item_id: itemId,
            miro_url: boardUrl
          })
        );
      }
    }

    if (tools.includes("image_get_data")) {
      for (const itemId of itemIds.slice(0, 10)) {
        raw.push(
          await callMiroToolSafely(server, "image_get_data", {
            item_id: itemId,
            miro_url: boardUrl
          })
        );
      }
    }

    const text = raw.map((result) => getMcpText(result)).filter(Boolean).join("\n\n");
    const items = collectBoardItems(raw);
    const imageUrls = Array.from(new Set([...extractImageUrls(text), ...items.flatMap((item) => item.imageUrl ?? [])]));

    return {
      boardUrl,
      tools,
      text,
      items,
      imageUrls,
      raw
    };
  } finally {
    await server.close();
  }
}

async function interpretMiroBoardAsShotlist(brief: ProductBrief, boardContext: MiroBoardContext): Promise<Shotlist> {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return createMockShotlistFromBoard(brief, boardContext);
  }

  const result = await run(
    boardInterpreterAgent,
    JSON.stringify(
      {
        brief: {
          productName: brief.productName,
          description: brief.description,
          audience: brief.audience,
          style: brief.style,
          photos: brief.photos.map((photo) => ({ name: photo.name, url: photo.url }))
        },
        board: {
          url: boardContext.boardUrl,
          tools: boardContext.tools,
          text: truncate(boardContext.text, 20_000),
          imageUrls: boardContext.imageUrls,
          items: boardContext.items.slice(0, 100)
        }
      },
      null,
      2
    )
  );

  if (!result.finalOutput) {
    throw new Error("Miro board interpreter did not return structured output.");
  }

  return normalizeBoardShotlist(brief, result.finalOutput, boardContext.imageUrls);
}

function createMockShotlistFromBoard(brief: ProductBrief, boardContext: MiroBoardContext): Shotlist {
  const productName = brief.productName.trim() || "Product";
  const sourceLines = boardContext.text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 12 && !/^https?:\/\//i.test(line))
    .slice(0, 5);
  const shots = (sourceLines.length ? sourceLines : [
    `Hero reveal for ${productName}`,
    `Show the core problem and audience need`,
    `Demonstrate the most important product detail`,
    `Show the product in use`,
    `End on a confident final product frame`
  ]).map((line, index) => ({
    id: `shot-${String(index + 1).padStart(2, "0")}`,
    title: toTitle(line, index),
    durationSeconds: 4,
    framing: index === 0 ? "Clean product hero frame" : "Board-informed product detail frame",
    motion: index === 0 ? "Slow reveal and settle" : "Short controlled motion that supports the Miro note",
    prompt: line,
    assets: [...brief.photos.map((photo) => photo.name), ...boardContext.imageUrls].slice(0, 8)
  }));

  return {
    id: `miro-shotlist-${Date.now()}`,
    productName,
    style: brief.style,
    concept:
      sourceLines[0] ??
      `A product video interpreted from the current Miro board for ${productName}.`,
    targetDurationSeconds: shots.reduce((total, shot) => total + shot.durationSeconds, 0),
    visualFeatureCount: Math.max(brief.photos.length, boardContext.imageUrls.length, 1),
    shots,
    createdAt: new Date().toISOString()
  };
}

function normalizeBoardShotlist(
  brief: ProductBrief,
  draft: z.infer<typeof boardShotlistSchema>,
  imageUrls: string[]
): Shotlist {
  const productName = draft.productName.trim() || brief.productName.trim() || "Product";
  const shots = draft.shots.map((shot, index) => ({
    id: `shot-${String(index + 1).padStart(2, "0")}`,
    title: shot.title.trim() || `Shot ${index + 1}`,
    durationSeconds: shot.durationSeconds,
    framing: shot.framing.trim(),
    motion: shot.motion.trim(),
    prompt: shot.prompt.trim(),
    assets: shot.assets.filter((asset) => asset.trim()).map((asset) => asset.trim())
  }));

  return {
    id: `miro-shotlist-${Date.now()}`,
    productName,
    style: brief.style,
    concept: draft.concept.trim() || `Miro-generated shotlist for ${productName}.`,
    targetDurationSeconds: shots.reduce((total, shot) => total + shot.durationSeconds, 0),
    visualFeatureCount: Math.max(brief.photos.length, imageUrls.length, 1),
    shots,
    createdAt: new Date().toISOString()
  };
}

export function createMockMiroBoardResult(shotlist: Shotlist): MiroBoardResult {
  return {
    boardId: `mcp-${shotlist.id}`,
    boardUrl: null,
    provider: "miro-mcp",
    status: "mocked",
    itemCount: shotlist.shots.length + 1,
    itemIds: [],
    message:
      "Miro MCP route prepared. Wire this adapter to the Miro MCP server OAuth session to create the board and shot cards."
  };
}

function getMiroMcpConfigWithFallback() {
  return process.env.MIRO_MCP_URL || process.env.MIRO_MCP_COMMAND
    ? undefined
    : {
        transport: "http" as const,
        url: "https://mcp.miro.com/"
      };
}

function getMiroOAuthRedirectUrl() {
  return process.env.MIRO_OAUTH_REDIRECT_URL || "http://localhost:3000/api/miro/auth/callback";
}

function createShotlistLayoutDsl(shotlist: Shotlist) {
  const frameWidth = Math.max(1200, shotlist.shots.length * 340 + 220);
  const frameHeight = 760;
  const lines = [
    `shotlist_frame FRAME x=0 y=0 w=${frameWidth} h=${frameHeight} fill=#F4F5F7 "${escapeDsl(
      `${shotlist.productName} Shotlist`
    )}"`,
    `title TEXT parent=shotlist_frame x=${Math.round(frameWidth / 2)} y=70 w=${Math.min(
      1000,
      frameWidth - 160
    )} font=open_sans size=28 align=center color=#1D2528 "${escapeDsl(shotlist.concept)}"`
  ];

  shotlist.shots.forEach((shot, index) => {
    const x = 190 + index * 340;
    const stickyColor = index % 2 === 0 ? "light_yellow" : "light_blue";
    const content = [
      `${index + 1}. ${shot.title} (${shot.durationSeconds}s)`,
      "",
      shot.prompt,
      "",
      `Framing: ${shot.framing}`,
      `Motion: ${shot.motion}`,
      shot.assets.length ? `Assets: ${shot.assets.join(", ")}` : ""
    ]
      .filter(Boolean)
      .join("\n");

    lines.push(
      `shot_${index + 1} STICKY parent=shotlist_frame x=${x} y=310 w=260 color=${stickyColor} shape=rectangle align=left valign=top "${escapeDsl(
        content
      )}"`
    );

    if (index < shotlist.shots.length - 1) {
      lines.push(
        `arrow_${index + 1} SHAPE parent=shotlist_frame x=${x + 170} y=310 w=70 h=42 type=right_arrow fill=#2F6F63 color=#FFFFFF border_color=#2F6F63 "${index + 1}"`
      );
    }
  });

  return lines.join("\n");
}

function createShotlistMarkdown(shotlist: Shotlist) {
  const lines = [
    `# ${shotlist.productName} Shotlist`,
    "",
    shotlist.concept,
    "",
    ...shotlist.shots.flatMap((shot, index) => [
      `## ${index + 1}. ${shot.title} (${shot.durationSeconds}s)`,
      "",
      shot.prompt,
      "",
      `**Framing:** ${shot.framing}`,
      "",
      `**Motion:** ${shot.motion}`,
      "",
      shot.assets.length ? `**Assets:** ${shot.assets.join(", ")}` : "",
      ""
    ])
  ];

  return lines.filter((line, index, allLines) => line || allLines[index - 1]).join("\n");
}

function createShotlistFlowchartDsl(shotlist: Shotlist) {
  const nodes = shotlist.shots.map((shot, index) => {
    const id = `n${index + 1}`;
    const label = sanitizeMiroDiagramLabel([
      `${index + 1}. ${shot.title}`,
      `${shot.durationSeconds}s - ${shot.framing}`,
      shot.motion,
      truncate(shot.prompt, 160)
    ].join(" | "));

    return `${id} ${label} flowchart-process`;
  });
  const links = shotlist.shots.slice(0, -1).map((_, index) => `c n${index + 1} next n${index + 2}`);

  return ["graphdir LR", ...nodes, ...links].join("\n");
}

function getMcpText(result: { type: string; text?: string }[] | unknown) {
  if (!Array.isArray(result)) {
    return JSON.stringify(result);
  }

  const text = result
    .map((item) => (item && typeof item === "object" && "text" in item ? String(item.text ?? "") : ""))
    .filter(Boolean)
    .join("\n");

  return text || JSON.stringify(result);
}

async function getNextMiroPlacement(
  server: NonNullable<ReturnType<typeof createMiroMcpServer>>,
  tools: string[],
  boardUrl: string
) {
  if (!tools.includes("board_list_items")) {
    return { x: 0, y: Date.now() % 10_000 };
  }

  try {
    const result = await server.callTool("board_list_items", {
      item_type: null,
      limit: 100,
      miro_url: boardUrl
    });
    const parsed = parseMcpJsonObject(result);
    const itemCount = typeof parsed?.total === "number" ? parsed.total : 0;

    return {
      x: 0,
      y: itemCount * 180 + (Date.now() % 100)
    };
  } catch {
    return { x: 0, y: Date.now() % 10_000 };
  }
}

function assertMiroToolSuccess(result: unknown, toolName: string) {
  const parsed = parseMcpJsonObject(result);
  if (parsed && parsed.success === false) {
    throw new Error(`${toolName} failed: ${String(parsed.message ?? getMcpText(result)).slice(0, 500)}`);
  }

  const text = getMcpText(result);
  if (/^(invalid|error|failed|board creation is not available|access denied)/i.test(text.trim())) {
    throw new Error(`${toolName} failed: ${truncate(text, 500)}`);
  }
}

function parseMcpJsonObject(result: unknown) {
  if (Array.isArray(result) && result.length === 1) {
    const item = result[0];
    if (item && typeof item === "object" && "text" in item) {
      try {
        const parsed = JSON.parse(String(item.text ?? "")) as unknown;
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
      } catch {
        return null;
      }
    }
  }

  if (result && typeof result === "object" && !Array.isArray(result)) {
    return result as Record<string, unknown>;
  }

  return null;
}

async function callMiroToolSafely(
  server: NonNullable<ReturnType<typeof createMiroMcpServer>>,
  toolName: string,
  args: Record<string, unknown>
) {
  try {
    return await server.callTool(toolName, args);
  } catch (error) {
    return [
      {
        type: "text",
        text: `${toolName} unavailable for this item or board: ${
          error instanceof Error ? error.message : String(error)
        }`
      }
    ];
  }
}

function collectBoardItems(rawResults: unknown[]): MiroBoardContextItem[] {
  const values = rawResults.flatMap((result) => collectObjects(parseMcpValue(result)));
  const itemLikeValues = values.filter((value) => {
    const type = stringField(value, "type") ?? stringField(value, "itemType");
    const id = stringField(value, "id") ?? stringField(value, "item_id");
    const content = getBoardItemContent(value);
    const url = stringField(value, "url");
    const hasMiroItemShape =
      Boolean(id && (type || content || url)) ||
      Boolean(type && content) ||
      Boolean(url?.includes("miro.com/app/board/"));

    return hasMiroItemShape;
  });

  const seen = new Set<string>();

  return itemLikeValues
    .map((value, index) => ({
      id: stringField(value, "id") ?? stringField(value, "item_id") ?? `item-${index + 1}`,
      type: stringField(value, "type") ?? stringField(value, "itemType"),
      title: stringField(value, "title") ?? stringField(value, "name"),
      content: getBoardItemContent(value),
      url: stringField(value, "url"),
      imageUrl: extractImageUrls(JSON.stringify(value)).at(0),
      metadata: value
    }))
    .filter((item) => {
      const key = `${item.id}:${item.type ?? ""}:${item.content ?? ""}`;
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function parseMcpValue(result: unknown): unknown {
  if (Array.isArray(result)) {
    return result.map((item) => {
      if (item && typeof item === "object" && "text" in item) {
        const text = String((item as { text?: unknown }).text ?? "");
        try {
          return JSON.parse(text) as unknown;
        } catch {
          return text;
        }
      }

      return item;
    });
  }

  return result;
}

function collectObjects(value: unknown): Record<string, unknown>[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectObjects(item));
  }

  if (typeof value !== "object") {
    return [];
  }

  const record = value as Record<string, unknown>;

  return [record, ...Object.values(record).flatMap((item) => collectObjects(item))];
}

function getBoardItemContent(value: Record<string, unknown>) {
  const fields = ["content", "text", "description", "plainText", "markdown", "data"];

  for (const field of fields) {
    const direct = value[field];
    if (typeof direct === "string" && direct.trim()) {
      return direct.trim();
    }

    if (direct && typeof direct === "object" && !Array.isArray(direct)) {
      const nested = stringField(direct as Record<string, unknown>, "content") ?? stringField(direct as Record<string, unknown>, "text");
      if (nested) {
        return nested;
      }
    }
  }

  return undefined;
}

function stringField(value: Record<string, unknown>, field: string) {
  const fieldValue = value[field];

  return typeof fieldValue === "string" && fieldValue.trim() ? fieldValue.trim() : undefined;
}

function extractImageUrls(value: string) {
  return Array.from(
    value.matchAll(/https?:\/\/[^\s"'<>\\)]+?\.(?:png|jpe?g|webp|gif)(?:\?[^\s"'<>\\)]*)?/gi)
  ).map((match) => match[0]);
}

function findMiroBoardUrl(value: string) {
  return value.match(/https:\/\/miro\.com\/app\/board\/[^"\\\s)]+/i)?.[0] ?? null;
}

function findMiroItemUrls(value: string) {
  return Array.from(value.matchAll(/https:\/\/miro\.com\/app\/board\/[^"\\\s)]+/gi)).map((match) => match[0]);
}

function extractBoardId(boardUrl: string) {
  return boardUrl.match(/\/board\/([^/?#]+)/)?.[1] ?? null;
}

function normalizeMiroBoardUrl(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (!url.hostname.endsWith("miro.com") || !url.pathname.includes("/app/board/")) {
      throw new Error("Invalid Miro board URL.");
    }

    return url.toString();
  } catch {
    throw new Error("Paste a valid Miro board URL that starts with https://miro.com/app/board/.");
  }
}

function toTitle(value: string, index: number) {
  const cleaned = value
    .replace(/[#*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return `Shot ${index + 1}`;
  }

  return truncate(cleaned, 56);
}

function escapeDsl(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\r\n", "\\n")
    .replaceAll("\n", "\\n");
}

function sanitizeMiroDiagramLabel(value: string) {
  return value
    .replaceAll("\r\n", " ")
    .replaceAll("\n", " ")
    .replaceAll("|", "-")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function buildStartingImagePrompt(shotlist: Shotlist, shot: Shotlist["shots"][number], index: number) {
  return [
    `Create the first frame for shot ${index + 1} of ${shotlist.shots.length} in a product video for ${shotlist.productName}.`,
    `Overall concept: ${shotlist.concept}`,
    `Shot title: ${shot.title}`,
    `Visual action: ${shot.prompt}`,
    `Framing: ${shot.framing}`,
    `Motion cue to set up: ${shot.motion}`,
    "Generate a clean 16:9 product-video starting image that can be used as an image-to-video reference."
  ].join("\n");
}

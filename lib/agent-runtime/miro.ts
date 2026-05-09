import { createMiroMcpServer, listMiroMcpToolNames } from "@/lib/agent-runtime/miro-mcp";
import type { MiroBoardResult, Shotlist } from "@/lib/workflow/types";

type RouteShotlistToMiroOptions = {
  boardUrl?: string;
};

export async function routeShotlistToMiro(
  shotlist: Shotlist,
  options: RouteShotlistToMiroOptions = {}
): Promise<MiroBoardResult> {
  const server = createMiroMcpServer(getMiroMcpConfigWithFallback(), {
    redirectUrl: getMiroOAuthRedirectUrl()
  });

  if (!server) {
    return {
      boardId: `mcp-${shotlist.id}`,
      boardUrl: null,
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

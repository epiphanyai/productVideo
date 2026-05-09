import { createMiroMcpServer, listMiroMcpToolNames } from "@/lib/agent-runtime/miro-mcp";
import type { MiroBoardResult, Shotlist } from "@/lib/workflow/types";

export async function routeShotlistToMiro(shotlist: Shotlist): Promise<MiroBoardResult> {
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

function getMcpText(result: { type: string; text?: string }[] | unknown) {
  if (!Array.isArray(result)) {
    return JSON.stringify(result);
  }

  return result
    .map((item) => (item && typeof item === "object" && "text" in item ? String(item.text ?? "") : ""))
    .filter(Boolean)
    .join("\n");
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

function escapeDsl(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\r\n", "\\n")
    .replaceAll("\n", "\\n");
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

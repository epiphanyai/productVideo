import { Agent, run } from "@openai/agents";
import { z } from "zod";
import { createMiroMcpServer, listMiroMcpToolNames } from "@/lib/agent-runtime/miro-mcp";
import type { MiroBoardResult, Shotlist } from "@/lib/workflow/types";

const miroRouteSchema = z.object({
  boardId: z.string(),
  boardUrl: z.string().nullable(),
  itemCount: z.number().int().nonnegative(),
  itemIds: z.array(z.string()),
  message: z.string()
});

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

    if (!process.env.OPENAI_API_KEY?.trim()) {
      return {
        boardId: `mcp-${shotlist.id}`,
        boardUrl: null,
        provider: "miro-mcp",
        status: "mocked",
        itemCount: shotlist.shots.length + 1,
        itemIds: [],
        tools,
        message:
          "Miro MCP connected and listed tools. Add OPENAI_API_KEY to let the agent create the board and shot cards."
      };
    }

    const agent = new Agent({
      name: "Miro Shotlist Routing Agent",
      instructions: [
        "Create a Miro board for product video shotlist review using the connected Miro MCP tools.",
        "Add a clear title item with the product name and concept.",
        "Create one card, sticky note, or equivalent board item per shot.",
        "Each shot item must include title, duration, framing, motion, generation prompt, and assets.",
        "Return the resulting board id, board URL when available, created item ids, item count, and a concise message."
      ].join(" "),
      mcpServers: [server],
      mcpConfig: {
        includeServerInToolNames: true
      },
      outputType: miroRouteSchema
    });

    const result = await run(agent, JSON.stringify(shotlist, null, 2));

    if (!result.finalOutput) {
      throw new Error("Miro routing agent did not return structured output.");
    }

    return {
      ...result.finalOutput,
      provider: "miro-mcp",
      status: "created",
      tools
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

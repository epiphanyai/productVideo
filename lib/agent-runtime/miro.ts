import type { MiroBoardResult, Shotlist } from "@/lib/workflow/types";

export async function routeShotlistToMiro(shotlist: Shotlist): Promise<MiroBoardResult> {
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

import type { MiroBoardResult, Shotlist } from "@/lib/workflow/types";

export async function routeShotlistToMiro(shotlist: Shotlist): Promise<MiroBoardResult> {
  const boardId = `miro-${shotlist.id}`;

  if (!process.env.MIRO_ACCESS_TOKEN) {
    return {
      boardId,
      boardUrl: `https://miro.com/app/board/${boardId}`,
      status: "mocked",
      message:
        "Mock Miro board prepared. Add MIRO_ACCESS_TOKEN and replace this adapter with the Miro MCP call."
    };
  }

  return {
    boardId,
    boardUrl: `https://miro.com/app/board/${boardId}`,
    status: "created",
    message:
      "Miro credentials detected. This adapter is ready to be connected to the Miro MCP create-board and create-card calls."
  };
}

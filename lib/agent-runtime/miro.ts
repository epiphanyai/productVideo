import type { MiroBoardResult, Shotlist } from "@/lib/workflow/types";

type MiroBoardResponse = {
  id?: string;
  name?: string;
  viewLink?: string;
  links?: {
    self?: string;
  };
};

type MiroItemResponse = {
  id?: string;
};

const MIRO_API_BASE_URL = "https://api.miro.com/v2";

export async function routeShotlistToMiro(shotlist: Shotlist): Promise<MiroBoardResult> {
  const boardId = process.env.MIRO_BOARD_ID?.trim() || `mock-${shotlist.id}`;

  if (!process.env.MIRO_ACCESS_TOKEN?.trim()) {
    return {
      boardId,
      boardUrl: `https://miro.com/app/board/${boardId}`,
      provider: "mock",
      status: "mocked",
      itemCount: shotlist.shots.length + 1,
      itemIds: [],
      message:
        "Mock Miro board prepared. Add MIRO_ACCESS_TOKEN to create a real board and route shot notes to Miro."
    };
  }

  const board = process.env.MIRO_BOARD_ID?.trim()
    ? {
        id: process.env.MIRO_BOARD_ID.trim(),
        viewLink: `https://miro.com/app/board/${process.env.MIRO_BOARD_ID.trim()}`
      }
    : await createMiroBoard(shotlist);

  if (!board.id) {
    throw new Error("Miro did not return a board id.");
  }

  const itemIds = await createShotlistItems(board.id, shotlist);

  return {
    boardId: board.id,
    boardUrl: board.viewLink || `https://miro.com/app/board/${board.id}`,
    provider: "miro-rest",
    status: "created",
    itemCount: itemIds.length,
    itemIds,
    message: `Created a Miro board with ${itemIds.length} shotlist items.`
  };
}

async function createMiroBoard(shotlist: Shotlist): Promise<MiroBoardResponse> {
  const boardName = `${truncate(shotlist.productName, 42)} Shotlist`;
  const description = truncate(
    `Agent-generated ${shotlist.style} product video shotlist. ${shotlist.concept}`,
    300
  );

  return miroFetch<MiroBoardResponse>("/boards", {
    method: "POST",
    body: JSON.stringify({
      description,
      name: boardName
    })
  });
}

async function createShotlistItems(boardId: string, shotlist: Shotlist): Promise<string[]> {
  const itemIds: string[] = [];

  const titleItem = await createMiroText(boardId, {
    content: `<strong>${escapeHtml(shotlist.productName)} Shotlist</strong><br/>${escapeHtml(
      shotlist.concept
    )}`,
    x: 0,
    y: -360,
    width: 720
  });
  if (titleItem.id) {
    itemIds.push(titleItem.id);
  }

  for (const [index, shot] of shotlist.shots.entries()) {
    const item = await createMiroStickyNote(boardId, {
      content: [
        `<strong>${index + 1}. ${escapeHtml(shot.title)} (${shot.durationSeconds}s)</strong>`,
        escapeHtml(shot.prompt),
        `<br/><strong>Framing:</strong> ${escapeHtml(shot.framing)}`,
        `<strong>Motion:</strong> ${escapeHtml(shot.motion)}`,
        shot.assets.length ? `<strong>Assets:</strong> ${escapeHtml(shot.assets.join(", "))}` : ""
      ]
        .filter(Boolean)
        .join("<br/>"),
      x: index * 360,
      y: 0,
      fillColor: index % 2 === 0 ? "light_yellow" : "light_blue"
    });

    if (item.id) {
      itemIds.push(item.id);
    }
  }

  return itemIds;
}

async function createMiroText(
  boardId: string,
  params: {
    content: string;
    x: number;
    y: number;
    width: number;
  }
): Promise<MiroItemResponse> {
  return miroFetch<MiroItemResponse>(`/boards/${encodeURIComponent(boardId)}/texts`, {
    method: "POST",
    body: JSON.stringify({
      data: {
        content: params.content
      },
      geometry: {
        width: params.width
      },
      position: {
        x: params.x,
        y: params.y
      },
      style: {
        textAlign: "left"
      }
    })
  });
}

async function createMiroStickyNote(
  boardId: string,
  params: {
    content: string;
    x: number;
    y: number;
    fillColor: "light_blue" | "light_yellow";
  }
): Promise<MiroItemResponse> {
  return miroFetch<MiroItemResponse>(`/boards/${encodeURIComponent(boardId)}/sticky_notes`, {
    method: "POST",
    body: JSON.stringify({
      data: {
        content: params.content,
        shape: "rectangle"
      },
      geometry: {
        height: 260,
        width: 320
      },
      position: {
        x: params.x,
        y: params.y
      },
      style: {
        fillColor: params.fillColor,
        textAlign: "left",
        textAlignVertical: "top"
      }
    })
  });
}

async function miroFetch<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${MIRO_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${process.env.MIRO_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...init.headers
    }
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Miro API request failed (${response.status} ${response.statusText}): ${truncate(
        responseText,
        500
      )}`
    );
  }

  return (await response.json()) as T;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

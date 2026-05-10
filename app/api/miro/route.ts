import { NextResponse } from "next/server";
import { createMiroBoardFromBrief, inspectMiroMcp, routeShotlistToMiro } from "@/lib/agent-runtime/miro";
import type { ProductBrief, Shotlist } from "@/lib/workflow/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json({ miro: await inspectMiroMcp() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to inspect Miro MCP.";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(request: Request) {
  try {
    const { boardUrl, brief, shotlist } = (await request.json()) as {
      boardUrl?: string;
      brief?: ProductBrief;
      shotlist?: Shotlist;
    };

    if (brief?.description?.trim()) {
      return NextResponse.json({ miro: await createMiroBoardFromBrief(brief, { boardUrl }) });
    }

    if (!shotlist?.shots?.length) {
      return NextResponse.json({ error: "Product brief is required." }, { status: 400 });
    }

    // Backward-compatible path for existing clients that already hold a shotlist.
    return NextResponse.json({ miro: await routeShotlistToMiro(shotlist, { boardUrl }) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to route shotlist to Miro.";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}

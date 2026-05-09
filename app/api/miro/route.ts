import { NextResponse } from "next/server";
import { inspectMiroMcp, routeShotlistToMiro } from "@/lib/agent-runtime/miro";
import type { Shotlist } from "@/lib/workflow/types";

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
    const { boardUrl, shotlist } = (await request.json()) as { boardUrl?: string; shotlist: Shotlist };

    if (!shotlist?.shots?.length) {
      return NextResponse.json({ error: "Shotlist is required." }, { status: 400 });
    }

    return NextResponse.json({ miro: await routeShotlistToMiro(shotlist, { boardUrl }) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to route shotlist to Miro.";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}

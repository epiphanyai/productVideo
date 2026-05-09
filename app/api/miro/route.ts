import { NextResponse } from "next/server";
import { routeShotlistToMiro } from "@/lib/agent-runtime/miro";
import type { Shotlist } from "@/lib/workflow/types";

export async function POST(request: Request) {
  try {
    const { shotlist } = (await request.json()) as { shotlist: Shotlist };

    if (!shotlist?.shots?.length) {
      return NextResponse.json({ error: "Shotlist is required." }, { status: 400 });
    }

    return NextResponse.json({ miro: await routeShotlistToMiro(shotlist) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to route shotlist to Miro.";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}

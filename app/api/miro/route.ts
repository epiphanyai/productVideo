import { NextResponse } from "next/server";
import { routeShotlistToMiro } from "@/lib/agent-runtime/miro";
import type { Shotlist } from "@/lib/workflow/types";

export async function POST(request: Request) {
  const { shotlist } = (await request.json()) as { shotlist: Shotlist };

  if (!shotlist?.shots?.length) {
    return NextResponse.json({ error: "Shotlist is required." }, { status: 400 });
  }

  return NextResponse.json({ miro: await routeShotlistToMiro(shotlist) });
}

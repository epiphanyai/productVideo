import { NextResponse } from "next/server";
import { createVideoFromShotlist } from "@/lib/agent-runtime/video";
import type { ProductPhoto, Shotlist } from "@/lib/workflow/types";

export async function POST(request: Request) {
  const { shotlist, photos } = (await request.json()) as {
    shotlist: Shotlist;
    photos: ProductPhoto[];
  };

  if (!shotlist?.shots?.length) {
    return NextResponse.json({ error: "Shotlist is required." }, { status: 400 });
  }

  return NextResponse.json({ video: await createVideoFromShotlist(shotlist, photos ?? []) });
}

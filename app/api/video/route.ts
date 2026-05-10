import { NextResponse } from "next/server";
import { createVideoFromShotlist } from "@/lib/agent-runtime/video";
import type { ProductPhoto, Shotlist } from "@/lib/workflow/types";

export async function POST(request: Request) {
  try {
    const { shotlist, photos, quality } = (await request.json()) as {
      shotlist: Shotlist;
      photos: ProductPhoto[];
      quality?: "draft" | "final";
    };

    if (!shotlist?.shots?.length) {
      return NextResponse.json({ error: "Shotlist is required." }, { status: 400 });
    }

    return NextResponse.json({ video: await createVideoFromShotlist(shotlist, photos ?? [], quality ?? "draft") });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create video.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

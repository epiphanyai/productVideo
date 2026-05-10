import { NextResponse } from "next/server";
import { generateStartingImageForShot } from "@/lib/agent-runtime/image";
import type { ProductPhoto, Shotlist } from "@/lib/workflow/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { shotlist, shotId, photos, miroImageUrls, imagePrompt, imageKind } = (await request.json()) as {
      shotlist?: Shotlist;
      shotId?: string;
      photos?: ProductPhoto[];
      miroImageUrls?: string[];
      imagePrompt?: string;
      imageKind?: "start" | "end";
    };

    if (!shotlist?.shots?.length) {
      return NextResponse.json({ error: "Shotlist is required." }, { status: 400 });
    }

    if (!shotId?.trim()) {
      return NextResponse.json({ error: "Shot ID is required." }, { status: 400 });
    }

    const result = await generateStartingImageForShot({
      shotlist,
      shotId,
      photos: photos ?? [],
      miroImageUrls: miroImageUrls ?? [],
      imagePrompt,
      imageKind
    });

    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate starting image.";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}

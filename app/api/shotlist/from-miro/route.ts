import { NextResponse } from "next/server";
import { createImageShotlistFromMiro } from "@/lib/agent-runtime/miro";
import type { ProductBrief, ProductPhoto } from "@/lib/workflow/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { boardUrl, brief, photos } = (await request.json()) as {
      boardUrl?: string;
      brief?: ProductBrief;
      photos?: ProductPhoto[];
    };

    if (!boardUrl?.trim()) {
      return NextResponse.json({ error: "Miro board URL is required." }, { status: 400 });
    }

    if (!brief?.description?.trim()) {
      return NextResponse.json({ error: "Product brief is required." }, { status: 400 });
    }

    return NextResponse.json({
      result: await createImageShotlistFromMiro({
        boardUrl,
        brief: {
          ...brief,
          photos: photos ?? brief.photos ?? []
        },
        photos: photos ?? brief.photos ?? []
      })
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create shotlist from Miro.";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}

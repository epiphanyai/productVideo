import { NextResponse } from "next/server";
import { configureFal, uploadBlobToFalStorage } from "@/lib/agent-runtime/fal-assets";
import type { ProductPhoto } from "@/lib/workflow/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const id = formData.get("id");
    const file = formData.get("file");

    if (typeof id !== "string" || !(file instanceof File) || !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "A product image file is required." }, { status: 400 });
    }

    configureFal();

    const photo: ProductPhoto = {
      id,
      name: file.name,
      url: await uploadBlobToFalStorage(file)
    };

    return NextResponse.json({ photo });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to upload product photo.";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}

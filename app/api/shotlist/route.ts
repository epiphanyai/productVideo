import { NextResponse } from "next/server";
import { createShotlist } from "@/lib/agent-runtime/shotlist";
import type { ProductBrief } from "@/lib/workflow/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const brief = (await request.json()) as ProductBrief;

    if (!brief.description?.trim()) {
      return NextResponse.json({ error: "Product description is required." }, { status: 400 });
    }

    return NextResponse.json({ shotlist: await createShotlist(brief) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create shotlist.";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}

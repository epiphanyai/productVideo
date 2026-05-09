import { NextResponse } from "next/server";
import { createShotlist } from "@/lib/agent-runtime/shotlist";
import type { ProductBrief } from "@/lib/workflow/types";

export async function POST(request: Request) {
  const brief = (await request.json()) as ProductBrief;

  if (!brief.description?.trim()) {
    return NextResponse.json({ error: "Product description is required." }, { status: 400 });
  }

  return NextResponse.json({ shotlist: createShotlist(brief) });
}

import { NextResponse } from "next/server";
import { getMiroOAuthStatus } from "@/lib/agent-runtime/miro-oauth";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ miroAuth: await getMiroOAuthStatus() });
}

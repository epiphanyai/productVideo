import { NextResponse } from "next/server";
import { clearMiroOAuthCredentials } from "@/lib/agent-runtime/miro-oauth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  await clearMiroOAuthCredentials();

  return NextResponse.redirect(new URL("/api/miro/auth/start", request.url));
}

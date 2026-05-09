import { auth } from "@modelcontextprotocol/sdk/client/auth.js";
import { NextResponse } from "next/server";
import { getExpectedMiroOAuthState, MiroOAuthProvider } from "@/lib/agent-runtime/miro-oauth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/?miro=error&message=${encodeURIComponent(error)}`, request.url));
  }

  if (!code) {
    return NextResponse.json({ error: "Miro OAuth callback did not include a code." }, { status: 400 });
  }

  const expectedState = await getExpectedMiroOAuthState();
  if (expectedState && state !== expectedState) {
    return NextResponse.json({ error: "Miro OAuth state did not match." }, { status: 400 });
  }

  const serverUrl = process.env.MIRO_MCP_URL?.trim() || "https://mcp.miro.com/";
  const redirectUrl = new URL("/api/miro/auth/callback", request.url).toString();
  const provider = new MiroOAuthProvider(redirectUrl);

  await auth(provider, {
    authorizationCode: code,
    serverUrl
  });

  return NextResponse.redirect(new URL("/?miro=connected", request.url));
}

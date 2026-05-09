import { auth } from "@modelcontextprotocol/sdk/client/auth.js";
import { NextResponse } from "next/server";
import { MiroOAuthProvider } from "@/lib/agent-runtime/miro-oauth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const serverUrl = process.env.MIRO_MCP_URL?.trim() || "https://mcp.miro.com/";
  const redirectUrl = new URL("/api/miro/auth/callback", request.url).toString();
  const provider = new MiroOAuthProvider(redirectUrl);

  const result = await auth(provider, {
    serverUrl
  });

  if (result === "REDIRECT" && provider.authorizationUrl) {
    return NextResponse.redirect(provider.authorizationUrl);
  }

  return NextResponse.redirect(new URL("/?miro=connected", request.url));
}

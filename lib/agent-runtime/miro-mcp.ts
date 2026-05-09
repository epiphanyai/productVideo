import { MCPServerStdio, MCPServerStreamableHttp, type MCPServer } from "@openai/agents";
import { MiroOAuthProvider } from "@/lib/agent-runtime/miro-oauth";

type MiroMcpConfig =
  | {
      transport: "http";
      url: string;
    }
  | {
      transport: "stdio";
      command: string;
      args: string[];
    };

export function getMiroMcpConfig(): MiroMcpConfig | null {
  const url = process.env.MIRO_MCP_URL?.trim();
  if (url) {
    return {
      transport: "http",
      url
    };
  }

  const command = process.env.MIRO_MCP_COMMAND?.trim();
  if (!command) {
    return null;
  }

  return {
    transport: "stdio",
    command,
    args: parseMcpArgs(process.env.MIRO_MCP_ARGS)
  };
}

export function createMiroMcpServer(
  config = getMiroMcpConfig(),
  options: { redirectUrl?: string } = {}
): MCPServer | null {
  if (!config) {
    return null;
  }

  if (config.transport === "http") {
    return new MCPServerStreamableHttp({
      authProvider: options.redirectUrl ? new MiroOAuthProvider(options.redirectUrl) : undefined,
      cacheToolsList: true,
      clientSessionTimeoutSeconds: getMiroMcpSessionTimeoutSeconds(),
      name: "miro",
      timeout: getMiroMcpRequestTimeoutMs(),
      url: config.url
    });
  }

  return new MCPServerStdio({
    args: config.args,
    cacheToolsList: true,
    clientSessionTimeoutSeconds: getMiroMcpSessionTimeoutSeconds(),
    command: config.command,
    name: "miro",
    timeout: getMiroMcpRequestTimeoutMs()
  });
}

export async function listMiroMcpToolNames(server: MCPServer): Promise<string[]> {
  await server.connect();
  const tools = await server.listTools();

  return tools.map((tool) => tool.name).sort();
}

function parseMcpArgs(value: string | undefined): string[] {
  if (!value?.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
      return parsed;
    }
  } catch {
    return value.split(" ").filter(Boolean);
  }

  return value.split(" ").filter(Boolean);
}

function getMiroMcpRequestTimeoutMs() {
  return parsePositiveInteger(process.env.MIRO_MCP_REQUEST_TIMEOUT_MS, 120_000);
}

function getMiroMcpSessionTimeoutSeconds() {
  return parsePositiveInteger(process.env.MIRO_MCP_SESSION_TIMEOUT_SECONDS, 120);
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

import { randomUUID } from "crypto";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import type {
  OAuthClientInformationMixed,
  OAuthClientMetadata,
  OAuthTokens
} from "@modelcontextprotocol/sdk/shared/auth.js";
import type {
  OAuthClientProvider,
  OAuthDiscoveryState
} from "@modelcontextprotocol/sdk/client/auth.js";

type MiroOAuthStore = {
  clientInformation?: OAuthClientInformationMixed;
  codeVerifier?: string;
  discoveryState?: OAuthDiscoveryState;
  state?: string;
  tokens?: OAuthTokens;
};

const MIRO_AUTH_STORE_PATH = path.join(process.cwd(), ".miro-mcp-auth.json");

export class MiroOAuthProvider implements OAuthClientProvider {
  authorizationUrl: URL | null = null;

  constructor(private readonly _redirectUrl: string) {}

  get redirectUrl() {
    return this._redirectUrl;
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      client_name: "kineticAI",
      grant_types: ["authorization_code", "refresh_token"],
      redirect_uris: [this._redirectUrl],
      response_types: ["code"],
      token_endpoint_auth_method: "none"
    };
  }

  async state() {
    const store = await readMiroOAuthStore();
    const state = randomUUID();
    await writeMiroOAuthStore({ ...store, state });

    return state;
  }

  async clientInformation() {
    return (await readMiroOAuthStore()).clientInformation;
  }

  async saveClientInformation(clientInformation: OAuthClientInformationMixed) {
    const store = await readMiroOAuthStore();
    await writeMiroOAuthStore({ ...store, clientInformation });
  }

  async tokens() {
    return (await readMiroOAuthStore()).tokens;
  }

  async saveTokens(tokens: OAuthTokens) {
    const store = await readMiroOAuthStore();
    await writeMiroOAuthStore({ ...store, tokens });
  }

  redirectToAuthorization(authorizationUrl: URL) {
    this.authorizationUrl = authorizationUrl;
  }

  async saveCodeVerifier(codeVerifier: string) {
    const store = await readMiroOAuthStore();
    await writeMiroOAuthStore({ ...store, codeVerifier });
  }

  async codeVerifier() {
    const codeVerifier = (await readMiroOAuthStore()).codeVerifier;
    if (!codeVerifier) {
      throw new Error("No Miro OAuth code verifier saved.");
    }

    return codeVerifier;
  }

  async saveDiscoveryState(discoveryState: OAuthDiscoveryState) {
    const store = await readMiroOAuthStore();
    await writeMiroOAuthStore({ ...store, discoveryState });
  }

  async discoveryState() {
    return (await readMiroOAuthStore()).discoveryState;
  }

  async invalidateCredentials(scope: "all" | "client" | "tokens" | "verifier" | "discovery") {
    if (scope === "all") {
      await writeMiroOAuthStore({});
      return;
    }

    const store = await readMiroOAuthStore();
    if (scope === "client") {
      delete store.clientInformation;
    }
    if (scope === "tokens") {
      delete store.tokens;
    }
    if (scope === "verifier") {
      delete store.codeVerifier;
      delete store.state;
    }
    if (scope === "discovery") {
      delete store.discoveryState;
    }

    await writeMiroOAuthStore(store);
  }
}

export async function getExpectedMiroOAuthState() {
  return (await readMiroOAuthStore()).state;
}

export async function getMiroOAuthStatus() {
  const store = await readMiroOAuthStore();

  return {
    connected: Boolean(store.tokens?.access_token),
    clientId: store.clientInformation?.client_id ?? null,
    scope: store.tokens?.scope ?? null
  };
}

export async function clearMiroOAuthCredentials() {
  await writeMiroOAuthStore({});
}

async function readMiroOAuthStore(): Promise<MiroOAuthStore> {
  try {
    return JSON.parse(await readFile(MIRO_AUTH_STORE_PATH, "utf8")) as MiroOAuthStore;
  } catch {
    return {};
  }
}

async function writeMiroOAuthStore(store: MiroOAuthStore) {
  await writeFile(MIRO_AUTH_STORE_PATH, JSON.stringify(store, null, 2));
}

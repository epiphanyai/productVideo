# KineticAI

AI-powered product video generator. Upload product photos, describe your concept, and KineticAI generates a complete shot-by-shot video draft — with optional music and a final high-resolution render.

## How it works

1. **Intake** — enter your product name, concept, style, and target audience
2. **Miro board** — an AI agent seeds a Miro board with your brief and generates a shot plan
3. **Shot images** — AI generates a start (and optional end) frame for each shot
4. **Video** — shots are rendered as video clips, merged, and scored with generated music
5. **Final render** — optionally upgrade to Seedance for higher-fidelity output

## Tech stack

- [Next.js](https://nextjs.org) 15 (App Router)
- [fal.ai](https://fal.ai) — image generation (Flux), video generation (WAN I2V, Seedance), music (MiniMax), and video merge/compose
- [OpenAI Agents SDK](https://github.com/openai/openai-agents-node) — orchestrates the shot planning agent
- [Miro](https://miro.com) — embedded shot board with OAuth integration
- Tailwind CSS v4

## Getting started

### Prerequisites

- Node.js 18+
- A [fal.ai](https://fal.ai) account and API key
- An [OpenAI](https://platform.openai.com) account and API key
- A [Miro](https://developers.miro.com) app (for board embedding and OAuth)

### Setup

```bash
git clone https://github.com/your-org/kineticai.git
cd kineticai
npm install
cp .env.example .env
```

Fill in `.env`:

```env
FAL_API_KEY=your_fal_api_key
OPENAI_API_KEY=your_openai_api_key

# Miro OAuth
MIRO_OAUTH_REDIRECT_URL=http://localhost:3000/api/miro/auth/callback
MIRO_MCP_URL=https://mcp.miro.com        # or use MIRO_MCP_COMMAND for stdio
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `FAL_API_KEY` | Yes | fal.ai API key |
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `MIRO_OAUTH_REDIRECT_URL` | Yes | OAuth callback URL for Miro |
| `MIRO_MCP_URL` | No | Miro MCP server URL (Streamable HTTP) |
| `MIRO_MCP_COMMAND` | No | Miro MCP server command (stdio alternative) |
| `MIRO_MCP_ARGS` | No | JSON array of args for stdio MCP command |
| `MIRO_MCP_REQUEST_TIMEOUT_MS` | No | MCP request timeout in ms (default 120000) |
| `MIRO_MCP_SESSION_TIMEOUT_SECONDS` | No | MCP session timeout in seconds (default 120) |
| `VIDEO_GENERATION_ENDPOINT` | No | Optional custom video generation endpoint |

## License

MIT — see [LICENSE](LICENSE).


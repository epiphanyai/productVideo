# Project Overview

This is a hackathon-friendly, open source product video generation app. Users describe a product, optionally add photos, choose a visual style, generate a shot list, refine it in Miro, and then create a video through fal.ai.

Keep the app simple. Prefer one clear Next.js codebase over separate frontend/backend packages unless there is a strong reason to split later.

## Architecture

- **App:** Next.js App Router in this repository root.
- **UI:** `app/` and `components/` contain the product intake, shot list, Miro routing, and video generation screens.
- **API routes:** `app/api/*` routes handle server-side actions for shot list creation, Miro routing, and video generation.
- **Agent runtime:** `lib/agent-runtime/` uses the OpenAI Agents SDK for AI orchestration and service boundaries.
- **Workflow types:** `lib/workflow/` contains shared workflow data structures and style helpers.
- **MCP integrations:** Miro should be reached through the Miro MCP server. Do not add direct Miro REST credentials or token-based auth to the app.
- **Asset staging:** Product photos are uploaded to temporary fal.ai storage through `app/api/assets` before they are used by the shot list or video workflow.

---

# Setup

```bash
npm install
npm run dev
```

Set required environment variables in `.env.local` as needed:

```bash
FAL_API_KEY=
OPENAI_API_KEY=

# Streamable HTTP Miro MCP server
# Example: https://mcp.miro.com
MIRO_MCP_URL=
MIRO_OAUTH_REDIRECT_URL=http://localhost:3000/api/miro/auth/callback
MIRO_MCP_REQUEST_TIMEOUT_MS=120000
MIRO_MCP_SESSION_TIMEOUT_SECONDS=120

# Or stdio Miro MCP server
# MIRO_MCP_COMMAND=
# MIRO_MCP_ARGS=["arg-one","arg-two"]
```

Miro authentication is handled through OAuth by the Miro MCP server. Do not add `MIRO_ACCESS_TOKEN`, `MIRO_BOARD_ID`, or similar Miro REST credentials to app env files. The app can connect to Miro MCP through either `MIRO_MCP_URL` for Streamable HTTP or `MIRO_MCP_COMMAND` / `MIRO_MCP_ARGS` for stdio.

Current OAuth storage is local-only: `lib/agent-runtime/miro-oauth.ts` writes one process-local credential file. This is acceptable for the current local deployment, but it is not safe for multi-user hosting. Before deploying for multiple users, replace it with a per-user or per-session credential store.

---

# User Flow

1. User describes their product in the app.
2. User optionally uploads product photos and selects a visual style.
3. Uploaded product photos are staged to fal.ai storage with a one-day lifecycle, and the app keeps the returned stable URLs.
4. The app generates a structured shot list from the description and inputs.
5. The shot list is pushed to Miro through MCP and displayed as a board.
6. User can edit shots directly in Miro and add visual references.
7. User starts video generation.
8. The current app sends the in-memory shot list and staged product-photo URLs to fal.ai. Miro readback is intentionally deferred until the workflow rework.
9. The generated video is returned and displayed in the app.

---

# Key Files

```text
app/
  page.tsx              # Main product video workflow UI
  api/
    assets/route.ts     # Temporary fal.ai asset upload endpoint
    shotlist/route.ts   # Shot list generation endpoint
    miro/route.ts       # Miro MCP routing endpoint
    video/route.ts      # Video generation endpoint

components/             # UI components
lib/
  agent-runtime/        # Shot list, Miro, and video runtime adapters
    fal-assets.ts       # Shared fal.ai credential and temporary storage helpers
    miro-mcp.ts         # Miro MCP server configuration
  workflow/             # Shared workflow types and style definitions
```

---

# Testing

```bash
npm run build
```

There is no dedicated test script yet. Until one exists, use `npm run build` as the baseline verification step.

When modifying integration logic:

- Test MCP calls with mock responses before live calls.
- Test Miro mutations against a dedicated test board, not a production board.
- Do not call expensive fal.ai models during tests.
- Use the smallest draft model/resolution for any live video generation smoke test.

---

# Conventions

- Keep the codebase easy to run for open source contributors.
- Use the OpenAI Agents SDK for agentic workflow steps: shot list generation, Miro MCP routing, Miro readback, and video orchestration.
- Keep integrations behind small adapter modules in `lib/agent-runtime/`.
- Do not scatter Miro or fal.ai calls throughout UI components.
- Shot list is the core workflow data structure. Treat it as the handoff format between the app, Miro, and video generation.
- If the shot list schema changes, update the generation logic, Miro rendering logic, and video adapter together.
- Uploaded photos should be staged to stable temporary URLs before being passed to shot list or video generation. Do not store base64 data URLs in workflow state or send them to `/api/video`.
- Mock external services by default when required env vars or MCP sessions are missing.
- Keep expensive or irreversible actions behind explicit user intent.
- Keep route handlers thin. Put reusable service logic in `lib/agent-runtime/` and keep UI components focused by workflow panel.
- Write descriptive commit messages in imperative mood. The subject should summarize the behavior change, and the body should explain why the change was made plus any important verification or risk notes.

---

# Video Generation Models

Use a two-tier strategy: draft first, final only on explicit user request.

## Draft

- **Model:** `fal-ai/wan-i2v`
- **Use for:** Quick previews after shot list review
- **Resolution:** 480p
- **When to call:** User clicks preview or otherwise asks for a draft

## Final

- **Model:** `fal-ai/kling-video/v3/pro/image-to-video`
- **Use for:** Final delivery video
- **Resolution:** Native 4K
- **When to call:** Only when the user explicitly requests final generation

## Example fal.ai Call Pattern

```javascript
import { fal } from "@fal-ai/client";

const draft = await fal.subscribe("fal-ai/wan-i2v", {
  input: {
    image_url: shot.reference_image_url,
    prompt: shot.description
  }
});

const final = await fal.subscribe("fal-ai/kling-video/v3/pro/image-to-video", {
  input: {
    image_url: shot.reference_image_url,
    prompt: shot.description,
    duration: shot.duration_seconds
  }
});
```

## Important Rules

- Never call Kling during tests.
- Always generate independent shots in parallel where possible.
- Store draft video URLs temporarily.
- Store final video URLs persistently only when persistence has been intentionally implemented.
- When reading fal.ai responses, only treat generic `url` fields as video URLs if they look like actual video assets.

---

# Out Of Scope

- Do not modify Miro board templates or global Miro account settings.
- Do not store user photos beyond the session unless explicitly implementing persistence.
- Do not add direct Miro REST auth while MCP is the selected integration path.

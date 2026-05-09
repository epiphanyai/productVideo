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
```

Miro authentication is handled through OAuth by the Miro MCP server. Do not add `MIRO_ACCESS_TOKEN`, `MIRO_BOARD_ID`, or similar Miro REST credentials to app env files.

---

# User Flow

1. User describes their product in the app.
2. User optionally uploads product photos and selects a visual style.
3. The app generates a structured shot list from the description and inputs.
4. The shot list is pushed to Miro through MCP and displayed as a board.
5. User edits shots directly in Miro and can add visual references.
6. User starts video generation.
7. The app reads the approved shot list from Miro, combines it with uploaded photos, and sends it to fal.ai.
8. The generated video is returned and displayed in the app.

---

# Key Files

```text
app/
  page.tsx              # Main product video workflow UI
  api/
    shotlist/route.ts   # Shot list generation endpoint
    miro/route.ts       # Miro MCP routing endpoint
    video/route.ts      # Video generation endpoint

components/             # UI components
lib/
  agent-runtime/        # Shot list, Miro, and video runtime adapters
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
- Uploaded photos should have stable URLs before being passed to fal.ai.
- Mock external services by default when required env vars or MCP sessions are missing.
- Keep expensive or irreversible actions behind explicit user intent.

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

---

# Out Of Scope

- Do not modify Miro board templates or global Miro account settings.
- Do not store user photos beyond the session unless explicitly implementing persistence.
- Do not add direct Miro REST auth while MCP is the selected integration path.

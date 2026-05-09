# Project Overview

A product video generation tool. Users describe their product (optionally uploading photos and choosing a visual style), which generates a shot list displayed and editable in a Miro board. Once the shot list is finalized, all shots and photos are used to generate a final video via fal.ai.

## Architecture

- **Frontend:** Next.js (user-facing UI — product description input, photo uploads, style selection, shot list review, generate trigger)
- **Backend:** Codex agent runtime (orchestration, shot list generation, MCP integration, video generation)
- **MCP Integrations:** Miro (shot list display and editing), fal.ai (video generation)

---

# Setup

```bash
# Install frontend dependencies
cd frontend
npm install
npm run dev

# Install backend dependencies
cd backend
npm install   # or pip install -r requirements.txt depending on runtime
```

Set required environment variables (see `.env.example`):
- `FAL_API_KEY`
- `OPENAI_API_KEY`

Note: Miro authentication is handled via OAuth through the Miro MCP server — no Miro credentials needed in env.

---

# User Flow

1. User lands on the frontend and describes their product in a text field
2. User optionally uploads product photos and selects a visual style
3. Backend generates a structured shot list from the description + inputs
4. Shot list is pushed to Miro via MCP and displayed as a board
5. User edits shots directly in Miro and can upload additional photos
6. User clicks "Generate" — backend reads final shot list from Miro + all uploaded photos and sends to fal.ai to produce the final video
7. Video is returned and displayed to the user

---

# Key Modules / File Structure

```
/frontend          # Next.js app
  /app             # App router pages
  /components      # UI components (upload, style picker, generate button)
  /lib             # API client, helpers

/backend           # Agent runtime
  /agents          # Core agent logic
  /mcp             # MCP integrations (Miro, fal.ai)
  /prompts         # Shot list generation prompts
  /utils           # File handling, image processing
```

---

# Testing

```bash
# Frontend
cd frontend && npm run test

# Backend
cd backend && npm run test   # or pytest
```

When writing or modifying backend logic:
- Always test MCP calls with mock responses before live calls
- fal.ai video gen calls are expensive — use the smallest test model/resolution when running tests
- Miro board mutations should be tested against a dedicated test board, not production boards

---

# Conventions

- Shot list is the core data structure — treat it as the source of truth between backend and Miro
- Shot list schema: each shot should have at minimum `id`, `description`, `style`, `duration_seconds`, and optionally `reference_image_url`
- All user-uploaded photos should be stored with stable URLs before being passed to fal.ai
- Keep MCP integration logic isolated in `/backend/mcp/` — do not scatter Miro or fal.ai calls throughout the codebase
- Frontend API calls go through `/frontend/lib/api.ts` only — no fetch calls in components

---

# Video Generation Models

Two-tier strategy — always use draft first, final only on explicit user request:

## Draft (preview tier)
- **Model:** `fal-ai/wan-i2v` (Wan 2.1 Image-to-Video)
- **Use for:** Generating quick previews after the shot list is finalized
- **Resolution:** 480p
- **Cost:** ~$0.20/generation
- **When to call:** When user clicks "Preview" or wants to check the shot list output before committing

## Final (delivery tier)
- **Model:** `fal-ai/kling-video/v3/pro/image-to-video` (Kling 3.0 Pro)
- **Use for:** Final video delivered to the user
- **Resolution:** Native 4K
- **Cost:** ~$0.10/sec
- **When to call:** Only when user explicitly clicks "Generate Final Video"

## Example fal.ai call pattern

```javascript
import { fal } from "@fal-ai/client";

// Draft preview
const draft = await fal.subscribe("fal-ai/wan-i2v", {
  input: {
    image_url: shot.reference_image_url,
    prompt: shot.description,
  }
});

// Final generation
const final = await fal.subscribe("fal-ai/kling-video/v3/pro/image-to-video", {
  input: {
    image_url: shot.reference_image_url,
    prompt: shot.description,
    duration: shot.duration_seconds,
  }
});
```

## Important rules
- NEVER call Kling 3.0 Pro during tests — use Wan 2.1 at 480p only
- Always generate shots in parallel where possible (fal.ai supports concurrent requests)
- Store draft video URLs temporarily; store final video URLs persistently

---

# Out of Scope

- Do NOT modify Miro board templates or global Miro account settings
- Do NOT call fal.ai video generation endpoints during unit tests
- Do NOT store user photos beyond the session unless explicitly asked to implement persistence
- Do NOT change the shot list schema without updating both the backend prompt and the Miro rendering logic

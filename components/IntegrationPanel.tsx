"use client";

import { ExternalLink, Film, Loader2, PanelsTopLeft } from "lucide-react";
import type { MiroBoardResult, Shotlist, VideoJobResult } from "@/lib/workflow/types";

type IntegrationPanelProps = {
  miroResult: MiroBoardResult | null;
  videoResult: VideoJobResult | null;
  shotlist: Shotlist | null;
  isMiroConnected: boolean;
  isRoutingToMiro: boolean;
  isCreatingVideo: boolean;
  miroBoardUrl: string;
  miroError: string | null;
  videoError: string | null;
  onMiroBoardUrlChange: (value: string) => void;
  onRouteToMiro: () => void;
  onCreateVideo: () => void;
};

export function IntegrationPanel({
  miroResult,
  videoResult,
  shotlist,
  isMiroConnected,
  isRoutingToMiro,
  isCreatingVideo,
  miroBoardUrl,
  miroError,
  videoError,
  onMiroBoardUrlChange,
  onRouteToMiro,
  onCreateVideo
}: IntegrationPanelProps) {
  const miroEmbedUrl = miroResult?.boardUrl ? getMiroEmbedUrl(miroResult.boardUrl) : null;

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-stone-300 bg-white p-5 shadow-[0_18px_60px_rgba(29,37,40,0.12)]">
        <h3 className="flex items-center gap-2 text-base font-bold">
          <PanelsTopLeft size={18} />
          Miro Shotlist Board
        </h3>
        <p className="mt-2 text-sm leading-6 text-[#647174]">
          Route the structured shotlist to the Miro MCP layer so collaborators can refine shots and add more visual references.
        </p>
        <label className="mt-4 block text-sm font-bold text-[#1d2528]" htmlFor="miro-board-url">
          Existing Miro board URL
        </label>
        <input
          className="mt-2 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-[#1d2528] outline-none transition focus:border-[#2f6f63] focus:ring-2 focus:ring-[#2f6f63]/15"
          id="miro-board-url"
          onChange={(event) => onMiroBoardUrlChange(event.target.value)}
          placeholder="Optional: https://miro.com/app/board/..."
          type="url"
          value={miroBoardUrl}
        />
        <button
          className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#eef4ef] px-4 font-bold text-[#1d2528] disabled:cursor-not-allowed disabled:opacity-55"
          disabled={!shotlist || isRoutingToMiro}
          onClick={onRouteToMiro}
          type="button"
        >
          {isRoutingToMiro ? <Loader2 className="animate-spin" size={18} /> : <ExternalLink size={18} />}
          {miroBoardUrl.trim() ? "Send to Miro Board" : "Create Miro Board"}
        </button>
        <a
          className="ml-3 mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-stone-300 px-4 font-bold text-[#1d2528]"
          href={isMiroConnected ? "/api/miro/auth/reconnect" : "/api/miro/auth/start"}
        >
          <ExternalLink size={18} />
          {isMiroConnected ? "Reconnect Miro" : "Connect Miro"}
        </a>
        {miroError ? (
          <div className="mt-4 rounded-lg border border-[#c96b6b] bg-[#fff6f3] p-3 text-sm leading-6 text-[#8a2e2e]">
            {miroError}
          </div>
        ) : null}
        {miroResult ? (
          <div className="mt-4 rounded-lg bg-[#172225] p-4 text-sm leading-6 text-[#edf6f0]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <strong>{miroResult.status === "created" ? "Miro board ready" : "Mock board ready"}</strong>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs">{miroResult.provider}</span>
            </div>
            <p className="mt-2 text-[#c9d8d1]">{miroResult.message}</p>
            <div className="mt-3 grid gap-1 text-xs text-[#c9d8d1]">
              <span>Board: {miroResult.boardId}</span>
              <span>Items: {miroResult.itemCount}</span>
              {miroResult.tools?.length ? <span>MCP tools: {miroResult.tools.length}</span> : null}
            </div>
            {miroResult.boardUrl ? (
              <a
                className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-3 font-bold text-[#172225]"
                href={miroResult.boardUrl}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink size={16} />
                Open Board
              </a>
            ) : null}
            {miroEmbedUrl ? (
              <div className="mt-4 overflow-hidden rounded-lg border border-white/10 bg-white">
                <iframe
                  allow="fullscreen; clipboard-read; clipboard-write"
                  className="h-[420px] w-full"
                  src={miroEmbedUrl}
                  title="Miro shotlist board"
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border border-stone-300 bg-white p-5 shadow-[0_18px_60px_rgba(29,37,40,0.12)]">
        <h3 className="flex items-center gap-2 text-base font-bold">
          <Film size={18} />
          Video Creation Job
        </h3>
        <p className="mt-2 text-sm leading-6 text-[#647174]">
          After Miro review, send the approved shotlist and uploaded photos into the video generation adapter.
        </p>
        <button
          className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#2f6f63] px-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-55"
          disabled={!shotlist || isCreatingVideo}
          onClick={onCreateVideo}
          type="button"
        >
          {isCreatingVideo ? <Loader2 className="animate-spin" size={18} /> : <Film size={18} />}
          Create Video
        </button>
        {videoError ? (
          <div className="mt-4 rounded-lg border border-[#c96b6b] bg-[#fff6f3] p-3 text-sm leading-6 text-[#8a2e2e]">
            {videoError}
          </div>
        ) : null}
        {videoResult ? (
          <pre className="mt-4 overflow-auto rounded-lg bg-[#172225] p-3 text-xs leading-5 text-[#edf6f0]">
            {JSON.stringify(videoResult, null, 2)}
          </pre>
        ) : null}
      </div>
    </section>
  );
}

function getMiroEmbedUrl(boardUrl: string) {
  const boardId = boardUrl.match(/\/board\/([^/?#]+)/)?.[1];

  return boardId ? `https://miro.com/app/live-embed/${boardId}/` : null;
}

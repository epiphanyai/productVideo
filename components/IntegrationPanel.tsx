"use client";

import { ExternalLink, Film, Loader2, PanelsTopLeft } from "lucide-react";
import type { MiroBoardResult, Shotlist, VideoJobResult } from "@/lib/workflow/types";

type IntegrationPanelProps = {
  miroResult: MiroBoardResult | null;
  videoResult: VideoJobResult | null;
  shotlist: Shotlist | null;
  isRoutingToMiro: boolean;
  isCreatingVideo: boolean;
  miroError: string | null;
  videoError: string | null;
  onRouteToMiro: () => void;
  onCreateVideo: () => void;
};

export function IntegrationPanel({
  miroResult,
  videoResult,
  shotlist,
  isRoutingToMiro,
  isCreatingVideo,
  miroError,
  videoError,
  onRouteToMiro,
  onCreateVideo
}: IntegrationPanelProps) {
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
        <button
          className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#eef4ef] px-4 font-bold text-[#1d2528] disabled:cursor-not-allowed disabled:opacity-55"
          disabled={!shotlist || isRoutingToMiro}
          onClick={onRouteToMiro}
          type="button"
        >
          {isRoutingToMiro ? <Loader2 className="animate-spin" size={18} /> : <ExternalLink size={18} />}
          Create Miro Board
        </button>
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
            </div>
            <a
              className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-3 font-bold text-[#172225]"
              href={miroResult.boardUrl}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink size={16} />
              Open Board
            </a>
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

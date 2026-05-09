"use client";

import { ExternalLink, Film, Loader2, PanelsTopLeft } from "lucide-react";
import type { MiroBoardResult, Shotlist, VideoJobResult } from "@/lib/workflow/types";

type IntegrationPanelProps = {
  miroResult: MiroBoardResult | null;
  videoResult: VideoJobResult | null;
  shotlist: Shotlist | null;
  isRoutingToMiro: boolean;
  isCreatingVideo: boolean;
  onRouteToMiro: () => void;
  onCreateVideo: () => void;
};

export function IntegrationPanel({
  miroResult,
  videoResult,
  shotlist,
  isRoutingToMiro,
  isCreatingVideo,
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
        {miroResult ? (
          <pre className="mt-4 overflow-auto rounded-lg bg-[#172225] p-3 text-xs leading-5 text-[#edf6f0]">
            {JSON.stringify(miroResult, null, 2)}
          </pre>
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
        {videoResult ? (
          <pre className="mt-4 overflow-auto rounded-lg bg-[#172225] p-3 text-xs leading-5 text-[#edf6f0]">
            {JSON.stringify(videoResult, null, 2)}
          </pre>
        ) : null}
      </div>
    </section>
  );
}

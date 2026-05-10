"use client";

import { ExternalLink, Film } from "lucide-react";
import type { VideoJobResult } from "@/lib/workflow/types";

type VideoPanelProps = {
  result: VideoJobResult | null;
  isCreating: boolean;
  error: string | null;
  targetDurationSeconds: number;
};

export function VideoPanel({ result, isCreating, error, targetDurationSeconds }: VideoPanelProps) {
  if (!result && !isCreating && !error) {
    return (
      <div className="grid min-h-[360px] place-items-center rounded-lg border border-stone-300 bg-white p-8 text-center shadow-[0_18px_60px_rgba(29,37,40,0.12)]">
        <div>
          <Film className="mx-auto mb-3 text-[#2f6f63]" size={34} />
          <h2 className="text-lg font-bold">Video will appear here</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-[#647174]">
            Create it from the finalized image shotlist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-stone-300 bg-white p-5 shadow-[0_18px_60px_rgba(29,37,40,0.12)]">
      {isCreating ? <VideoProgress targetDurationSeconds={targetDurationSeconds} /> : null}
      {error ? (
        <div className="mt-4 rounded-lg border border-[#c96b6b] bg-[#fff6f3] p-3 text-sm leading-6 text-[#8a2e2e]">
          {error}
        </div>
      ) : null}
      {result ? <VideoResult result={result} /> : null}
    </div>
  );
}

function VideoProgress({ targetDurationSeconds }: { targetDurationSeconds: number }) {
  return (
    <div className="mt-4 rounded-lg border border-[#cdd8d2] bg-[#eef4ef] p-4">
      <div className="flex items-center justify-between gap-3 text-sm font-bold text-[#1d2528]">
        <span>Generating video and music</span>
        <span className="text-xs text-[#647174]">{targetDurationSeconds}s target</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
        <div className="h-full w-1/2 animate-[video-progress_1.4s_ease-in-out_infinite] rounded-full bg-[#2f6f63]" />
      </div>
      <div className="mt-4 aspect-video animate-pulse rounded-lg bg-white/70" />
    </div>
  );
}

function VideoResult({ result }: { result: VideoJobResult }) {
  return (
    <div className="mt-4 rounded-lg bg-[#172225] p-4 text-sm leading-6 text-[#edf6f0]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <strong>{result.status === "created" ? "Video ready" : "Video job"}</strong>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs">{result.status}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#c9d8d1]">
        {result.targetDurationSeconds ? (
          <span className="rounded-full bg-white/10 px-3 py-1">{result.targetDurationSeconds}s target</span>
        ) : null}
        {result.musicUrl ? <span className="rounded-full bg-white/10 px-3 py-1">Music generated</span> : null}
      </div>
      {result.message && !result.musicUrl ? <p className="mt-3 text-xs leading-5 text-[#f0cfcf]">{result.message}</p> : null}
      {result.previewUrl ? (
        <>
          <video
            className="mt-4 aspect-video w-full rounded-lg bg-black"
            controls
            playsInline
            preload="metadata"
            src={result.previewUrl}
          />
          <a
            className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-3 font-bold text-[#172225]"
            href={result.previewUrl}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLink size={16} />
            Open Video
          </a>
        </>
      ) : (
        <p className="mt-3 text-[#c9d8d1]">No preview URL was returned yet.</p>
      )}
      <div className="mt-3 grid gap-1 text-xs text-[#c9d8d1]">
        <span>Job: {result.jobId}</span>
      </div>
    </div>
  );
}

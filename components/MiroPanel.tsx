"use client";

import { ExternalLink, Loader2, PanelsTopLeft } from "lucide-react";
import type { MiroBoardResult, Shotlist } from "@/lib/workflow/types";

type MiroPanelProps = {
  result: MiroBoardResult | null;
  shotlist: Shotlist | null;
  isConnected: boolean;
  isRouting: boolean;
  miroBoardUrl: string;
  error: string | null;
  onMiroBoardUrlChange: (value: string) => void;
  onRouteToMiro: () => void;
};

export function MiroPanel({
  result,
  shotlist,
  isConnected,
  isRouting,
  miroBoardUrl,
  error,
  onMiroBoardUrlChange,
  onRouteToMiro
}: MiroPanelProps) {
  const embedUrl = result?.boardUrl ? getMiroEmbedUrl(result.boardUrl) : null;

  return (
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
        disabled={!shotlist || isRouting}
        onClick={onRouteToMiro}
        type="button"
      >
        {isRouting ? <Loader2 className="animate-spin" size={18} /> : <ExternalLink size={18} />}
        {miroBoardUrl.trim() ? "Send to Miro Board" : "Create Miro Board"}
      </button>
      <a
        className="ml-3 mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-stone-300 px-4 font-bold text-[#1d2528]"
        href={isConnected ? "/api/miro/auth/reconnect" : "/api/miro/auth/start"}
      >
        <ExternalLink size={18} />
        {isConnected ? "Reconnect Miro" : "Connect Miro"}
      </a>
      {error ? (
        <div className="mt-4 rounded-lg border border-[#c96b6b] bg-[#fff6f3] p-3 text-sm leading-6 text-[#8a2e2e]">
          {error}
        </div>
      ) : null}
      {result ? <MiroResult result={result} embedUrl={embedUrl} /> : null}
    </div>
  );
}

function MiroResult({ result, embedUrl }: { result: MiroBoardResult; embedUrl: string | null }) {
  return (
    <div className="mt-4 rounded-lg bg-[#172225] p-4 text-sm leading-6 text-[#edf6f0]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <strong>{result.status === "created" ? "Miro board ready" : "Mock board ready"}</strong>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs">{result.provider}</span>
      </div>
      <p className="mt-2 text-[#c9d8d1]">{result.message}</p>
      <div className="mt-3 grid gap-1 text-xs text-[#c9d8d1]">
        <span>Board: {result.boardId}</span>
        <span>Items: {result.itemCount}</span>
        {result.tools?.length ? <span>MCP tools: {result.tools.length}</span> : null}
      </div>
      {result.boardUrl ? (
        <a
          className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-3 font-bold text-[#172225]"
          href={result.boardUrl}
          rel="noreferrer"
          target="_blank"
        >
          <ExternalLink size={16} />
          Open Board
        </a>
      ) : null}
      {embedUrl ? (
        <div className="mt-4 overflow-hidden rounded-lg border border-white/10 bg-white">
          <iframe
            allow="fullscreen; clipboard-read; clipboard-write"
            className="h-[420px] w-full"
            src={embedUrl}
            title="Miro shotlist board"
          />
        </div>
      ) : null}
    </div>
  );
}

function getMiroEmbedUrl(boardUrl: string) {
  const boardId = boardUrl.match(/\/board\/([^/?#]+)/)?.[1];

  return boardId ? `https://miro.com/app/live-embed/${boardId}/` : null;
}

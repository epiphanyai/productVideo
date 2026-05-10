"use client";

import { ExternalLink, Loader2, PanelsTopLeft, RefreshCw } from "lucide-react";
import type { MiroBoardResult } from "@/lib/workflow/types";

type MiroPanelProps = {
    result: MiroBoardResult | null;
    isConnected: boolean;
    isCreatingBoard: boolean;
    isCreatingShotlist: boolean;
    miroBoardUrl: string;
    showExistingBoardInput: boolean;
    error: string | null;
    shotlistError: string | null;
    onConnectMiro: (reconnect?: boolean) => void;
    onMiroBoardUrlChange: (value: string) => void;
    onUseExistingBoard: () => void;
    onCreateShotlist: () => void;
};

export function MiroPanel({
    result,
    isConnected,
    isCreatingBoard,
    isCreatingShotlist,
    miroBoardUrl,
    showExistingBoardInput,
    error,
    shotlistError,
    onConnectMiro,
    onMiroBoardUrlChange,
    onUseExistingBoard,
    onCreateShotlist
}: MiroPanelProps) {
    const embedUrl = result?.boardUrl ? getMiroEmbedUrl(result.boardUrl) : null;

    return (
        <div className="rounded-lg border border-stone-300 bg-white shadow-[0_18px_60px_rgba(29,37,40,0.12)]">
            <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-0">
                <div>
                    {result?.boardUrl ? (
                        <a
                            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 font-bold text-[#172225]"
                            href={result.boardUrl}
                            rel="noreferrer"
                            target="_blank"
                        >
                            <ExternalLink size={16} />
                            Open Board
                        </a>
                    ) : null}
                </div>
                <button
                    className="group inline-flex min-h-10 items-center gap-2 rounded-full bg-[#eef4ef] px-3 text-sm font-bold text-[#1d2528] transition hover:bg-[#dfece4]"
                    onClick={() => onConnectMiro(isConnected)}
                    type="button"
                >
                    <span className={`size-2 rounded-full ${isConnected ? "bg-[#2f8f64]" : "bg-[#9aa3a0]"}`} />
                    <span className="group-hover:hidden">{isConnected ? "Miro connected" : "Miro disconnected"}</span>
                    <span className="hidden group-hover:inline">{isConnected ? "Reconnect" : "Connect to Miro"}</span>
                    {isConnected ? (
                        <RefreshCw className="hidden group-hover:block" size={14} />
                    ) : (
                        <ExternalLink className="hidden group-hover:block" size={14} />
                    )}
                </button>
            </div>
            {showExistingBoardInput ? (
                <div className="mx-5 mt-4 rounded-lg border border-[#d9bb68] bg-[#fff9e8] p-4">
                    <label className="block text-sm font-bold text-[#1d2528]" htmlFor="miro-board-url">
                        Existing Miro board URL
                    </label>
                    <div className="mt-2 flex flex-col gap-2 md:flex-row">
                        <input
                            className="min-h-11 flex-1 rounded-lg border border-stone-300 bg-white px-3 text-sm text-[#1d2528] outline-none transition focus:border-[#2f6f63] focus:ring-2 focus:ring-[#2f6f63]/15"
                            id="miro-board-url"
                            onChange={(event) => onMiroBoardUrlChange(event.target.value)}
                            placeholder="https://miro.com/app/board/..."
                            type="url"
                            value={miroBoardUrl}
                        />
                        <button
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#2f6f63] px-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-55"
                            disabled={!miroBoardUrl.trim() || isCreatingBoard}
                            onClick={onUseExistingBoard}
                            type="button"
                        >
                            Use Existing Board
                        </button>
                    </div>
                </div>
            ) : null}
            {error ? (
                <div className="m-5 rounded-lg border border-[#c96b6b] bg-[#fff6f3] p-3 text-sm leading-6 text-[#8a2e2e]">
                    {error}
                </div>
            ) : null}
            {shotlistError ? (
                <div className="m-5 rounded-lg border border-[#c96b6b] bg-[#fff6f3] p-3 text-sm leading-6 text-[#8a2e2e]">
                    {shotlistError}
                </div>
            ) : null}
            {isCreatingBoard ? <MiroBoardPlaceholder /> : null}
            {result && !isCreatingBoard ? <MiroResult result={result} embedUrl={embedUrl} /> : null}
            {!result && !isCreatingBoard ? <MiroEmptyState /> : null}
            <div className="flex justify-end border-t border-stone-300 p-5">
                <button
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#2f6f63] px-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-55 md:w-56"
                    disabled={!result?.boardUrl || isCreatingBoard || isCreatingShotlist}
                    onClick={onCreateShotlist}
                    type="button"
                >
                    {isCreatingShotlist ? <Loader2 className="animate-spin" size={18} /> : <PanelsTopLeft size={18} />}
                    Create Shotlist
                </button>
            </div>
        </div>
    );
}

function MiroResult({ result, embedUrl }: { result: MiroBoardResult; embedUrl: string | null }) {
    return (
        <div className="p-5 text-sm leading-6 text-[#1d2528]">
            {embedUrl ? (
                <div className="overflow-hidden rounded-lg border border-stone-300 bg-white">
                    <iframe
                        allow="fullscreen; clipboard-read; clipboard-write"
                        className="h-[68vh] min-h-[520px] w-full"
                        src={embedUrl}
                        title="Miro shotlist board"
                    />
                </div>
            ) : null}
        </div>
    );
}

function MiroBoardPlaceholder() {
    return (
        <div className="p-5">
            <div className="overflow-hidden rounded-lg border border-stone-300 bg-white">
                <div className="h-[68vh] min-h-[520px] animate-pulse bg-[#eef4ef]">
                    <div className="grid h-full place-items-center">
                        <div className="text-center text-sm font-bold text-[#647174]">
                            <Loader2 className="mx-auto mb-3 animate-spin text-[#2f6f63]" size={26} />
                            Creating Miro board
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MiroEmptyState() {
    return (
        <div className="grid min-h-[360px] place-items-center p-8 text-center">
            <div>
                <PanelsTopLeft className="mx-auto mb-3 text-[#2f6f63]" size={34} />
                <h2 className="text-lg font-bold">Miro board will appear here</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-[#647174]">
                    Create a board from product intake, or use an existing Miro board when board creation is unavailable.
                </p>
            </div>
        </div>
    );
}

function getMiroEmbedUrl(boardUrl: string) {
    const boardId = boardUrl.match(/\/board\/([^/?#]+)/)?.[1];

    return boardId ? `https://miro.com/app/live-embed/${boardId}/` : null;
}

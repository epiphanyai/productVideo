"use client";

import { ChevronLeft, ChevronRight, Clapperboard, Film, ImageIcon, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getVideoStyleLabel } from "@/lib/workflow/styles";
import type { Shotlist } from "@/lib/workflow/types";

const shotsPerPage = 4;

type ShotlistWorkspaceProps = {
  shotlist: Shotlist | null;
  isLoading: boolean;
  isGeneratingImages: boolean;
  isCreatingVideo: boolean;
  error: string | null;
  onCreateVideo: () => void;
};

export function ShotlistWorkspace({
  shotlist,
  isLoading,
  isGeneratingImages,
  isCreatingVideo,
  error,
  onCreateVideo
}: ShotlistWorkspaceProps) {
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setPageIndex(0);
  }, [shotlist?.id]);

  if (isLoading) {
    return <ShotlistPlaceholder />;
  }

  if (!shotlist) {
    return (
      <section className="grid min-h-[360px] place-items-center rounded-lg border border-stone-300 bg-white p-8 text-center shadow-[0_18px_60px_rgba(29,37,40,0.12)]">
        <div>
          <Clapperboard className="mx-auto mb-3 text-[#2f6f63]" size={34} />
          <h2 className="text-lg font-bold">Image shotlist will appear here</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-[#647174]">
            Create it from the current Miro board after collaborators finish editing shots and references.
          </p>
          {error ? (
            <div className="mt-4 rounded-lg border border-[#c96b6b] bg-[#fff6f3] p-3 text-sm leading-6 text-[#8a2e2e]">
              {error}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  const pageCount = Math.max(1, Math.ceil(shotlist.shots.length / shotsPerPage));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const visibleShots = shotlist.shots.slice(
    safePageIndex * shotsPerPage,
    safePageIndex * shotsPerPage + shotsPerPage
  );

  return (
    <section className="rounded-lg border border-stone-300 bg-white shadow-[0_18px_60px_rgba(29,37,40,0.12)]">
      <div className="border-b border-stone-300 p-5">
        <div className="flex flex-wrap gap-2 text-xs font-bold text-[#647174]">
          <span className="rounded-full bg-[#eef4ef] px-3 py-1">{getVideoStyleLabel(shotlist.style)}</span>
          <span className="rounded-full bg-[#eef4ef] px-3 py-1">{shotlist.productName}</span>
          <span className="rounded-full bg-[#eef4ef] px-3 py-1">{shotlist.targetDurationSeconds}s target</span>
          <span className="rounded-full bg-[#eef4ef] px-3 py-1">{shotlist.shots.length} shots</span>
          <span className="rounded-full bg-[#eef4ef] px-3 py-1">
            {shotlist.visualFeatureCount} visual features
          </span>
        </div>
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
        {visibleShots.map((shot, pageShotIndex) => {
          const index = safePageIndex * shotsPerPage + pageShotIndex;

          return (
            <article className="overflow-hidden rounded-lg border border-stone-300 bg-[#f8faf8]" key={shot.id}>
              {shot.startImageUrl ? (
                <img
                  alt={`${shot.title} starting frame`}
                  className="aspect-video w-full bg-[#dce5df] object-cover"
                  src={shot.startImageUrl}
                />
              ) : (
                <div className="grid aspect-video place-items-center bg-[#dce5df] text-[#647174]">
                  {shot.imageStatus === "running" ? (
                    <div className="text-center text-xs font-bold">
                      <Loader2 className="mx-auto mb-2 animate-spin text-[#2f6f63]" size={24} />
                      Generating image
                    </div>
                  ) : shot.imageStatus === "error" ? (
                    <div className="px-4 text-center text-xs font-bold text-[#8a2e2e]">Image failed</div>
                  ) : (
                    <ImageIcon size={28} />
                  )}
                </div>
              )}
              <div className="p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <h3 className="text-base font-bold">
                    {index + 1}. {shot.title}
                  </h3>
                  <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-[#647174]">
                    {shot.durationSeconds}s
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#647174]">
                  <span className="rounded-full bg-white px-3 py-1">{shot.framing}</span>
                  <span className="rounded-full bg-white px-3 py-1">{shot.motion}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#425054]">{shot.prompt}</p>
                {shot.sourceImageUrls?.length ? (
                  <div className="mt-3 text-xs text-[#647174]">References: {shot.sourceImageUrls.length}</div>
                ) : null}
                {shot.imageError ? (
                  <div className="mt-3 rounded-lg border border-[#c96b6b] bg-[#fff6f3] p-2 text-xs leading-5 text-[#8a2e2e]">
                    {shot.imageError}
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {pageCount > 1 ? (
        <div className="flex flex-col gap-3 border-t border-stone-300 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-bold text-[#647174]">
            Showing {safePageIndex * shotsPerPage + 1}-
            {Math.min((safePageIndex + 1) * shotsPerPage, shotlist.shots.length)} of {shotlist.shots.length}
          </div>
          <div className="flex gap-2">
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-300 px-3 text-sm font-bold text-[#1d2528] disabled:cursor-not-allowed disabled:opacity-45"
              disabled={safePageIndex === 0}
              onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
              type="button"
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-300 px-3 text-sm font-bold text-[#1d2528] disabled:cursor-not-allowed disabled:opacity-45"
              disabled={safePageIndex >= pageCount - 1}
              onClick={() => setPageIndex((current) => Math.min(pageCount - 1, current + 1))}
              type="button"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex justify-end border-t border-stone-300 p-5">
        <button
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#2f6f63] px-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-55 md:w-56"
          disabled={isCreatingVideo || isGeneratingImages}
          onClick={onCreateVideo}
          type="button"
        >
          {isCreatingVideo ? <Loader2 className="animate-spin" size={18} /> : <Film size={18} />}
          Create Video
        </button>
      </div>
    </section>
  );
}

function ShotlistPlaceholder() {
  return (
    <section className="rounded-lg border border-stone-300 bg-white shadow-[0_18px_60px_rgba(29,37,40,0.12)]">
      <div className="border-b border-stone-300 p-5">
        <div className="h-3 w-24 animate-pulse rounded-full bg-[#dce5df]" />
        <div className="mt-3 h-6 w-56 animate-pulse rounded-full bg-[#dce5df]" />
        <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded-full bg-[#eef4ef]" />
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="overflow-hidden rounded-lg border border-stone-300 bg-[#f8faf8]" key={index}>
            <div className="aspect-video animate-pulse bg-[#dce5df]" />
            <div className="grid gap-3 p-4">
              <div className="h-5 w-2/3 animate-pulse rounded-full bg-[#dce5df]" />
              <div className="h-4 w-full animate-pulse rounded-full bg-[#eef4ef]" />
              <div className="h-4 w-4/5 animate-pulse rounded-full bg-[#eef4ef]" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

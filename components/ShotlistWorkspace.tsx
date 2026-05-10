"use client";

import {
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Download,
  Film,
  ImageIcon,
  Loader2,
  RefreshCw
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getVideoStyleLabel } from "@/lib/workflow/styles";
import type { Shot, Shotlist } from "@/lib/workflow/types";

const thumbnailsPerPage = 6;

type ShotlistWorkspaceProps = {
  shotlist: Shotlist | null;
  isLoading: boolean;
  isGeneratingImages: boolean;
  isCreatingVideo: boolean;
  error: string | null;
  onCreateVideo: () => void;
  onRegenerateShotImage: (shotId: string, imagePrompt: string) => void;
  onUpdateShotVideoPrompt: (shotId: string, videoPrompt: string) => void;
};

export function ShotlistWorkspace({
  shotlist,
  isLoading,
  isGeneratingImages,
  isCreatingVideo,
  error,
  onCreateVideo,
  onRegenerateShotImage,
  onUpdateShotVideoPrompt
}: ShotlistWorkspaceProps) {
  const [selectedShotIndex, setSelectedShotIndex] = useState(0);
  const [thumbnailPageIndex, setThumbnailPageIndex] = useState(0);
  const [promptTab, setPromptTab] = useState<"image" | "video">("image");
  const selectedShot = shotlist?.shots[selectedShotIndex] ?? null;
  const [imagePromptDraft, setImagePromptDraft] = useState("");
  const [videoPromptDraft, setVideoPromptDraft] = useState("");

  useEffect(() => {
    setSelectedShotIndex(0);
    setThumbnailPageIndex(0);
  }, [shotlist?.id]);

  useEffect(() => {
    setImagePromptDraft(selectedShot?.imagePrompt || selectedShot?.prompt || "");
    setVideoPromptDraft(selectedShot?.videoPrompt || selectedShot?.prompt || "");
  }, [selectedShot?.id, selectedShot?.imagePrompt, selectedShot?.prompt]);

  const thumbnailPageCount = Math.max(1, Math.ceil((shotlist?.shots.length ?? 0) / thumbnailsPerPage));
  const safeThumbnailPageIndex = Math.min(thumbnailPageIndex, thumbnailPageCount - 1);
  const visibleThumbnails = useMemo(
    () =>
      shotlist?.shots.slice(
        safeThumbnailPageIndex * thumbnailsPerPage,
        safeThumbnailPageIndex * thumbnailsPerPage + thumbnailsPerPage
      ) ?? [],
    [safeThumbnailPageIndex, shotlist?.shots]
  );

  if (isLoading) {
    return <ShotlistPlaceholder />;
  }

  if (!shotlist || !selectedShot) {
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

  function selectShot(index: number) {
    setSelectedShotIndex(index);
    setThumbnailPageIndex(Math.floor(index / thumbnailsPerPage));
  }

  const imageIsRunning = selectedShot.imageStatus === "running";
  const imagePromptChanged =
    imagePromptDraft.trim() && imagePromptDraft.trim() !== (selectedShot.imagePrompt || selectedShot.prompt);
  const videoPromptChanged =
    videoPromptDraft.trim() && videoPromptDraft.trim() !== (selectedShot.videoPrompt || selectedShot.prompt);
  const needsReferenceImage = Boolean(selectedShot.startImageUrl || selectedShot.sourceImageUrls?.length);

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

      <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <div className="overflow-hidden rounded-lg border border-stone-300 bg-[#f8faf8]">
          {selectedShot.startImageUrl ? (
            <img
              alt={`${selectedShot.title} starting frame`}
              className="aspect-video w-full bg-[#dce5df] object-cover"
              src={selectedShot.startImageUrl}
            />
          ) : (
            <div className="grid aspect-video place-items-center bg-[#dce5df] text-[#647174]">
              {imageIsRunning ? (
                <div className="text-center text-sm font-bold">
                  <Loader2 className="mx-auto mb-2 animate-spin text-[#2f6f63]" size={28} />
                  Generating image
                </div>
              ) : selectedShot.imageStatus === "error" ? (
                <div className="px-4 text-center text-sm font-bold text-[#8a2e2e]">Image failed</div>
              ) : (
                <ImageIcon size={34} />
              )}
            </div>
          )}
        </div>

        <div className="grid content-start gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase text-[#647174]">Shot {selectedShotIndex + 1}</div>
              <h3 className="mt-1 text-2xl font-black text-[#1d2528]">{selectedShot.title}</h3>
            </div>
            <span className="rounded-full bg-[#eef4ef] px-3 py-1 text-xs font-bold text-[#647174]">
              {selectedShot.durationSeconds}s
            </span>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-bold text-[#647174]">
            <span className="rounded-full bg-[#eef4ef] px-3 py-1">{selectedShot.framing}</span>
            <span className="rounded-full bg-[#eef4ef] px-3 py-1">{selectedShot.motion}</span>
            {selectedShot.sourceImageUrls?.length ? (
              <span className="rounded-full bg-[#eef4ef] px-3 py-1">
                {selectedShot.sourceImageUrls.length} references
              </span>
            ) : null}
          </div>

          <p className="text-sm leading-6 text-[#425054]">{selectedShot.prompt}</p>

          <div className="overflow-hidden rounded-lg border border-stone-300">
            <div className="grid grid-cols-2 bg-[#eef4ef] p-1">
              <button
                className={`min-h-10 rounded-md text-sm font-bold ${
                  promptTab === "image" ? "bg-white text-[#1d2528]" : "text-[#647174]"
                }`}
                onClick={() => setPromptTab("image")}
                type="button"
              >
                Image Prompt
              </button>
              <button
                className={`min-h-10 rounded-md text-sm font-bold ${
                  promptTab === "video" ? "bg-white text-[#1d2528]" : "text-[#647174]"
                }`}
                onClick={() => setPromptTab("video")}
                type="button"
              >
                Video Instructions
              </button>
            </div>

            <div className="grid gap-3 p-3">
              {promptTab === "image" ? (
                <>
                  <textarea
                    className="min-h-36 resize-y rounded-lg border border-stone-300 bg-[#f8faf8] px-3 py-3 text-sm leading-6 outline-none focus:border-[#2f6f63]"
                    onChange={(event) => setImagePromptDraft(event.target.value)}
                    value={imagePromptDraft}
                  />
                  {selectedShot.imageError ? (
                    <div className="rounded-lg border border-[#c96b6b] bg-[#fff6f3] p-3 text-sm leading-6 text-[#8a2e2e]">
                      {selectedShot.imageError}
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <a
                      className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-4 font-bold text-[#1d2528] sm:w-44 ${
                        selectedShot.startImageUrl ? "" : "pointer-events-none opacity-55"
                      }`}
                      download={`${selectedShot.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-start.png`}
                      href={selectedShot.startImageUrl || "#"}
                    >
                      <Download size={18} />
                      Download
                    </a>
                    <button
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-4 font-bold text-[#1d2528] disabled:cursor-not-allowed disabled:opacity-55 sm:w-56"
                      disabled={imageIsRunning || !imagePromptDraft.trim()}
                      onClick={() => onRegenerateShotImage(selectedShot.id, imagePromptDraft)}
                      type="button"
                    >
                      {imageIsRunning ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                      {imagePromptChanged ? "Regenerate Image" : "Regenerate"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <textarea
                    className="min-h-36 resize-y rounded-lg border border-stone-300 bg-[#f8faf8] px-3 py-3 text-sm leading-6 outline-none focus:border-[#2f6f63]"
                    onBlur={() => {
                      if (videoPromptDraft.trim()) {
                        onUpdateShotVideoPrompt(selectedShot.id, videoPromptDraft);
                      }
                    }}
                    onChange={(event) => {
                      const value = event.target.value;
                      setVideoPromptDraft(value);
                      onUpdateShotVideoPrompt(selectedShot.id, value);
                    }}
                    value={videoPromptDraft}
                  />
                  <label className="flex items-start gap-2 rounded-lg bg-[#f8faf8] p-3 text-sm leading-6 text-[#647174]">
                    <input checked={needsReferenceImage} className="mt-1" disabled readOnly type="checkbox" />
                    <span>
                      Reference image will be used automatically when a generated starting image or product photo is
                      available.
                    </span>
                  </label>
                  {videoPromptChanged ? (
                    <div className="text-xs font-bold text-[#647174]">Video instructions saved for this shot.</div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <ThumbnailPager
        pageCount={thumbnailPageCount}
        pageIndex={safeThumbnailPageIndex}
        selectedShotIndex={selectedShotIndex}
        shots={visibleThumbnails}
        startIndex={safeThumbnailPageIndex * thumbnailsPerPage}
        onPageChange={setThumbnailPageIndex}
        onSelectShot={selectShot}
      />

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

function ThumbnailPager({
  shots,
  startIndex,
  selectedShotIndex,
  pageIndex,
  pageCount,
  onSelectShot,
  onPageChange
}: {
  shots: Shot[];
  startIndex: number;
  selectedShotIndex: number;
  pageIndex: number;
  pageCount: number;
  onSelectShot: (index: number) => void;
  onPageChange: (index: number) => void;
}) {
  return (
    <div className="border-t border-stone-300 p-5">
      <div className="flex items-center gap-3">
        <button
          className="grid size-10 shrink-0 place-items-center rounded-lg border border-stone-300 bg-white text-[#1d2528] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={pageIndex === 0}
          onClick={() => onPageChange(Math.max(0, pageIndex - 1))}
          type="button"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="grid flex-1 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {shots.map((shot, index) => {
            const absoluteIndex = startIndex + index;
            const selected = absoluteIndex === selectedShotIndex;

            return (
              <button
                className={`grid min-h-24 gap-2 rounded-lg border p-2 text-left transition ${
                  selected
                    ? "border-[#2f6f63] bg-[#eef4ef] shadow-[inset_0_0_0_1px_#2f6f63]"
                    : "border-stone-300 bg-[#f8faf8] hover:border-[#2f6f63]"
                }`}
                key={shot.id}
                onClick={() => onSelectShot(absoluteIndex)}
                type="button"
              >
                {shot.startImageUrl ? (
                  <img
                    alt=""
                    className="aspect-video w-full rounded-md bg-[#dce5df] object-cover"
                    src={shot.startImageUrl}
                  />
                ) : (
                  <div className="grid aspect-video place-items-center rounded-md bg-[#dce5df] text-[#647174]">
                    {shot.imageStatus === "running" ? (
                      <Loader2 className="animate-spin text-[#2f6f63]" size={16} />
                    ) : (
                      <ImageIcon size={16} />
                    )}
                  </div>
                )}
                <span className="line-clamp-2 text-xs font-bold text-[#1d2528]">
                  {absoluteIndex + 1}. {shot.title}
                </span>
              </button>
            );
          })}
        </div>

        <button
          className="grid size-10 shrink-0 place-items-center rounded-lg border border-stone-300 bg-white text-[#1d2528] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={pageIndex >= pageCount - 1}
          onClick={() => onPageChange(Math.min(pageCount - 1, pageIndex + 1))}
          type="button"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {pageCount > 1 ? (
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: pageCount }).map((_, index) => (
            <button
              aria-label={`Go to shot page ${index + 1}`}
              className={`size-2.5 rounded-full border border-[#2f6f63] ${
                index === pageIndex ? "bg-[#2f6f63]" : "bg-white"
              }`}
              key={index}
              onClick={() => onPageChange(index)}
              type="button"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ShotlistPlaceholder() {
  return (
    <section className="rounded-lg border border-stone-300 bg-white shadow-[0_18px_60px_rgba(29,37,40,0.12)]">
      <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <div className="aspect-video animate-pulse rounded-lg bg-[#dce5df]" />
        <div className="grid content-start gap-4">
          <div className="h-5 w-24 animate-pulse rounded-full bg-[#dce5df]" />
          <div className="h-8 w-64 animate-pulse rounded-full bg-[#dce5df]" />
          <div className="h-4 w-full animate-pulse rounded-full bg-[#eef4ef]" />
          <div className="h-4 w-4/5 animate-pulse rounded-full bg-[#eef4ef]" />
          <div className="h-36 animate-pulse rounded-lg bg-[#eef4ef]" />
        </div>
      </div>
    </section>
  );
}

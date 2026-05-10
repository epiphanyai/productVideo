import { Clapperboard, Film, ImageIcon, Loader2 } from "lucide-react";
import { getVideoStyleLabel } from "@/lib/workflow/styles";
import type { Shotlist } from "@/lib/workflow/types";

type ShotlistWorkspaceProps = {
  shotlist: Shotlist | null;
  isLoading: boolean;
  isGeneratingImages: boolean;
  isCreatingVideo: boolean;
  onCreateVideo: () => void;
};

export function ShotlistWorkspace({
  shotlist,
  isLoading,
  isGeneratingImages,
  isCreatingVideo,
  onCreateVideo
}: ShotlistWorkspaceProps) {
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
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-stone-300 bg-white shadow-[0_18px_60px_rgba(29,37,40,0.12)]">
      <div className="border-b border-stone-300 p-5">
        <div className="text-xs font-bold uppercase tracking-wide text-[#2f6f63]">
          {getVideoStyleLabel(shotlist.style)}
        </div>
        <h2 className="mt-1 text-xl font-bold text-[#1d2528]">{shotlist.productName} Image Shotlist</h2>
        <p className="mt-2 text-sm leading-6 text-[#647174]">{shotlist.concept}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-[#647174]">
          <span className="rounded-full bg-[#eef4ef] px-3 py-1">{shotlist.targetDurationSeconds}s target</span>
          <span className="rounded-full bg-[#eef4ef] px-3 py-1">{shotlist.shots.length} shots</span>
          <span className="rounded-full bg-[#eef4ef] px-3 py-1">
            {shotlist.visualFeatureCount} visual features
          </span>
        </div>
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
        {shotlist.shots.map((shot, index) => (
          <article
            className="overflow-hidden rounded-lg border border-stone-300 bg-[#f8faf8]"
            key={shot.id}
          >
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
                  <div className="px-4 text-center text-xs font-bold text-[#8a2e2e]">
                    Image failed
                  </div>
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
                <div className="mt-3 text-xs text-[#647174]">
                  References: {shot.sourceImageUrls.length}
                </div>
              ) : null}
              {shot.imageError ? (
                <div className="mt-3 rounded-lg border border-[#c96b6b] bg-[#fff6f3] p-2 text-xs leading-5 text-[#8a2e2e]">
                  {shot.imageError}
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      <div className="border-t border-stone-300 p-5">
        <button
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#2f6f63] px-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-55 md:w-auto"
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
      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
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

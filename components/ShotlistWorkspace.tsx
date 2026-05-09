import { Clapperboard } from "lucide-react";
import { getVideoStyleLabel } from "@/lib/workflow/styles";
import type { Shotlist } from "@/lib/workflow/types";

type ShotlistWorkspaceProps = {
  shotlist: Shotlist | null;
};

export function ShotlistWorkspace({ shotlist }: ShotlistWorkspaceProps) {
  if (!shotlist) {
    return (
      <section className="grid min-h-[360px] place-items-center rounded-lg border border-stone-300 bg-white p-8 text-center shadow-[0_18px_60px_rgba(29,37,40,0.12)]">
        <div>
          <Clapperboard className="mx-auto mb-3 text-[#2f6f63]" size={34} />
          <h2 className="text-lg font-bold">Shotlist will appear here</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-[#647174]">
            The agent will convert the product brief and image references into a structured sequence for Miro review.
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
        <h2 className="mt-1 text-xl font-bold text-[#1d2528]">{shotlist.productName} Shotlist</h2>
        <p className="mt-2 text-sm leading-6 text-[#647174]">{shotlist.concept}</p>
      </div>
      <div className="grid gap-3 p-5">
        {shotlist.shots.map((shot, index) => (
          <article
            className="rounded-lg border border-stone-300 border-l-[#477caa] bg-[#f8faf8] p-4 odd:border-l-4 even:border-l-4 even:border-l-[#a8445f]"
            key={shot.id}
          >
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
            {shot.assets.length > 0 ? (
              <div className="mt-3 text-xs text-[#647174]">Assets: {shot.assets.join(", ")}</div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

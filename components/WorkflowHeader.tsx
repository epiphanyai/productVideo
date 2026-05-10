import type { WorkflowStage } from "@/lib/workflow/types";

const steps: { id: WorkflowStage; label: string; detail: string }[] = [
  { id: "intake", label: "Product Intake", detail: "Brief, photos, style" },
  { id: "miro", label: "Miro Board", detail: "Team edits source" },
  { id: "image-shotlist", label: "Image Shotlist", detail: "Board to frames" },
  { id: "video", label: "Video", detail: "Generate draft" }
];

type WorkflowHeaderProps = {
  activeStage: WorkflowStage;
};

export function WorkflowHeader({ activeStage }: WorkflowHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-stone-900/10 bg-[#f4f1ea]/95 px-5 py-4 backdrop-blur md:px-10 lg:px-14">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#1d2528] text-sm font-black text-white">
            PV
          </div>
          <div>
            <div className="text-sm font-bold text-[#1d2528]">Product Video Runtime</div>
            <div className="text-xs text-[#647174]">Codex agent workflow with Miro review</div>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-4 lg:min-w-[620px]">
          {steps.map((step, index) => {
            const isActive = step.id === activeStage;

            return (
              <div
                className={`rounded-lg border px-3 py-2 ${
                  isActive
                    ? "border-[#2f6f63] bg-[#2f6f63] text-white"
                    : "border-stone-300 bg-white/70 text-[#1d2528]"
                }`}
                key={step.id}
              >
                <div className={isActive ? "text-xs text-white/70" : "text-xs text-[#647174]"}>
                  Step {index + 1}
                </div>
                <div className="truncate text-sm font-bold">{step.label}</div>
                <div className={isActive ? "truncate text-xs text-white/75" : "truncate text-xs text-[#647174]"}>
                  {step.detail}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </header>
  );
}

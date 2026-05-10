export function WorkflowHeader() {
  return (
    <header className="border-b border-stone-900/10 bg-[#f4f1ea]/95 px-5 py-4 md:px-8 lg:px-10">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#1d2528] text-sm font-black text-white">
          kAI
        </div>
        <div>
          <div className="text-sm font-bold text-[#1d2528]">kineticAI</div>
          <div className="text-xs text-[#647174]">Static images to production video</div>
        </div>
      </div>
    </header>
  );
}

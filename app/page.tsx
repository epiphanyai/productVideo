"use client";

import { useMemo, useState } from "react";
import { IntegrationPanel } from "@/components/IntegrationPanel";
import { ProductIntake } from "@/components/ProductIntake";
import { ShotlistWorkspace } from "@/components/ShotlistWorkspace";
import { WorkflowHeader } from "@/components/WorkflowHeader";
import type {
  MiroBoardResult,
  ProductBrief,
  Shotlist,
  VideoJobResult,
  WorkflowStage
} from "@/lib/workflow/types";

const defaultBrief: ProductBrief = {
  productName: "",
  description: "",
  audience: "",
  style: "studio",
  photos: []
};

export default function Home() {
  const [brief, setBrief] = useState<ProductBrief>(defaultBrief);
  const [shotlist, setShotlist] = useState<Shotlist | null>(null);
  const [miroResult, setMiroResult] = useState<MiroBoardResult | null>(null);
  const [videoResult, setVideoResult] = useState<VideoJobResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRoutingToMiro, setIsRoutingToMiro] = useState(false);
  const [isCreatingVideo, setIsCreatingVideo] = useState(false);

  const activeStage = useMemo<WorkflowStage>(() => {
    if (videoResult) {
      return "video";
    }

    if (miroResult) {
      return "miro";
    }

    if (shotlist) {
      return "shotlist";
    }

    return "intake";
  }, [miroResult, shotlist, videoResult]);

  async function generateShotlist() {
    setIsGenerating(true);
    setMiroResult(null);
    setVideoResult(null);

    try {
      const response = await fetch("/api/shotlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brief)
      });
      const payload = (await response.json()) as { shotlist?: Shotlist; error?: string };

      if (!response.ok || !payload.shotlist) {
        throw new Error(payload.error ?? "Unable to create shotlist.");
      }

      setShotlist(payload.shotlist);
    } finally {
      setIsGenerating(false);
    }
  }

  async function routeToMiro() {
    if (!shotlist) {
      return;
    }

    setIsRoutingToMiro(true);
    try {
      const response = await fetch("/api/miro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shotlist })
      });
      const payload = (await response.json()) as { miro?: MiroBoardResult; error?: string };

      if (!response.ok || !payload.miro) {
        throw new Error(payload.error ?? "Unable to create Miro board.");
      }

      setMiroResult(payload.miro);
    } finally {
      setIsRoutingToMiro(false);
    }
  }

  async function createVideo() {
    if (!shotlist) {
      return;
    }

    setIsCreatingVideo(true);
    try {
      const response = await fetch("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shotlist, photos: brief.photos })
      });
      const payload = (await response.json()) as { video?: VideoJobResult; error?: string };

      if (!response.ok || !payload.video) {
        throw new Error(payload.error ?? "Unable to create video.");
      }

      setVideoResult(payload.video);
    } finally {
      setIsCreatingVideo(false);
    }
  }

  return (
    <main className="min-h-screen">
      <WorkflowHeader activeStage={activeStage} />

      <section className="grid gap-8 px-5 py-9 md:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:px-14">
        <div>
          <h1 className="max-w-3xl text-5xl font-black leading-none tracking-normal text-[#1d2528] md:text-7xl">
            Agentic product video creation
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#425054]">
            Move from product brief to Codex-generated shotlist, Miro collaboration, and video generation through one structured runtime.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-[#1d2528] text-white md:grid-cols-4">
          {["Describe product", "Draft shotlist", "Review in Miro", "Create video"].map((label, index) => (
            <div
              className={`min-h-28 p-4 ${index === 0 ? "bg-[#1f5148]" : "bg-[#253135]"}`}
              key={label}
            >
              <span className="text-xs text-white/65">0{index + 1}</span>
              <strong className="mt-5 block text-sm leading-5">{label}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 px-5 pb-14 md:px-10 lg:grid-cols-[430px_minmax(0,1fr)] lg:px-14">
        <ProductIntake
          brief={brief}
          isGenerating={isGenerating}
          onBriefChange={setBrief}
          onGenerateShotlist={generateShotlist}
        />
        <div className="grid content-start gap-5">
          <ShotlistWorkspace shotlist={shotlist} />
          <IntegrationPanel
            isCreatingVideo={isCreatingVideo}
            isRoutingToMiro={isRoutingToMiro}
            miroResult={miroResult}
            onCreateVideo={createVideo}
            onRouteToMiro={routeToMiro}
            shotlist={shotlist}
            videoResult={videoResult}
          />
        </div>
      </section>
    </main>
  );
}

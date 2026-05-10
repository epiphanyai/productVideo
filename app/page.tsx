"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [miroBoardUrl, setMiroBoardUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMiroConnected, setIsMiroConnected] = useState(false);
  const [isRoutingToMiro, setIsRoutingToMiro] = useState(false);
  const [isCreatingVideo, setIsCreatingVideo] = useState(false);
  const [shotlistError, setShotlistError] = useState<string | null>(null);
  const [miroError, setMiroError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

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

  useEffect(() => {
    let isMounted = true;

    async function loadMiroAuthStatus() {
      try {
        const response = await fetch("/api/miro/auth/status");
        const payload = (await response.json()) as { miroAuth?: { connected?: boolean } };

        if (isMounted) {
          setIsMiroConnected(Boolean(payload.miroAuth?.connected));
        }
      } catch {
        if (isMounted) {
          setIsMiroConnected(false);
        }
      }
    }

    void loadMiroAuthStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  async function generateShotlist() {
    setIsGenerating(true);
    setMiroResult(null);
    setVideoResult(null);
    setShotlistError(null);
    setMiroError(null);
    setVideoError(null);

    try {
      const response = await fetch("/api/shotlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...brief,
          photos: brief.photos.map((photo) => ({
            id: photo.id,
            name: photo.name,
            url: summarizePhotoForShotlist(photo.url)
          }))
        })
      });
      const payload = (await response.json()) as { shotlist?: Shotlist; error?: string };

      if (!response.ok || !payload.shotlist) {
        throw new Error(payload.error ?? "Unable to create shotlist.");
      }

      setShotlist(payload.shotlist);
    } catch (error) {
      setShotlistError(error instanceof Error ? error.message : "Unable to create shotlist.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function routeToMiro() {
    if (!shotlist) {
      return;
    }

    setIsRoutingToMiro(true);
    setMiroError(null);
    try {
      const response = await fetch("/api/miro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardUrl: miroBoardUrl.trim() || undefined, shotlist })
      });
      const payload = (await response.json()) as { miro?: MiroBoardResult; error?: string };

      if (!response.ok || !payload.miro) {
        throw new Error(payload.error ?? "Unable to create Miro board.");
      }

      setMiroResult(payload.miro);
    } catch (error) {
      setMiroError(error instanceof Error ? error.message : "Unable to create Miro board.");
    } finally {
      setIsRoutingToMiro(false);
    }
  }

  async function createVideo() {
    if (!shotlist) {
      return;
    }

    setIsCreatingVideo(true);
    setVideoError(null);
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
    } catch (error) {
      setVideoError(error instanceof Error ? error.message : "Unable to create video.");
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
          error={shotlistError}
          isGenerating={isGenerating}
          onBriefChange={setBrief}
          onGenerateShotlist={generateShotlist}
        />
        <div className="grid content-start gap-5">
          <ShotlistWorkspace shotlist={shotlist} />
          <IntegrationPanel
            isCreatingVideo={isCreatingVideo}
            isMiroConnected={isMiroConnected}
            isRoutingToMiro={isRoutingToMiro}
            miroBoardUrl={miroBoardUrl}
            miroError={miroError}
            miroResult={miroResult}
            onMiroBoardUrlChange={setMiroBoardUrl}
            onCreateVideo={createVideo}
            onRouteToMiro={routeToMiro}
            shotlist={shotlist}
            videoError={videoError}
            videoResult={videoResult}
          />
        </div>
      </section>
    </main>
  );
}

function summarizePhotoForShotlist(url: string) {
  if (url.startsWith("data:")) {
    const mimeType = url.match(/^data:([^;,]+)/)?.[1] ?? "image";

    return `${mimeType} uploaded by user`;
  }

  return url;
}

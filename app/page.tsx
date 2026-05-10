"use client";

import { useEffect, useRef, useState } from "react";
import { MiroPanel } from "@/components/MiroPanel";
import { ProductIntake } from "@/components/ProductIntake";
import { ShotlistWorkspace } from "@/components/ShotlistWorkspace";
import { VideoPanel } from "@/components/VideoPanel";
import { WorkflowHeader } from "@/components/WorkflowHeader";
import type {
  ImageShotlistResult,
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

const STAGES: { id: WorkflowStage; num: string; label: string; sub: string }[] = [
  { id: "intake",         num: "I",   label: "Intake",     sub: "Brief + stills" },
  { id: "miro",           num: "II",  label: "Miro Board", sub: "Team staging" },
  { id: "image-shotlist", num: "III", label: "Shotlist",   sub: "Image review" },
  { id: "video",          num: "IV",  label: "Video",      sub: "Render & export" },
];

export default function Home() {
  const [brief, setBrief] = useState<ProductBrief>(defaultBrief);
  const [shotlist, setShotlist] = useState<Shotlist | null>(null);
  const [activeStage, setActiveStage] = useState<WorkflowStage>("intake");
  const [miroResult, setMiroResult] = useState<MiroBoardResult | null>(null);
  const [imageShotlistResult, setImageShotlistResult] = useState<ImageShotlistResult | null>(null);
  const [videoResult, setVideoResult] = useState<VideoJobResult | null>(null);
  const [miroBoardUrl, setMiroBoardUrl] = useState("");
  const [isMiroConnected, setIsMiroConnected] = useState(false);
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [isCreatingShotlist, setIsCreatingShotlist] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [isCreatingVideo, setIsCreatingVideo] = useState(false);
  const [isCreatingFinalVideo, setIsCreatingFinalVideo] = useState(false);
  const [showExistingBoardInput, setShowExistingBoardInput] = useState(false);
  const [miroError, setMiroError] = useState<string | null>(null);
  const [shotlistError, setShotlistError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const imageGenerationRunId = useRef(0);

  useEffect(() => {
    void loadMiroAuthStatus();

    function handleMiroAuthMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.data?.type !== "miro-auth") return;
      void loadMiroAuthStatus();
    }

    window.addEventListener("message", handleMiroAuthMessage);
    return () => window.removeEventListener("message", handleMiroAuthMessage);
  }, []);

  async function loadMiroAuthStatus() {
    try {
      const response = await fetch("/api/miro/auth/status");
      const payload = (await response.json()) as { miroAuth?: { connected?: boolean } };
      setIsMiroConnected(Boolean(payload.miroAuth?.connected));
    } catch {
      setIsMiroConnected(false);
    }
  }

  function openMiroAuth(reconnect = false) {
    const authUrl = reconnect ? "/api/miro/auth/reconnect" : "/api/miro/auth/start";
    const popup = window.open(authUrl, "miro-auth", "popup,width=720,height=760");

    if (!popup) {
      window.location.href = authUrl;
      return;
    }

    const poll = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(poll);
        void loadMiroAuthStatus();
      }
    }, 1000);
  }

  async function createMiroBoard(boardUrl?: string) {
    setActiveStage("miro");
    setIsCreatingBoard(true);
    setMiroError(null);
    setShotlistError(null);
    setVideoError(null);
    setShotlist(null);
    setImageShotlistResult(null);
    setVideoResult(null);
    setIsGeneratingImages(false);
    imageGenerationRunId.current += 1;

    try {
      const response = await fetch("/api/miro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardUrl: boardUrl?.trim() || undefined, brief })
      });
      const payload = (await response.json()) as { miro?: MiroBoardResult; error?: string };

      if (!response.ok || !payload.miro) throw new Error(payload.error ?? "Unable to create Miro board.");

      setMiroResult(payload.miro);
      setMiroBoardUrl(payload.miro.boardUrl ?? boardUrl ?? "");
      setShowExistingBoardInput(!payload.miro.boardUrl);
    } catch (error) {
      setMiroError(error instanceof Error ? error.message : "Unable to create Miro board.");
      setShowExistingBoardInput(true);
    } finally {
      setIsCreatingBoard(false);
    }
  }

  async function createShotlistFromMiro() {
    const boardUrl = miroResult?.boardUrl ?? miroBoardUrl.trim();

    if (!boardUrl) {
      setShotlistError("Create or enter a Miro board URL first.");
      setShowExistingBoardInput(true);
      return;
    }

    setIsCreatingShotlist(true);
    setActiveStage("image-shotlist");
    setShotlistError(null);
    setVideoError(null);
    setShotlist(null);
    setImageShotlistResult(null);
    setVideoResult(null);
    setIsGeneratingImages(false);
    imageGenerationRunId.current += 1;

    try {
      const response = await fetch("/api/shotlist/from-miro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardUrl, brief, photos: brief.photos })
      });
      const payload = (await response.json()) as { result?: ImageShotlistResult; error?: string };

      if (!response.ok || !payload.result) throw new Error(payload.error ?? "Unable to create shotlist from Miro.");

      setImageShotlistResult(payload.result);
      const baseShotlist = {
        ...payload.result.shotlist,
        shots: payload.result.shotlist.shots.map((shot) => ({
          ...shot,
          imageStatus: "running" as const,
          endImageStatus: shot.useEndImage ? ("running" as const) : ("idle" as const),
          startImageUrl: undefined,
          endImageUrl: undefined,
          imageError: undefined,
          endImageError: undefined
        }))
      };

      setShotlist(baseShotlist);
      void generateShotImagesConcurrently(baseShotlist, payload.result.boardContext.imageUrls);
    } catch (error) {
      setShotlistError(error instanceof Error ? error.message : "Unable to create shotlist from Miro.");
    } finally {
      setIsCreatingShotlist(false);
    }
  }

  async function generateShotImagesConcurrently(baseShotlist: Shotlist, miroImageUrls: string[]) {
    const runId = imageGenerationRunId.current;
    setIsGeneratingImages(true);

    async function generateShotImage(
      shot: Shotlist["shots"][number],
      imageKind: "start" | "end",
      imagePrompt: string | undefined
    ): Promise<Shotlist["shots"][number] | null> {
      if (runId !== imageGenerationRunId.current) return null;

      try {
        const response = await fetch("/api/shotlist/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shotlist: baseShotlist, shotId: shot.id, photos: brief.photos, miroImageUrls, imagePrompt, imageKind })
        });
        const payload = (await response.json()) as {
          result?: { shot: Shotlist["shots"][number]; status: "mocked" | "created"; message: string };
          error?: string;
        };

        if (!response.ok || !payload.result) throw new Error(payload.error ?? "Unable to generate starting image.");

        const nextShot = mergeGeneratedShotImage(shot, payload.result.shot, imageKind);
        setShotlist((current) =>
          current
            ? { ...current, shots: current.shots.map((s) => s.id === shot.id ? mergeGeneratedShotImage(s, payload.result!.shot, imageKind) : s) }
            : current
        );
        return nextShot;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to generate starting image.";
        setShotlist((current) =>
          current
            ? {
                ...current,
                shots: current.shots.map((s) =>
                  s.id === shot.id
                    ? { ...s, ...(imageKind === "end" ? { endImageStatus: "error" as const, endImageError: message } : { imageStatus: "error" as const, imageError: message }) }
                    : s
                )
              }
            : current
        );
        return null;
      }
    }

    const startResults = await Promise.all(
      baseShotlist.shots.map(async (shot) => (await generateShotImage(shot, "start", shot.imagePrompt)) ?? shot)
    );

    if (runId !== imageGenerationRunId.current) return;

    await Promise.all(
      startResults.filter((shot) => shot.useEndImage).map((shot) => generateShotImage(shot, "end", shot.endImagePrompt))
    );

    if (runId === imageGenerationRunId.current) setIsGeneratingImages(false);
  }

  async function regenerateShotImage(shotId: string, imagePrompt: string, imageKind: "start" | "end" = "start") {
    if (!shotlist) return;

    const boardImageUrls = imageShotlistResult?.boardContext.imageUrls ?? [];
    const requestShotlist = {
      ...shotlist,
      shots: shotlist.shots.map((shot) =>
        shot.id === shotId
          ? { ...shot, ...(imageKind === "end" ? { endImagePrompt: imagePrompt, useEndImage: true } : { imagePrompt }) }
          : shot
      )
    };

    setShotlist((current) =>
      current
        ? {
            ...current,
            shots: current.shots.map((shot) =>
              shot.id === shotId
                ? { ...shot, ...(imageKind === "end" ? { endImagePrompt: imagePrompt, useEndImage: true, endImageStatus: "running" as const, endImageError: undefined } : { imagePrompt, imageStatus: "running" as const, imageError: undefined }) }
                : shot
            )
          }
        : current
    );

    try {
      const response = await fetch("/api/shotlist/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shotlist: requestShotlist, shotId, photos: brief.photos, miroImageUrls: boardImageUrls, imagePrompt, imageKind })
      });
      const payload = (await response.json()) as {
        result?: { shot: Shotlist["shots"][number]; status: "mocked" | "created"; message: string };
        error?: string;
      };

      if (!response.ok || !payload.result) throw new Error(payload.error ?? "Unable to regenerate starting image.");

      setShotlist((current) =>
        current
          ? { ...current, shots: current.shots.map((shot) => shot.id === shotId ? mergeGeneratedShotImage(shot, payload.result!.shot, imageKind) : shot) }
          : current
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to regenerate starting image.";
      setShotlist((current) =>
        current
          ? {
              ...current,
              shots: current.shots.map((shot) =>
                shot.id === shotId
                  ? { ...shot, ...(imageKind === "end" ? { endImageStatus: "error" as const, endImageError: message } : { imageStatus: "error" as const, imageError: message }) }
                  : shot
              )
            }
          : current
      );
    }
  }

  function toggleShotEndImage(shotId: string, enabled: boolean, endImagePrompt?: string) {
    if (!shotlist) return;

    if (!enabled) {
      setShotlist((current) =>
        current
          ? { ...current, shots: current.shots.map((shot) => shot.id === shotId ? { ...shot, useEndImage: false, endImageStatus: "idle", endImageError: undefined, endImageUrl: undefined } : shot) }
          : current
      );
      return;
    }

    const shot = shotlist.shots.find((candidate) => candidate.id === shotId);
    const prompt = endImagePrompt?.trim() || shot?.endImagePrompt || shot?.imagePrompt || shot?.prompt || "";
    if (prompt) void regenerateShotImage(shotId, prompt, "end");
  }

  function mergeGeneratedShotImage(
    currentShot: Shotlist["shots"][number],
    generatedShot: Shotlist["shots"][number],
    imageKind: "start" | "end"
  ) {
    return imageKind === "end"
      ? { ...currentShot, endImagePrompt: generatedShot.endImagePrompt ?? currentShot.endImagePrompt, endImageUrl: generatedShot.endImageUrl, endImageStatus: generatedShot.endImageUrl ? ("ready" as const) : ("idle" as const), endImageError: undefined, sourceImageUrls: generatedShot.sourceImageUrls ?? currentShot.sourceImageUrls, useEndImage: true }
      : { ...currentShot, imagePrompt: generatedShot.imagePrompt ?? currentShot.imagePrompt, startImageUrl: generatedShot.startImageUrl, imageStatus: generatedShot.startImageUrl ? ("ready" as const) : ("idle" as const), imageError: undefined, sourceImageUrls: generatedShot.sourceImageUrls ?? currentShot.sourceImageUrls };
  }

  function updateShotVideoPrompt(shotId: string, videoPrompt: string) {
    setShotlist((current) =>
      current ? { ...current, shots: current.shots.map((shot) => shot.id === shotId ? { ...shot, videoPrompt } : shot) } : current
    );
  }

  async function createVideo(quality: "draft" | "final" = "draft") {
    if (!shotlist) return;

    setActiveStage("video");
    setVideoError(null);

    if (quality === "final") {
      setIsCreatingFinalVideo(true);
    } else {
      setIsCreatingVideo(true);
    }

    try {
      const response = await fetch("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shotlist, photos: brief.photos, quality })
      });
      const payload = (await response.json()) as { video?: VideoJobResult; error?: string };

      if (!response.ok || !payload.video) throw new Error(payload.error ?? "Unable to create video.");

      setVideoResult(payload.video);
    } catch (error) {
      setVideoError(error instanceof Error ? error.message : "Unable to create video.");
    } finally {
      setIsCreatingVideo(false);
      setIsCreatingFinalVideo(false);
    }
  }

  return (
    <div className="app">
      <WorkflowHeader />

      <div className="workspace">
        <nav className="tabs" aria-label="Workflow stages">
          {STAGES.map((s) => (
            <button
              key={s.id}
              className="tab"
              aria-current={s.id === activeStage ? "step" : undefined}
              onClick={() => setActiveStage(s.id)}
              type="button"
            >
              <span className="num">{s.num}.</span>
              <span className="tab-label">{s.label}</span>
              <span className="tab-sub">{s.sub}</span>
            </button>
          ))}
        </nav>

        <div className="panel-main">
          <div style={{ display: activeStage === "intake" ? "block" : "none" }}>
            <ProductIntake
              brief={brief}
              error={miroError}
              isGenerating={isCreatingBoard}
              onBriefChange={setBrief}
              onCreateMiroBoard={() => createMiroBoard()}
            />
          </div>

          <div style={{ display: activeStage === "miro" ? "block" : "none" }}>
            <MiroPanel
              brief={brief}
              error={miroError}
              isConnected={isMiroConnected}
              isCreatingBoard={isCreatingBoard}
              isCreatingShotlist={isCreatingShotlist}
              miroBoardUrl={miroBoardUrl}
              onConnectMiro={openMiroAuth}
              onCreateShotlist={createShotlistFromMiro}
              onMiroBoardUrlChange={setMiroBoardUrl}
              onUseExistingBoard={() => createMiroBoard(miroBoardUrl)}
              result={miroResult}
              shotlistError={shotlistError}
              showExistingBoardInput={showExistingBoardInput}
            />
          </div>

          <div style={{ display: activeStage === "image-shotlist" ? "block" : "none" }}>
            <ShotlistWorkspace
              brief={brief}
              error={shotlistError}
              isCreatingVideo={isCreatingVideo}
              isGeneratingImages={isGeneratingImages}
              isLoading={isCreatingShotlist}
              onCreateVideo={() => createVideo("draft")}
              onRegenerateShotImage={regenerateShotImage}
              onToggleEndImage={toggleShotEndImage}
              onUpdateShotVideoPrompt={updateShotVideoPrompt}
              shotlist={shotlist}
            />
          </div>

          <div style={{ display: activeStage === "video" ? "block" : "none" }}>
            <VideoPanel
              error={videoError}
              isCreating={isCreatingVideo}
              isFinalRendering={isCreatingFinalVideo}
              result={videoResult}
              shotlist={shotlist}
              onEditShotlist={() => setActiveStage("image-shotlist")}
              onRerender={() => createVideo("draft")}
              onRenderFinal={() => createVideo("final")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

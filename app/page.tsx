"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

export default function Home() {
  const [brief, setBrief] = useState<ProductBrief>(defaultBrief);
  const [shotlist, setShotlist] = useState<Shotlist | null>(null);
  const [miroResult, setMiroResult] = useState<MiroBoardResult | null>(null);
  const [imageShotlistResult, setImageShotlistResult] = useState<ImageShotlistResult | null>(null);
  const [videoResult, setVideoResult] = useState<VideoJobResult | null>(null);
  const [miroBoardUrl, setMiroBoardUrl] = useState("");
  const [isMiroConnected, setIsMiroConnected] = useState(false);
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [isCreatingShotlist, setIsCreatingShotlist] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [isCreatingVideo, setIsCreatingVideo] = useState(false);
  const [showExistingBoardInput, setShowExistingBoardInput] = useState(false);
  const [miroError, setMiroError] = useState<string | null>(null);
  const [shotlistError, setShotlistError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const imageGenerationRunId = useRef(0);

  const activeStage = useMemo<WorkflowStage>(() => {
    if (videoResult) {
      return "video";
    }

    if (shotlist) {
      return "image-shotlist";
    }

    if (miroResult) {
      return "miro";
    }

    return "intake";
  }, [miroResult, shotlist, videoResult]);

  useEffect(() => {
    void loadMiroAuthStatus();

    function handleMiroAuthMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.data?.type !== "miro-auth") {
        return;
      }

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
        body: JSON.stringify({
          boardUrl: boardUrl?.trim() || undefined,
          brief
        })
      });
      const payload = (await response.json()) as { miro?: MiroBoardResult; error?: string };

      if (!response.ok || !payload.miro) {
        throw new Error(payload.error ?? "Unable to create Miro board.");
      }

      setMiroResult(payload.miro);
      setMiroBoardUrl(payload.miro.boardUrl ?? boardUrl ?? "");
      setShowExistingBoardInput(!payload.miro.boardUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create Miro board.";

      setMiroError(message);
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
        body: JSON.stringify({
          boardUrl,
          brief,
          photos: brief.photos
        })
      });
      const payload = (await response.json()) as { result?: ImageShotlistResult; error?: string };

      if (!response.ok || !payload.result) {
        throw new Error(payload.error ?? "Unable to create shotlist from Miro.");
      }

      setImageShotlistResult(payload.result);
      const baseShotlist = {
        ...payload.result.shotlist,
        shots: payload.result.shotlist.shots.map((shot) => ({
          ...shot,
          imageStatus: "running" as const,
          startImageUrl: undefined,
          imageError: undefined
        }))
      };

      setShotlist(baseShotlist);
      void generateShotImagesSequentially(baseShotlist, payload.result.boardContext.imageUrls);
    } catch (error) {
      setShotlistError(error instanceof Error ? error.message : "Unable to create shotlist from Miro.");
    } finally {
      setIsCreatingShotlist(false);
    }
  }

  async function generateShotImagesSequentially(baseShotlist: Shotlist, miroImageUrls: string[]) {
    const runId = imageGenerationRunId.current;

    setIsGeneratingImages(true);

    for (const shot of baseShotlist.shots) {
      if (runId !== imageGenerationRunId.current) {
        return;
      }

      try {
        const response = await fetch("/api/shotlist/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shotlist: baseShotlist,
            shotId: shot.id,
            photos: brief.photos,
            miroImageUrls
          })
        });
        const payload = (await response.json()) as {
          result?: { shot: Shotlist["shots"][number]; status: "mocked" | "created"; message: string };
          error?: string;
        };

        if (!response.ok || !payload.result) {
          throw new Error(payload.error ?? "Unable to generate starting image.");
        }

        setShotlist((current) =>
          current
            ? {
                ...current,
                shots: current.shots.map((currentShot) =>
                  currentShot.id === shot.id
                    ? {
                        ...payload.result!.shot,
                        imageStatus: payload.result!.shot.startImageUrl ? "ready" : "idle"
                      }
                    : currentShot
                )
              }
            : current
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to generate starting image.";

        setShotlist((current) =>
          current
            ? {
                ...current,
                shots: current.shots.map((currentShot) =>
                  currentShot.id === shot.id
                    ? {
                        ...currentShot,
                        imageStatus: "error",
                        imageError: message
                      }
                    : currentShot
                )
              }
            : current
        );
      }
    }

    if (runId === imageGenerationRunId.current) {
      setIsGeneratingImages(false);
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

      <section className="grid gap-8 px-5 py-8 md:px-10 lg:grid-cols-[420px_minmax(0,1fr)] lg:px-14">
        <div className="grid content-start gap-5">
          <ProductIntake
            brief={brief}
            error={miroError}
            isGenerating={isCreatingBoard}
            onBriefChange={setBrief}
            onCreateMiroBoard={() => createMiroBoard()}
          />
        </div>

        <div className="grid content-start gap-5">
          <MiroPanel
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

          <ShotlistWorkspace
            isCreatingVideo={isCreatingVideo}
            isGeneratingImages={isGeneratingImages}
            isLoading={isCreatingShotlist}
            onCreateVideo={createVideo}
            shotlist={shotlist}
          />

          <VideoPanel
            error={videoError}
            isCreating={isCreatingVideo}
            result={videoResult}
          />
        </div>
      </section>
    </main>
  );
}

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

const workflowTabs: { id: WorkflowStage; label: string }[] = [
  { id: "intake", label: "Product Intake" },
  { id: "miro", label: "Miro Board" },
  { id: "image-shotlist", label: "Image Shotlist" },
  { id: "video", label: "Video" }
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
  const [showExistingBoardInput, setShowExistingBoardInput] = useState(false);
  const [miroError, setMiroError] = useState<string | null>(null);
  const [shotlistError, setShotlistError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const imageGenerationRunId = useRef(0);

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
            miroImageUrls,
            imagePrompt: shot.imagePrompt
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

  async function regenerateShotImage(shotId: string, imagePrompt: string) {
    if (!shotlist) {
      return;
    }

    const boardImageUrls = imageShotlistResult?.boardContext.imageUrls ?? [];
    const requestShotlist = {
      ...shotlist,
      shots: shotlist.shots.map((shot) =>
        shot.id === shotId
          ? {
              ...shot,
              imagePrompt
            }
          : shot
      )
    };

    setShotlist((current) =>
      current
        ? {
            ...current,
            shots: current.shots.map((shot) =>
              shot.id === shotId
                ? {
                    ...shot,
                    imagePrompt,
                    imageStatus: "running",
                    imageError: undefined
                  }
                : shot
            )
          }
        : current
    );

    try {
      const response = await fetch("/api/shotlist/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shotlist: requestShotlist,
          shotId,
          photos: brief.photos,
          miroImageUrls: boardImageUrls,
          imagePrompt
        })
      });
      const payload = (await response.json()) as {
        result?: { shot: Shotlist["shots"][number]; status: "mocked" | "created"; message: string };
        error?: string;
      };

      if (!response.ok || !payload.result) {
        throw new Error(payload.error ?? "Unable to regenerate starting image.");
      }

      setShotlist((current) =>
        current
          ? {
              ...current,
              shots: current.shots.map((shot) =>
                shot.id === shotId
                  ? {
                      ...payload.result!.shot,
                      imageStatus: payload.result!.shot.startImageUrl ? "ready" : "idle"
                    }
                  : shot
              )
            }
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
                  ? {
                      ...shot,
                      imageStatus: "error",
                      imageError: message
                    }
                  : shot
              )
            }
          : current
      );
    }
  }

  async function createVideo() {
    if (!shotlist) {
      return;
    }

    setActiveStage("video");
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
      <WorkflowHeader />

      <section className="px-3 py-5 md:px-6 lg:px-8">
        <div className="mx-auto max-w-[1800px]">
          <div className="flex w-full items-end gap-0 pl-2">
            {workflowTabs.map((tab) => {
              const isActive = tab.id === activeStage;

              return (
                <button
                  className={`relative min-h-16 flex-1 whitespace-nowrap rounded-t-xl border-2 px-3 text-base font-black transition sm:flex-none sm:px-7 sm:text-lg ${
                    isActive
                      ? "top-px z-10 border-stone-300 border-b-white bg-white text-[#1d2528]"
                      : "top-[7px] border-stone-300 bg-[#d9cfbf] text-[#1d2528] hover:bg-[#e7dfd2]"
                  }`}
                  key={tab.id}
                  onClick={() => setActiveStage(tab.id)}
                  type="button"
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="relative -mt-px min-h-[calc(100vh-150px)] rounded-lg rounded-tl-none border border-stone-300 bg-white p-3 shadow-[0_18px_60px_rgba(29,37,40,0.12)] md:p-5">
            <div className={activeStage === "intake" ? "" : "hidden"}>
              <ProductIntake
                brief={brief}
                error={miroError}
                isGenerating={isCreatingBoard}
                onBriefChange={setBrief}
                onCreateMiroBoard={() => createMiroBoard()}
              />
            </div>

            <div className={activeStage === "miro" ? "grid content-start gap-5" : "hidden"}>
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
            </div>

            <div className={activeStage === "image-shotlist" ? "grid content-start gap-5" : "hidden"}>
              <ShotlistWorkspace
                error={shotlistError}
                isCreatingVideo={isCreatingVideo}
                isGeneratingImages={isGeneratingImages}
                isLoading={isCreatingShotlist}
                onCreateVideo={createVideo}
                onRegenerateShotImage={regenerateShotImage}
                shotlist={shotlist}
              />
            </div>

            <div className={activeStage === "video" ? "grid content-start gap-5" : "hidden"}>
              <VideoPanel error={videoError} isCreating={isCreatingVideo} result={videoResult} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

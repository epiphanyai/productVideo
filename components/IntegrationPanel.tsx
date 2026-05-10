"use client";

import { MiroPanel } from "@/components/MiroPanel";
import { VideoPanel } from "@/components/VideoPanel";
import type { MiroBoardResult, Shotlist, VideoJobResult } from "@/lib/workflow/types";

type IntegrationPanelProps = {
  miroResult: MiroBoardResult | null;
  videoResult: VideoJobResult | null;
  shotlist: Shotlist | null;
  isMiroConnected: boolean;
  isRoutingToMiro: boolean;
  isCreatingVideo: boolean;
  miroBoardUrl: string;
  miroError: string | null;
  videoError: string | null;
  onMiroBoardUrlChange: (value: string) => void;
  onRouteToMiro: () => void;
  onCreateVideo: () => void;
};

export function IntegrationPanel({
  miroResult,
  videoResult,
  shotlist,
  isMiroConnected,
  isRoutingToMiro,
  isCreatingVideo,
  miroBoardUrl,
  miroError,
  videoError,
  onMiroBoardUrlChange,
  onRouteToMiro,
  onCreateVideo
}: IntegrationPanelProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <MiroPanel
        error={miroError}
        isConnected={isMiroConnected}
        isRouting={isRoutingToMiro}
        miroBoardUrl={miroBoardUrl}
        onMiroBoardUrlChange={onMiroBoardUrlChange}
        onRouteToMiro={onRouteToMiro}
        result={miroResult}
        shotlist={shotlist}
      />
      <VideoPanel
        error={videoError}
        isCreating={isCreatingVideo}
        onCreateVideo={onCreateVideo}
        result={videoResult}
        shotlist={shotlist}
      />
    </section>
  );
}

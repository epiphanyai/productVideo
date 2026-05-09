import type { ProductPhoto, Shotlist, VideoJobResult } from "@/lib/workflow/types";

export async function createVideoFromShotlist(
  shotlist: Shotlist,
  photos: ProductPhoto[]
): Promise<VideoJobResult> {
  const jobId = `video-${Date.now()}`;

  if (!process.env.VIDEO_GENERATION_ENDPOINT) {
    return {
      jobId,
      status: "mocked",
      previewUrl: null,
      message: `Mock video job assembled from ${shotlist.shots.length} shots and ${photos.length} product photos.`
    };
  }

  return {
    jobId,
    status: "queued",
    previewUrl: null,
    message:
      "Video generation endpoint detected. Swap this adapter to call the selected video model or orchestration service."
  };
}

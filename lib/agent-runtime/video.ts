import { fal } from "@fal-ai/client";
import { configureFal, uploadDataUrlToFalStorage } from "@/lib/agent-runtime/fal-assets";
import type { ProductPhoto, Shotlist, VideoJobResult } from "@/lib/workflow/types";

const draftModel = "fal-ai/wan-i2v";
const endFrameDraftModel = "fal-ai/wan/v2.7/image-to-video";
const mergeModel = "fal-ai/ffmpeg-api/merge-videos";

export async function createVideoFromShotlist(
  shotlist: Shotlist,
  photos: ProductPhoto[]
): Promise<VideoJobResult> {
  const jobId = `video-${Date.now()}`;

  try {
    configureFal();
  } catch {
    return {
      jobId,
      status: "mocked",
      previewUrl: null,
      message: "FAL_API_KEY is not configured. Video generation stayed in mock mode."
    };
  }

  const referencePhoto = findReferencePhoto(shotlist, photos);
  const hasGeneratedShotImages = shotlist.shots.some((shot) => Boolean(shot.startImageUrl));

  if (!referencePhoto && !hasGeneratedShotImages) {
    throw new Error("Create generated shot images or add at least one product photo before creating a fal video draft.");
  }

  const uploadedPhotos = new Map<string, string>();
  const clips = await Promise.all(
    shotlist.shots.map(async (shot, index) => {
      const shotPhoto = findReferencePhoto({ ...shotlist, shots: [shot] }, photos) ?? referencePhoto;
      const referenceImageUrl =
        shot.startImageUrl ?? (shotPhoto ? await getCachedFalImageUrl(shotPhoto, uploadedPhotos) : null);

      if (!referenceImageUrl) {
        throw new Error(`Shot ${index + 1} does not have a generated starting image or product photo fallback.`);
      }

      const prompt = buildShotPrompt(shotlist, shot, index);
      const usesEndFrame = Boolean(shot.useEndImage && shot.endImageUrl);
      const result = await createShotVideo({
        endImageUrl: usesEndFrame ? shot.endImageUrl : undefined,
        prompt,
        referenceImageUrl,
        shotIndex: index,
        title: shot.title,
        durationSeconds: shot.durationSeconds
      });
      const previewUrl = findVideoUrl(result.data);

      if (!previewUrl) {
        throw new Error(`fal completed shot ${index + 1} but did not return a video URL.`);
      }

      return {
        id: result.requestId ?? `${jobId}-${shot.id}`,
        title: shot.title,
        durationSeconds: shot.durationSeconds,
        previewUrl
      };
    })
  );
  const merged = await fal.subscribe(mergeModel, {
    input: {
      video_urls: clips.map((clip) => clip.previewUrl),
      resolution: "landscape_16_9",
      target_fps: 16
    },
    logs: true
  });
  const previewUrl = findFileUrl(merged.data, "video") ?? findVideoUrl(merged.data);

  if (!previewUrl) {
    throw new Error("fal completed the merged video job but did not return a video URL.");
  }

  return {
    jobId: merged.requestId ?? jobId,
    status: "created",
    previewUrl,
    targetDurationSeconds: shotlist.targetDurationSeconds,
    message: `Fal draft video created from ${clips.length} merged shots.`
  };
}

async function createShotVideo({
  durationSeconds,
  endImageUrl,
  prompt,
  referenceImageUrl,
  shotIndex,
  title
}: {
  durationSeconds: number;
  endImageUrl?: string;
  prompt: string;
  referenceImageUrl: string;
  shotIndex: number;
  title: string;
}) {
  if (endImageUrl) {
    try {
      return await fal.subscribe(endFrameDraftModel, {
        input: {
          image_url: referenceImageUrl,
          end_image_url: endImageUrl,
          prompt,
          resolution: "720p",
          duration: toWan27Duration(durationSeconds)
        },
        logs: true
      });
    } catch (error) {
      console.warn(
        `End-frame video generation failed for shot ${shotIndex + 1} (${title}); falling back to start-image video.`,
        formatFalVideoError(error)
      );
    }
  }

  try {
    return await fal.subscribe(draftModel, {
      input: {
        image_url: referenceImageUrl,
        prompt,
        resolution: "480p",
        aspect_ratio: "auto",
        enable_prompt_expansion: true,
        num_frames: 81
      },
      logs: true
    });
  } catch (error) {
    throw new Error(`Shot ${shotIndex + 1} video generation failed: ${formatFalVideoError(error)}`);
  }
}

function findFileUrl(value: unknown, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const file = (value as Record<string, unknown>)[key];

  if (!file || typeof file !== "object" || Array.isArray(file)) {
    return null;
  }

  const url = (file as Record<string, unknown>).url;

  return typeof url === "string" ? url : null;
}

function findReferencePhoto(shotlist: Shotlist, photos: ProductPhoto[]) {
  const assetNames = new Set(shotlist.shots.flatMap((shot) => shot.assets).map((asset) => asset.toLowerCase()));

  return photos.find((photo) => assetNames.has(photo.name.toLowerCase())) ?? photos[0] ?? null;
}

async function getFalImageUrl(photo: ProductPhoto) {
  if (!photo.url.startsWith("data:")) {
    return photo.url;
  }

  return uploadDataUrlToFalStorage(photo.url);
}

function clampVideoDuration(durationSeconds: number) {
  return Math.max(2, Math.min(15, Math.round(durationSeconds)));
}

function toWan27Duration(durationSeconds: number) {
  return String(clampVideoDuration(durationSeconds)) as
    | "2"
    | "3"
    | "4"
    | "5"
    | "6"
    | "7"
    | "8"
    | "9"
    | "10"
    | "11"
    | "12"
    | "13"
    | "14"
    | "15";
}

function formatFalVideoError(error: unknown) {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const details = error as Error & {
    body?: unknown;
    response?: { status?: number; statusText?: string; body?: unknown };
    status?: number;
  };
  const body = details.body ?? details.response?.body;
  const status = details.status ?? details.response?.status;
  const statusText = details.response?.statusText;

  return [status ? `HTTP ${status}` : "", statusText ?? "", error.message, body ? JSON.stringify(body) : ""]
    .filter(Boolean)
    .join(" ");
}

async function getCachedFalImageUrl(photo: ProductPhoto, uploadedPhotos: Map<string, string>) {
  const cachedUrl = uploadedPhotos.get(photo.id);

  if (cachedUrl) {
    return cachedUrl;
  }

  const url = await getFalImageUrl(photo);
  uploadedPhotos.set(photo.id, url);

  return url;
}

function buildShotPrompt(shotlist: Shotlist, shot: Shotlist["shots"][number], index: number) {
  return [
    `Create shot ${index + 1} of ${shotlist.shots.length} for a product video about ${shotlist.productName}.`,
    `Concept: ${shotlist.concept}`,
    `Shot title: ${shot.title}`,
    `Shot prompt: ${shot.videoPrompt?.trim() || shot.prompt}`,
    `Motion: ${shot.motion}`,
    `Framing: ${shot.framing}`,
    "Generate only this shot as a clean, usable product-video clip."
  ].join("\n");
}

function findVideoUrl(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return isVideoUrl(value) ? value : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const url = findVideoUrl(item);

      if (url) {
        return url;
      }
    }

    return null;
  }

  if (typeof value === "object") {
    for (const [key, nestedValue] of Object.entries(value)) {
      if (key === "url" && typeof nestedValue === "string") {
        if (isVideoUrl(nestedValue)) {
          return nestedValue;
        }

        continue;
      }

      const url = findVideoUrl(nestedValue);

      if (url) {
        return url;
      }
    }
  }

  return null;
}

function isVideoUrl(value: string) {
  return /\.(mp4|mov|webm)(\?|$)/i.test(value);
}

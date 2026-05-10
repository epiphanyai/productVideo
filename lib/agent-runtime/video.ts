import { fal } from "@fal-ai/client";
import type { ProductPhoto, Shotlist, VideoJobResult } from "@/lib/workflow/types";

const draftModel = "fal-ai/wan-i2v";
const mergeModel = "fal-ai/ffmpeg-api/merge-videos";

export async function createVideoFromShotlist(
  shotlist: Shotlist,
  photos: ProductPhoto[]
): Promise<VideoJobResult> {
  const jobId = `video-${Date.now()}`;
  const credentials = process.env.FAL_API_KEY?.trim() || process.env.FAL_KEY?.trim();

  if (!credentials) {
    return {
      jobId,
      status: "mocked",
      previewUrl: null,
      message: "FAL_API_KEY is not configured. Video generation stayed in mock mode."
    };
  }

  const referencePhoto = findReferencePhoto(shotlist, photos);

  if (!referencePhoto) {
    throw new Error("Add at least one product photo before creating a fal video draft.");
  }

  fal.config({ credentials });

  const uploadedPhotos = new Map<string, string>();
  const clips = await Promise.all(
    shotlist.shots.map(async (shot, index) => {
      const shotPhoto = findReferencePhoto({ ...shotlist, shots: [shot] }, photos) ?? referencePhoto;
      const referenceImageUrl = await getCachedFalImageUrl(shotPhoto, uploadedPhotos);
      const prompt = buildShotPrompt(shotlist, shot, index);
      const result = await fal.subscribe(draftModel, {
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

  return fal.storage.upload(dataUrlToBlob(photo.url), {
    lifecycle: {
      expiresIn: "1d"
    }
  });
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

function dataUrlToBlob(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,(.*)$/);

  if (!match) {
    throw new Error("Uploaded product photo is not a valid data URL.");
  }

  const contentType = match[1] || "application/octet-stream";
  const isBase64 = Boolean(match[2]);
  const data = isBase64 ? Buffer.from(match[3], "base64") : Buffer.from(decodeURIComponent(match[3]));

  return new Blob([data], { type: contentType });
}

function buildShotPrompt(shotlist: Shotlist, shot: Shotlist["shots"][number], index: number) {
  return [
    `Create shot ${index + 1} of ${shotlist.shots.length} for a product video about ${shotlist.productName}.`,
    `Concept: ${shotlist.concept}`,
    `Shot title: ${shot.title}`,
    `Shot prompt: ${shot.prompt}`,
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
        return nestedValue;
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

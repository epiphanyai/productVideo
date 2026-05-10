import { fal } from "@fal-ai/client";
import type { ProductPhoto, Shotlist, VideoJobResult } from "@/lib/workflow/types";

const draftModel = "fal-ai/wan-i2v";

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

  const referenceImageUrl = await getFalImageUrl(referencePhoto);
  const prompt = buildVideoPrompt(shotlist);
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
    throw new Error("fal completed the video job but did not return a video URL.");
  }

  return {
    jobId: result.requestId ?? jobId,
    status: "created",
    previewUrl,
    message: `Fal draft video created from ${shotlist.shots.length} shots and ${photos.length} product photos.`
  };
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

function buildVideoPrompt(shotlist: Shotlist) {
  const shotDirections = shotlist.shots
    .map((shot, index) => `${index + 1}. ${shot.title}: ${shot.prompt} Motion: ${shot.motion}. Framing: ${shot.framing}.`)
    .join("\n");

  return [
    `Create a short product video for ${shotlist.productName}.`,
    `Concept: ${shotlist.concept}`,
    "Follow this shot plan as one cohesive draft:",
    shotDirections
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

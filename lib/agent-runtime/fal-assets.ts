import { fal } from "@fal-ai/client";

export function configureFal() {
  const credentials = process.env.FAL_API_KEY?.trim() || process.env.FAL_KEY?.trim();

  if (!credentials) {
    throw new Error("FAL_API_KEY is not configured.");
  }

  fal.config({ credentials });
}

export async function uploadDataUrlToFalStorage(dataUrl: string) {
  return uploadBlobToFalStorage(dataUrlToBlob(dataUrl));
}

export async function uploadBlobToFalStorage(blob: Blob) {
  return fal.storage.upload(blob, {
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

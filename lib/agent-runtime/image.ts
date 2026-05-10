import { fal } from "@fal-ai/client";
import sharp from "sharp";
import { configureFal, uploadBlobToFalStorage } from "@/lib/agent-runtime/fal-assets";
import type { ProductPhoto, Shot, Shotlist } from "@/lib/workflow/types";

const imageModel = "fal-ai/kling-image/v3/image-to-image";
const maxReferenceImages = 1;

type GenerateShotImagesOptions = {
  photos: ProductPhoto[];
  miroImageUrls: string[];
};

type GenerateShotImageOptions = GenerateShotImagesOptions & {
  shotlist: Shotlist;
  shotId: string;
  imagePrompt?: string;
  imageKind?: "start" | "end";
};

export async function generateStartingImagesForShotlist(
  shotlist: Shotlist,
  options: GenerateShotImagesOptions
): Promise<{ shotlist: Shotlist; status: "mocked" | "created"; message: string }> {
  const referenceValues = [...options.photos.map((photo) => photo.url), ...options.miroImageUrls];

  try {
    configureFal();
  } catch {
    const references = referenceValues
      .map((url) => url.trim())
      .filter((url) => url && !url.startsWith("data:"))
      .filter(isUsableImageUrl)
      .slice(0, maxReferenceImages);

    return {
      shotlist: attachMockImagePrompts(shotlist, references),
      status: "mocked",
      message: "FAL_API_KEY is not configured. Starting-image generation stayed in mock mode."
    };
  }

  const references = await normalizeImageReferences(referenceValues);

  if (!references.length) {
    return {
      shotlist: attachMockImagePrompts(shotlist, []),
      status: "mocked",
      message: "No product photos or Miro image references were available, so image generation was skipped."
    };
  }

  const shots = await Promise.all(
    shotlist.shots.map(async (shot, index) => {
      return generateStartingImageForNormalizedReferences(shotlist, shot.id, references, index);
    })
  );

  return {
    shotlist: {
      ...shotlist,
      shots
    },
    status: "created",
    message: `Fal generated ${shots.length} starting image${shots.length === 1 ? "" : "s"} from Miro and product references.`
  };
}

export async function generateStartingImageForShot(
  options: GenerateShotImageOptions
): Promise<{ shot: Shot; status: "mocked" | "created"; message: string }> {
  const shot = options.shotlist.shots.find((candidate) => candidate.id === options.shotId);
  const imageKind = options.imageKind ?? "start";

  if (!shot) {
    throw new Error(`Shot ${options.shotId} was not found.`);
  }

  const referenceValues = [
    ...(imageKind === "end" && shot.startImageUrl ? [shot.startImageUrl] : []),
    ...options.photos.map((photo) => photo.url),
    ...options.miroImageUrls
  ];
  const shotIndex = options.shotlist.shots.findIndex((candidate) => candidate.id === options.shotId);

  try {
    configureFal();
  } catch {
    const references = referenceValues
      .map((url) => url.trim())
      .filter((url) => url && !url.startsWith("data:"))
      .filter(isUsableImageUrl)
      .slice(0, maxReferenceImages);
    const sourceImageUrls = selectShotReferences(shot, references);

    return {
      shot: {
        ...shot,
        ...(imageKind === "end"
          ? {
              endImagePrompt: options.imagePrompt?.trim() || buildEndImagePrompt(options.shotlist, shot, shotIndex),
              endImageUrl: sourceImageUrls[0],
              useEndImage: true
            }
          : {
              imagePrompt: options.imagePrompt?.trim() || buildImagePrompt(options.shotlist, shot, shotIndex),
              startImageUrl: sourceImageUrls[0]
            }),
        sourceImageUrls,
      },
      status: "mocked",
      message: "FAL_API_KEY is not configured. Starting-image generation stayed in mock mode."
    };
  }

  const references = await normalizeImageReferences(referenceValues);

  if (!references.length) {
    return {
      shot: {
        ...shot,
        ...(imageKind === "end"
          ? {
              endImagePrompt: options.imagePrompt?.trim() || buildEndImagePrompt(options.shotlist, shot, shotIndex),
              useEndImage: true
            }
          : {
              imagePrompt: options.imagePrompt?.trim() || buildImagePrompt(options.shotlist, shot, shotIndex)
            }),
        sourceImageUrls: []
      },
      status: "mocked",
      message: "No usable image references were available for this shot."
    };
  }

  return {
    shot: await generateStartingImageForNormalizedReferences(
      options.shotlist,
      options.shotId,
      references,
      shotIndex,
      options.imagePrompt,
      imageKind
    ),
    status: "created",
    message: `Fal generated a starting image for ${shot.title}.`
  };
}

async function normalizeImageReferences(urls: string[]) {
  const uploaded = new Map<string, string>();
  const normalized = await Promise.all(
    urls
      .map((url) => url.trim())
      .filter(Boolean)
      .map(async (url) => {
        const cached = uploaded.get(url);
        if (cached) {
          return cached;
        }

        const uploadedUrl = await normalizeReferenceImageToFalStorage(url);
        uploaded.set(url, uploadedUrl);

        return uploadedUrl;
      })
  );

  return Array.from(new Set(normalized.filter(isUsableImageUrl))).slice(0, maxReferenceImages);
}

async function normalizeReferenceImageToFalStorage(url: string) {
  const response = url.startsWith("data:")
    ? await fetch(url)
    : await fetch(url, {
        headers: {
          Accept: "image/*"
        }
      });

  if (!response.ok) {
    throw new Error(`Unable to fetch image reference (${response.status}).`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType && !contentType.startsWith("image/") && !url.startsWith("data:")) {
    throw new Error(`Reference URL did not return an image (${contentType}).`);
  }

  const source = Buffer.from(await response.arrayBuffer());
  const normalized = await sharp(source, { failOn: "none" })
    .rotate()
    .resize({
      width: 1280,
      height: 720,
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .png({
      compressionLevel: 9,
      palette: false
    })
    .toBuffer();

  return uploadBlobToFalStorage(new Blob([new Uint8Array(normalized)], { type: "image/png" }));
}

function attachMockImagePrompts(shotlist: Shotlist, references: string[]): Shotlist {
  return {
    ...shotlist,
    shots: shotlist.shots.map((shot, index) => {
      const sourceImageUrls = selectShotReferences(shot, references);

      return {
        ...shot,
        imagePrompt: buildImagePrompt(shotlist, shot, index),
        sourceImageUrls,
        startImageUrl: sourceImageUrls[0]
      };
    })
  };
}

async function generateStartingImageForNormalizedReferences(
  shotlist: Shotlist,
  shotId: string,
  references: string[],
  shotIndex: number,
  imagePromptOverride?: string,
  imageKind: "start" | "end" = "start"
) {
  const shot = shotlist.shots.find((candidate) => candidate.id === shotId);

  if (!shot) {
    throw new Error(`Shot ${shotId} was not found.`);
  }

  const sourceImageUrls = selectShotReferences(shot, references);
  const imagePrompt =
    imagePromptOverride?.trim() ||
    (imageKind === "end"
      ? shot.endImagePrompt?.trim() || buildEndImagePrompt(shotlist, shot, shotIndex)
      : shot.imagePrompt?.trim() || buildImagePrompt(shotlist, shot, shotIndex));
  const failures: string[] = [];

  for (const sourceImageUrl of sourceImageUrls) {
    try {
      const payload = {
        image_url: sourceImageUrl,
        prompt: imagePrompt.slice(0, 2500),
        aspect_ratio: "16:9",
        num_images: 1,
        output_format: "png",
        resolution: "1K"
      };
      const result = await fal.subscribe(imageModel as Parameters<typeof fal.subscribe>[0], {
        input: payload,
        logs: true
      } as Parameters<typeof fal.subscribe>[1]);
      const startImageUrl = findImageUrl(result.data);

      if (!startImageUrl) {
        failures.push("fal completed but did not return an image URL");
        continue;
      }

      return {
        ...shot,
        ...(imageKind === "end"
          ? {
              endImagePrompt: imagePrompt,
              endImageUrl: startImageUrl,
              useEndImage: true
            }
          : {
              imagePrompt,
              startImageUrl
            }),
        sourceImageUrls,
      };
    } catch (error) {
      failures.push(formatFalImageError(error));
    }
  }

  throw new Error(
    `Unable to generate a ${imageKind} image for ${shot.title}. Tried ${sourceImageUrls.length} reference image${
      sourceImageUrls.length === 1 ? "" : "s"
    }. Last error: ${failures.at(-1) ?? "unknown"}`
  );
}

function formatFalImageError(error: unknown) {
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
  const parts = [status ? `HTTP ${status}` : "", statusText ?? "", error.message, body ? JSON.stringify(body) : ""]
    .filter(Boolean)
    .join(" ");

  return parts || error.message;
}

function selectShotReferences(shot: Shot, references: string[]) {
  if (!references.length) {
    return [];
  }

  const assetHints = shot.assets.map((asset) => asset.toLowerCase());
  const matched = references.filter((url) => assetHints.some((asset) => url.toLowerCase().includes(asset)));
  const selected = matched.length ? matched : references;

  return selected.slice(0, maxReferenceImages);
}

function buildImagePrompt(shotlist: Shotlist, shot: Shot, index: number) {
  return [
    `Create the first frame for shot ${index + 1} of ${shotlist.shots.length} in a product video for ${shotlist.productName}.`,
    `Overall concept: ${shotlist.concept}`,
    `Shot title: ${shot.title}`,
    `Visual action: ${shot.prompt}`,
    `Framing: ${shot.framing}`,
    `Motion cue to set up: ${shot.motion}`,
    "Generate a clean 16:9 product-video starting image that can be used as an image-to-video reference."
  ].join("\n");
}

function buildEndImagePrompt(shotlist: Shotlist, shot: Shot, index: number) {
  return [
    `Create the final frame for shot ${index + 1} of ${shotlist.shots.length} in a product video for ${shotlist.productName}.`,
    `Overall concept: ${shotlist.concept}`,
    `Shot title: ${shot.title}`,
    `Visual action: ${shot.prompt}`,
    `Framing: ${shot.framing}`,
    `Motion to complete: ${shot.motion}`,
    "Show the product after the rotation, orbit, or turn has completed. Preserve hidden markings, face details, eyes, logos, and character features from the product reference.",
    "Generate a clean 16:9 product-video ending image that can be used as an image-to-video end frame."
  ].join("\n");
}

function findImageUrl(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return isImageUrl(value) ? value : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const url = findImageUrl(item);

      if (url) {
        return url;
      }
    }

    return null;
  }

  if (typeof value === "object") {
    for (const [key, nestedValue] of Object.entries(value)) {
      if (key === "url" && typeof nestedValue === "string") {
        if (isImageUrl(nestedValue)) {
          return nestedValue;
        }

        continue;
      }

      const url = findImageUrl(nestedValue);

      if (url) {
        return url;
      }
    }
  }

  return null;
}

function isUsableImageUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:");
}

function isImageUrl(value: string) {
  return /\.(png|jpe?g|webp|gif)(\?|$)/i.test(value) || /fal\.media|fal-ai|storage/i.test(value);
}

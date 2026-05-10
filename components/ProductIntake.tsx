"use client";

import { ImagePlus, Loader2, WandSparkles } from "lucide-react";
import { useState } from "react";
import { videoStyles } from "@/lib/workflow/styles";
import type { ProductBrief, ProductPhoto, VideoStyleId } from "@/lib/workflow/types";

type ProductIntakeProps = {
  brief: ProductBrief;
  error: string | null;
  isGenerating: boolean;
  onBriefChange: (brief: ProductBrief) => void;
  onGenerateShotlist: () => void;
};

export function ProductIntake({
  brief,
  error,
  isGenerating,
  onBriefChange,
  onGenerateShotlist
}: ProductIntakeProps) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);

  function updateBrief(update: Partial<ProductBrief>) {
    onBriefChange({ ...brief, ...update });
  }

  async function handlePhotoUpload(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    setIsUploadingPhotos(true);
    setUploadError(null);

    try {
      const photos: ProductPhoto[] = await Promise.all(
        Array.from(files).map(async (file) => {
          const id = `${file.name}-${file.lastModified}`;
          const formData = new FormData();

          formData.set("id", id);
          formData.set("file", file);

          const response = await fetch("/api/assets", {
            method: "POST",
            body: formData
          });
          const payload = (await response.json()) as { photo?: ProductPhoto; error?: string };

          if (!response.ok || !payload.photo) {
            throw new Error(payload.error ?? `Unable to upload ${file.name}.`);
          }

          return payload.photo;
        })
      );

      updateBrief({ photos: [...brief.photos, ...photos] });
    } catch (uploadFailure) {
      setUploadError(uploadFailure instanceof Error ? uploadFailure.message : "Unable to upload product photos.");
    } finally {
      setIsUploadingPhotos(false);
    }
  }

  return (
    <section className="rounded-lg border border-stone-300 bg-white shadow-[0_18px_60px_rgba(29,37,40,0.12)]">
      <div className="border-b border-stone-300 p-5">
        <h2 className="text-lg font-bold text-[#1d2528]">Product Intake</h2>
        <p className="mt-1 text-sm leading-6 text-[#647174]">
          Describe the product, add source photos, and choose the video style the agent should plan around.
        </p>
      </div>

      <div className="grid gap-4 p-5">
        <label className="grid gap-2">
          <span className="text-sm font-bold">Product name</span>
          <input
            className="min-h-11 rounded-lg border border-stone-300 bg-[#f8faf8] px-3 outline-none focus:border-[#2f6f63]"
            onChange={(event) => updateBrief({ productName: event.target.value })}
            placeholder="e.g. Ember travel mug"
            value={brief.productName}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold">Product description</span>
          <textarea
            className="min-h-32 resize-y rounded-lg border border-stone-300 bg-[#f8faf8] px-3 py-3 outline-none focus:border-[#2f6f63]"
            onChange={(event) => updateBrief({ description: event.target.value })}
            placeholder="What it is, why it matters, primary features, materials, use cases, and any must-show details."
            value={brief.description}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold">Audience</span>
          <input
            className="min-h-11 rounded-lg border border-stone-300 bg-[#f8faf8] px-3 outline-none focus:border-[#2f6f63]"
            onChange={(event) => updateBrief({ audience: event.target.value })}
            placeholder="e.g. busy commuters, new parents, office teams"
            value={brief.audience}
          />
        </label>

        <div className="grid gap-2">
          <span className="text-sm font-bold">Video style</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {videoStyles.map((style) => {
              const selected = style.id === brief.style;

              return (
                <button
                  className={`min-h-24 rounded-lg border p-3 text-left transition ${
                    selected
                      ? "border-[#2f6f63] bg-[#eef4ef] shadow-[inset_0_0_0_1px_#2f6f63]"
                      : "border-stone-300 bg-[#f8faf8] hover:border-[#2f6f63]"
                  }`}
                  key={style.id}
                  onClick={() => updateBrief({ style: style.id as VideoStyleId })}
                  type="button"
                >
                  <strong className="block text-sm">{style.label}</strong>
                  <span className="mt-1 block text-xs leading-5 text-[#647174]">{style.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        <label className="grid min-h-32 cursor-pointer place-items-center rounded-lg border border-dashed border-[#9aa89f] bg-[#eef4ef] p-5 text-center">
          <input
            accept="image/*"
            className="hidden"
            disabled={isUploadingPhotos}
            multiple
            onChange={(event) => handlePhotoUpload(event.target.files)}
            type="file"
          />
          <ImagePlus className="mb-2 text-[#2f6f63]" size={28} />
          <span className="text-sm font-bold">
            {isUploadingPhotos ? "Uploading product photos" : "Upload product photos"}
          </span>
          <span className="text-xs leading-5 text-[#647174]">Use angles, details, packaging, and lifestyle references.</span>
        </label>

        {brief.photos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {brief.photos.map((photo) => (
              <div
                aria-label={photo.name}
                className="aspect-square rounded-lg border border-stone-300 bg-cover bg-center"
                key={photo.id}
                style={{ backgroundImage: `url(${photo.url})` }}
                title={photo.name}
              />
            ))}
          </div>
        ) : null}

        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#2f6f63] px-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-55"
          disabled={isGenerating || isUploadingPhotos || !brief.description.trim()}
          onClick={onGenerateShotlist}
          type="button"
        >
          {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <WandSparkles size={18} />}
          Create Shotlist
        </button>
        {uploadError ? (
          <div className="rounded-lg border border-[#c96b6b] bg-[#fff6f3] p-3 text-sm leading-6 text-[#8a2e2e]">
            {uploadError}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-[#c96b6b] bg-[#fff6f3] p-3 text-sm leading-6 text-[#8a2e2e]">
            {error}
          </div>
        ) : null}
      </div>
    </section>
  );
}


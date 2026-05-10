"use client";

import { useState } from "react";
import { videoStyles } from "@/lib/workflow/styles";
import type { ProductBrief, ProductPhoto, VideoStyleId } from "@/lib/workflow/types";

type ProductIntakeProps = {
  brief: ProductBrief;
  error: string | null;
  isGenerating: boolean;
  onBriefChange: (brief: ProductBrief) => void;
  onCreateMiroBoard: () => void;
};

export function ProductIntake({
  brief,
  error,
  isGenerating,
  onBriefChange,
  onCreateMiroBoard
}: ProductIntakeProps) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);

  function updateBrief(update: Partial<ProductBrief>) {
    onBriefChange({ ...brief, ...update });
  }

  async function handlePhotoUpload(files: FileList | null) {
    if (!files?.length) return;

    setIsUploadingPhotos(true);
    setUploadError(null);

    try {
      const photos: ProductPhoto[] = await Promise.all(
        Array.from(files).map(async (file) => {
          const id = `${file.name}-${file.lastModified}`;
          const formData = new FormData();
          formData.set("id", id);
          formData.set("file", file);

          const response = await fetch("/api/assets", { method: "POST", body: formData });
          const payload = (await response.json()) as { photo?: ProductPhoto; error?: string };

          if (!response.ok || !payload.photo) throw new Error(payload.error ?? `Unable to upload ${file.name}.`);

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

  const canAdvance = brief.productName.trim() && brief.description.trim();

  return (
    <section>
      {/* Stage hero */}
      <header className="stage-hero">
        <div>
          <h2>
            Static photos in. <em>Kinetic stories</em> out.
          </h2>
          <p>Tell us about the product. We&apos;ll seed a Miro board your team can collaborate on. Then turn it into shots, images, and a video.</p>
        </div>
        <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
          <span className="tally">
            <span className="tally-dot" />
            READY · PIPE OPEN
          </span>
        </div>
      </header>

      <div className="stage-body">
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.25fr) minmax(340px, 0.75fr)", gap: 28 }}>
          {/* Form card */}
          <div className="card" style={{ padding: 24, display: "grid", gap: 22 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <label className="field-label">
                <span className="field-label-text">Product name</span>
                <input
                  className="input"
                  onChange={(e) => updateBrief({ productName: e.target.value })}
                  placeholder="e.g. Halo Cold Brew Bottle"
                  value={brief.productName}
                />
              </label>
              <label className="field-label">
                <span className="field-label-text">Audience</span>
                <input
                  className="input"
                  onChange={(e) => updateBrief({ audience: e.target.value })}
                  placeholder="who this is for"
                  value={brief.audience}
                />
              </label>
            </div>

            <label className="field-label">
              <span className="field-label-text">Description / story beats</span>
              <textarea
                className="ki-textarea"
                onChange={(e) => updateBrief({ description: e.target.value })}
                placeholder="What it is. Why it exists. The 2–3 things you must show."
                rows={5}
                value={brief.description}
              />
            </label>

            <div className="field-label">
              <span className="field-label-text">Visual register</span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {videoStyles.map((style, i) => {
                  const active = brief.style === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => updateBrief({ style: style.id as VideoStyleId })}
                      style={{
                        textAlign: "left",
                        padding: 14,
                        background: active ? "var(--accent-soft)" : "var(--card)",
                        border: `1px solid ${active ? "var(--accent)" : "var(--hairline)"}`,
                        borderRadius: 8,
                        cursor: "pointer",
                        color: "var(--ink)",
                        transition: "all 160ms ease",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                        <span style={{ fontFamily: "var(--display)", fontWeight: 600, fontSize: 16 }}>{style.label}</span>
                        <span className="mono" style={{ color: active ? "var(--accent)" : "var(--ink-faint)" }}>
                          0{i + 1}
                        </span>
                      </div>
                      <div style={{ fontSize: 12.5, color: "var(--ink-mid)", lineHeight: 1.45 }}>{style.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {(error || uploadError) ? (
              <div style={{ padding: "12px 16px", background: "var(--accent-soft)", border: "1px solid var(--accent)", borderRadius: 8, fontSize: 13.5, color: "var(--accent)" }}>
                {error ?? uploadError}
              </div>
            ) : null}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid var(--hairline-soft)" }}>
              <div className="mono">SEED ON SAVE</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-ghost" type="button">Save draft</button>
                <button
                  className="btn btn-primary"
                  disabled={!canAdvance || isGenerating || isUploadingPhotos}
                  onClick={onCreateMiroBoard}
                  type="button"
                >
                  {isGenerating ? (
                    <>
                      <span style={{ width: 14, height: 14, border: "2px solid rgba(243,235,220,0.3)", borderTopColor: "var(--paper)", borderRadius: 99, animation: "spin 0.8s linear infinite", display: "inline-block" }} />
                      Seeding…
                    </>
                  ) : (
                    "Seed Miro board →"
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
            <div className="card" style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                <span className="field-label-text">Source stills · {brief.photos.length}</span>
              </div>

              <label
                style={{
                  display: "grid", placeItems: "center", gap: 8,
                  padding: 28, borderRadius: 8,
                  border: "1.5px dashed var(--hairline-strong)",
                  background: "var(--paper-2)",
                  cursor: isUploadingPhotos ? "not-allowed" : "pointer",
                  textAlign: "center",
                  opacity: isUploadingPhotos ? 0.6 : 1,
                }}
              >
                <div style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 18 }}>
                  {isUploadingPhotos ? "Uploading…" : "Drop product stills"}
                </div>
                <div className="mono" style={{ color: "var(--ink-dim)" }}>JPG · PNG · WEBP</div>
                <input
                  accept="image/*"
                  disabled={isUploadingPhotos}
                  hidden
                  multiple
                  onChange={(e) => handlePhotoUpload(e.target.files)}
                  type="file"
                />
              </label>

              {brief.photos.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 14 }}>
                  {brief.photos.map((photo) => (
                    <div
                      key={photo.id}
                      style={{
                        aspectRatio: "1/1",
                        borderRadius: 6,
                        border: "1px solid var(--hairline-soft)",
                        backgroundImage: `url(${photo.url})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                      title={photo.name}
                    />
                  ))}
                </div>
              ) : null}
            </div>

            <div className="card-deep" style={{ padding: 18 }}>
              <div className="field-label-text" style={{ marginBottom: 12 }}>What happens next</div>
              <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 12 }}>
                {[
                  ["II",  "Seed → Miro",  "We draft a structured shotlist and push it to a fresh Miro board."],
                  ["III", "Team edits",   "Move shots, drop references, write notes — Miro is the source of truth."],
                  ["IV",  "Render",       "A draft for review. The final cut on request."],
                ].map(([n, t, d]) => (
                  <li key={n} style={{ display: "grid", gridTemplateColumns: "32px 1fr", gap: 10 }}>
                    <span style={{ fontFamily: "var(--serif-italic)", fontStyle: "italic", fontSize: 22, color: "var(--ink-faint)", lineHeight: 1 }}>{n}.</span>
                    <div>
                      <div style={{ fontFamily: "var(--display)", fontWeight: 600, fontSize: 15 }}>{t}</div>
                      <div style={{ color: "var(--ink-mid)", fontSize: 13.5, lineHeight: 1.5 }}>{d}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

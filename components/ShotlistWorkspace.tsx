"use client";

import { useEffect, useState } from "react";
import { getVideoStyleLabel } from "@/lib/workflow/styles";
import type { ProductBrief, Shotlist } from "@/lib/workflow/types";

type ShotlistWorkspaceProps = {
  brief: ProductBrief;
  shotlist: Shotlist | null;
  isLoading: boolean;
  isGeneratingImages: boolean;
  isCreatingVideo: boolean;
  error: string | null;
  onCreateVideo: () => void;
  onRegenerateShotImage: (shotId: string, imagePrompt: string, imageKind?: "start" | "end") => void;
  onToggleEndImage: (shotId: string, enabled: boolean, endImagePrompt?: string) => void;
  onUpdateShotVideoPrompt: (shotId: string, videoPrompt: string) => void;
};

export function ShotlistWorkspace({
  brief,
  shotlist,
  isLoading,
  isGeneratingImages,
  isCreatingVideo,
  error,
  onCreateVideo,
  onRegenerateShotImage,
  onToggleEndImage,
  onUpdateShotVideoPrompt,
}: ShotlistWorkspaceProps) {
  const [selectedShotIndex, setSelectedShotIndex] = useState(0);
  const [promptTab, setPromptTab] = useState<"image" | "video">("image");
  const [selectedImageFrame, setSelectedImageFrame] = useState<"start" | "end">("start");
  const [imagePromptDraft, setImagePromptDraft] = useState("");
  const [endImagePromptDraft, setEndImagePromptDraft] = useState("");
  const [videoPromptDraft, setVideoPromptDraft] = useState("");

  const selectedShot = shotlist?.shots[selectedShotIndex] ?? null;

  useEffect(() => {
    setSelectedShotIndex(0);
  }, [shotlist?.id]);

  useEffect(() => {
    setImagePromptDraft(selectedShot?.imagePrompt || selectedShot?.prompt || "");
    setEndImagePromptDraft(selectedShot?.endImagePrompt || selectedShot?.imagePrompt || selectedShot?.prompt || "");
    setVideoPromptDraft(selectedShot?.videoPrompt || selectedShot?.prompt || "");
    setSelectedImageFrame("start");
  }, [selectedShot?.id, selectedShot?.imagePrompt, selectedShot?.endImagePrompt, selectedShot?.prompt]);

  if (isLoading) return <ShotlistPlaceholder />;

  if (!shotlist || !selectedShot) {
    return (
      <section>
        <header className="stage-hero">
          <div>
            <h2>Image <em>shotlist</em></h2>
            <p>Create it from the current Miro board after collaborators finish editing shots and references.</p>
          </div>
        </header>
        <div className="stage-body" style={{ display: "grid", placeItems: "center", minHeight: 320, textAlign: "center" }}>
          <div>
            <div style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 26, marginBottom: 8 }}>No shotlist yet.</div>
            <div style={{ color: "var(--ink-mid)", marginBottom: error ? 16 : 0 }}>Read the board from the Miro stage to generate a shotlist.</div>
            {error ? (
              <div style={{ marginTop: 12, padding: "12px 16px", background: "var(--accent-soft)", border: "1px solid var(--accent)", borderRadius: 8, fontSize: 13.5, color: "var(--accent)" }}>
                {error}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  const imageIsRunning = selectedShot.imageStatus === "running";
  const endImageIsRunning = selectedShot.endImageStatus === "running";

  // Determine which image to show and its state
  const isEndFrameSelected = selectedImageFrame === "end";
  const hasEndImage = Boolean(selectedShot.useEndImage);

  // activeImageIsEnd is true when we're in end-frame mode AND either the end image exists/is generating
  const activeImageIsEnd = isEndFrameSelected && (hasEndImage || endImageIsRunning);
  const activeImageUrl = activeImageIsEnd ? selectedShot.endImageUrl : selectedShot.startImageUrl;
  const activeImageIsRunning = isEndFrameSelected ? endImageIsRunning : imageIsRunning;

  // End frame CTA: user clicked "Last frame" but no end frame has been requested yet
  const showEndFrameCTA = isEndFrameSelected && !hasEndImage && !endImageIsRunning;

  // First render: image has never been generated before (no URL, currently running)
  const isFirstStartRender = imageIsRunning && !selectedShot.startImageUrl;
  const isFirstEndRender = endImageIsRunning && !selectedShot.endImageUrl;
  const activeIsFirstRender = isEndFrameSelected ? isFirstEndRender : isFirstStartRender;

  const activeImagePromptDraft = activeImageIsEnd ? endImagePromptDraft : imagePromptDraft;
  const imagePromptChanged = imagePromptDraft.trim() && imagePromptDraft.trim() !== (selectedShot.imagePrompt || selectedShot.prompt);
  const endImagePromptChanged = endImagePromptDraft.trim() && endImagePromptDraft.trim() !== (selectedShot.endImagePrompt || selectedShot.imagePrompt || selectedShot.prompt);
  const videoPromptChanged = videoPromptDraft.trim() && videoPromptDraft.trim() !== (selectedShot.videoPrompt || selectedShot.prompt);
  const activeImageError = activeImageIsEnd ? selectedShot.endImageError : selectedShot.imageError;
  const totalDur = shotlist.shots.reduce((a, s) => a + s.durationSeconds, 0);

  return (
    <section>
      {/* Stage hero */}
      <header className="stage-hero">
        <div>
          <h2>
            {brief.productName || "Untitled"}
            <span style={{ color: "var(--ink-faint)" }}> ·</span> <em>shotlist v1</em>
          </h2>
          <p>Spotlight a frame to inspect it. Re-prompt the image. When the cut feels right, send it for video.</p>
        </div>
        <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
          <span className="tally">
            <span className="tally-dot" />
            {shotlist.shots.length} SHOTS · {totalDur.toFixed(1)}s
          </span>
          {isGeneratingImages ? (
            <span className="mono" style={{ color: "var(--accent)" }}>GENERATING IMAGES…</span>
          ) : null}
        </div>
      </header>

      <div className="stage-body">
        {/* Spotlight + detail */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(360px, 0.65fr)", gap: 24, marginBottom: 26 }}>
          {/* Spotlight stage */}
          <div style={{ background: "#0e0a06", borderRadius: 12, overflow: "hidden", position: "relative", boxShadow: "0 16px 36px -12px rgba(28,24,18,0.4)" }}>
            {/* Top bar */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 2, padding: "14px 18px", display: "flex", justifyContent: "space-between", background: "linear-gradient(180deg, rgba(0,0,0,0.55), transparent)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: "var(--accent)", animation: "pulse 1.6s ease-in-out infinite" }} />
                <span className="mono" style={{ color: "#f3ebdc" }}>
                  SHOT {(selectedShotIndex + 1).toString().padStart(2, "0")}/{shotlist.shots.length.toString().padStart(2, "0")}
                </span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <span className="ki-tag" style={{ borderColor: "rgba(243,235,220,0.25)", color: "rgba(243,235,220,0.75)" }}>{selectedShot.framing}</span>
                <span className="ki-tag" style={{ borderColor: "rgba(243,235,220,0.25)", color: "rgba(243,235,220,0.75)" }}>{selectedShot.motion}</span>
              </div>
            </div>

            {/* Image area */}
            <div style={{ position: "relative", aspectRatio: "16/9" }}>
              {activeImageIsRunning ? (
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "#0e0a06" }}>
                  <div style={{ display: "grid", gap: 12, justifyItems: "center" }}>
                    <div style={{ width: 28, height: 28, border: "2px solid rgba(243,235,220,0.2)", borderTopColor: "var(--accent)", borderRadius: 99, animation: "spin 0.8s linear infinite" }} />
                    {/* Only show "RE-RENDERING" text after the first frame has been generated */}
                    {!activeIsFirstRender ? (
                      <span className="mono" style={{ color: "var(--accent)" }}>RE-RENDERING…</span>
                    ) : null}
                  </div>
                </div>
              ) : showEndFrameCTA ? (
                /* No end frame yet — show CTA overlay */
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "#0e0a06" }}>
                  <div style={{ textAlign: "center", maxWidth: 340, padding: "0 24px" }}>
                    <div style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 22, color: "#f3ebdc", marginBottom: 10, lineHeight: 1.2 }}>
                      One frame is usually enough.
                    </div>
                    <div className="mono" style={{ color: "rgba(243,235,220,0.55)", marginBottom: 20, lineHeight: 1.6 }}>
                      If this shot has significant motion or camera movement, render an end frame to anchor the clip.
                    </div>
                    <button
                      className="btn btn-accent"
                      disabled={!endImagePromptDraft.trim()}
                      onClick={() => onToggleEndImage(selectedShot.id, true, endImagePromptDraft)}
                      type="button"
                    >
                      Render end frame →
                    </button>
                  </div>
                </div>
              ) : activeImageUrl ? (
                <img
                  alt={`${selectedShot.title} ${activeImageIsEnd ? "ending" : "starting"} frame`}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  src={activeImageUrl}
                />
              ) : (
                <div className="stripe-ph" style={{ position: "absolute", inset: 0, borderRadius: 0 }}>
                  <span style={{ position: "absolute", top: 10, left: 12 }} className="mono">
                    {selectedImageFrame.toUpperCase()} FRAME · {selectedShot.framing}
                  </span>
                  {activeImageError ? (
                    <span style={{ position: "absolute", bottom: 10, left: 12, color: "rgba(200,53,31,0.9)" }} className="mono">
                      ERROR · {activeImageError}
                    </span>
                  ) : null}
                </div>
              )}
            </div>

            {/* Bottom bar */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 2, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", background: "linear-gradient(0deg, rgba(0,0,0,0.7), transparent)" }}>
              <div style={{ maxWidth: "70%" }}>
                <div className="mono" style={{ color: "rgba(243,235,220,0.55)", marginBottom: 6 }}>SHOT TITLE</div>
                <div style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 28, lineHeight: 1.0, color: "#f3ebdc" }}>{selectedShot.title}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="mono" style={{ color: "rgba(243,235,220,0.55)" }}>DUR · {selectedShot.durationSeconds.toFixed(1)}s</div>
              </div>
            </div>
          </div>

          {/* Detail panel */}
          <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
            <div className="card" style={{ overflow: "hidden" }}>
              {/* Image/Video tabs */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid var(--hairline-soft)" }}>
                {[["image", "Image prompt"], ["video", "Video instructions"]].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPromptTab(id as "image" | "video")}
                    style={{
                      padding: "14px 16px",
                      background: promptTab === id ? "var(--card)" : "var(--paper-2)",
                      border: "none",
                      borderBottom: promptTab === id ? "2px solid var(--accent)" : "2px solid transparent",
                      color: promptTab === id ? "var(--ink)" : "var(--ink-mid)",
                      cursor: "pointer",
                      fontFamily: "var(--display)",
                      fontWeight: 600,
                      fontSize: 14,
                      textAlign: "left" as const,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div style={{ padding: 16, display: "grid", gap: 12 }}>
                {promptTab === "image" ? (
                  <>
                    {/* Frame selector */}
                    <div style={{ display: "flex", gap: 6 }}>
                      {[["start", "First frame"], ["end", "Last frame"]].map(([k, l]) => (
                        <button
                          key={k}
                          onClick={() => setSelectedImageFrame(k as "start" | "end")}
                          className="btn btn-sm"
                          type="button"
                          style={{
                            background: selectedImageFrame === k ? "var(--accent-soft)" : "var(--card)",
                            borderColor: selectedImageFrame === k ? "var(--accent)" : "var(--hairline)",
                            color: selectedImageFrame === k ? "var(--accent)" : "var(--ink-mid)",
                            flex: 1,
                            justifyContent: "center",
                          }}
                        >
                          {l}
                          {k === "end" && hasEndImage ? (
                            <span style={{ width: 5, height: 5, borderRadius: 99, background: "var(--accent)", display: "inline-block", marginLeft: 4 }} />
                          ) : null}
                        </button>
                      ))}
                    </div>

                    {/* Prompt textarea — shown for start frame always, for end frame only when it exists */}
                    {!showEndFrameCTA ? (
                      <textarea
                        className="ki-textarea"
                        rows={5}
                        value={activeImagePromptDraft}
                        onChange={(e) =>
                          isEndFrameSelected ? setEndImagePromptDraft(e.target.value) : setImagePromptDraft(e.target.value)
                        }
                      />
                    ) : (
                      /* End frame prompt still editable when CTA is shown */
                      <textarea
                        className="ki-textarea"
                        rows={5}
                        value={endImagePromptDraft}
                        placeholder="Describe the ending frame…"
                        onChange={(e) => setEndImagePromptDraft(e.target.value)}
                      />
                    )}

                    {activeImageError ? (
                      <div style={{ padding: "10px 12px", background: "var(--accent-soft)", border: "1px solid var(--accent)", borderRadius: 8, fontSize: 13, color: "var(--accent)" }}>
                        {activeImageError}
                      </div>
                    ) : null}

                    {/* Action buttons: hidden on first render, shown once an image exists or re-rendering */}
                    {!activeIsFirstRender && !showEndFrameCTA ? (
                      <div style={{ display: "flex", gap: 8 }}>
                        <a
                          className="btn btn-ghost btn-sm"
                          style={{ flex: 1, justifyContent: "center", pointerEvents: activeImageUrl ? "auto" : "none", opacity: activeImageUrl ? 1 : 0.45 }}
                          download={`${selectedShot.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${activeImageIsEnd ? "end" : "start"}.png`}
                          href={activeImageUrl || "#"}
                        >
                          ↓ Download
                        </a>
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1, justifyContent: "center" }}
                          disabled={!activeImagePromptDraft.trim() || activeImageIsRunning}
                          onClick={() => onRegenerateShotImage(selectedShot.id, activeImagePromptDraft, activeImageIsEnd ? "end" : "start")}
                          type="button"
                        >
                          {(activeImageIsEnd ? endImagePromptChanged : imagePromptChanged) ? "Re-render image" : "Re-render"}
                        </button>
                      </div>
                    ) : showEndFrameCTA ? (
                      /* Render end frame button visible in the prompt panel too */
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ justifyContent: "center" }}
                        disabled={!endImagePromptDraft.trim()}
                        onClick={() => onToggleEndImage(selectedShot.id, true, endImagePromptDraft)}
                        type="button"
                      >
                        Render end frame →
                      </button>
                    ) : null}
                  </>
                ) : (
                  <>
                    <textarea
                      className="ki-textarea"
                      rows={5}
                      value={videoPromptDraft}
                      onChange={(e) => {
                        setVideoPromptDraft(e.target.value);
                        onUpdateShotVideoPrompt(selectedShot.id, e.target.value);
                      }}
                    />
                    {videoPromptChanged ? (
                      <div className="mono" style={{ color: "var(--ink-faint)" }}>SAVED LIVE · APPLIED ON RENDER</div>
                    ) : null}
                  </>
                )}
              </div>
            </div>

            {/* Spec card */}
            <div className="card" style={{ padding: 16, display: "grid", gap: 10 }}>
              <span className="field-label-text">Spec</span>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
                <tbody>
                  {[
                    ["Framing",  selectedShot.framing],
                    ["Motion",   selectedShot.motion],
                    ["Duration", `${selectedShot.durationSeconds.toFixed(1)}s`],
                    ["Style",    getVideoStyleLabel(shotlist.style)],
                  ].map(([k, v]) => (
                    <tr key={k} style={{ borderTop: "1px solid var(--hairline-soft)" }}>
                      <td className="mono" style={{ padding: "10px 0", color: "var(--ink-dim)", width: "38%" }}>{String(k).toUpperCase()}</td>
                      <td style={{ padding: "10px 0", color: "var(--ink)" }}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {selectedShot.sourceImageUrls?.length ? (
                <div className="mono" style={{ color: "var(--ink-dim)" }}>
                  {selectedShot.sourceImageUrls.length} REFERENCE IMAGE{selectedShot.sourceImageUrls.length > 1 ? "S" : ""}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Filmstrip */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <span className="field-label-text">Filmstrip · {shotlist.shots.length} shots</span>
            {isGeneratingImages ? <span className="mono" style={{ color: "var(--accent)" }}>GENERATING…</span> : null}
          </div>

          <div style={{ background: "#1c1812", borderRadius: 10, overflow: "hidden" }}>
            <SprocketRow />
            <div style={{ display: "flex", padding: "10px 14px", overflowX: "auto", gap: 8 }}>
              {shotlist.shots.map((shot, i) => {
                const active = i === selectedShotIndex;
                const running = shot.imageStatus === "running";
                return (
                  <button
                    key={shot.id}
                    onClick={() => setSelectedShotIndex(i)}
                    type="button"
                    style={{ flexShrink: 0, width: 190, border: "none", background: "transparent", padding: 0, cursor: "pointer", textAlign: "left" as const }}
                  >
                    <div style={{
                      position: "relative",
                      border: `2px solid ${active ? "var(--accent)" : "rgba(243,235,220,0.1)"}`,
                      borderRadius: 4,
                      overflow: "hidden",
                      aspectRatio: "16/9",
                      background: "#0e0a06",
                    }}>
                      {shot.startImageUrl ? (
                        <img alt="" src={shot.startImageUrl} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      ) : (
                        <div className="stripe-ph" style={{ position: "absolute", inset: 0, borderRadius: 0 }} />
                      )}
                      {running ? (
                        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "grid", placeItems: "center" }}>
                          <div style={{ width: 18, height: 18, border: "2px solid rgba(243,235,220,0.2)", borderTopColor: "var(--accent)", borderRadius: 99, animation: "spin 0.8s linear infinite" }} />
                        </div>
                      ) : null}
                      <div style={{ position: "absolute", top: 4, left: 6, fontFamily: "var(--mono)", fontSize: 9.5, color: "#f3ebdc", background: "rgba(0,0,0,0.55)", padding: "1px 5px", borderRadius: 2 }}>
                        {(i + 1).toString().padStart(2, "0")}
                      </div>
                    </div>
                    <div style={{ marginTop: 7, padding: "0 2px" }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: active ? "#f3ebdc" : "rgba(243,235,220,0.65)", lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                        {shot.title}
                      </div>
                      {/* Duration removed — just show framing to prevent line wrapping */}
                      <div className="mono" style={{ color: "rgba(243,235,220,0.4)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                        {shot.framing.split("·")[0].trim()}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <SprocketRow />
          </div>
        </div>

        {/* Action rail */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 18, borderTop: "1px solid var(--hairline-soft)" }}>
          <span className="mono">READY TO RENDER · {shotlist.shots.length} SHOTS</span>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-ghost" type="button">Save shotlist</button>
            <button
              className="btn btn-primary"
              disabled={isCreatingVideo || isGeneratingImages}
              onClick={onCreateVideo}
              type="button"
            >
              {isCreatingVideo ? (
                <>
                  <span style={{ width: 14, height: 14, border: "2px solid rgba(243,235,220,0.3)", borderTopColor: "var(--paper)", borderRadius: 99, animation: "spin 0.8s linear infinite", display: "inline-block" }} />
                  Rendering…
                </>
              ) : (
                "Render draft video →"
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SprocketRow() {
  return (
    <div style={{ display: "flex", padding: "5px 6px", gap: 7, overflowX: "hidden" }}>
      {Array.from({ length: 48 }).map((_, i) => (
        <span key={i} style={{ display: "inline-block", flexShrink: 0, width: 14, height: 8, borderRadius: 2, background: "#0e0a06", border: "1px solid rgba(243,235,220,0.08)" }} />
      ))}
    </div>
  );
}

function ShotlistPlaceholder() {
  return (
    <section>
      <header className="stage-hero">
        <div>
          <h2>Building <em>shotlist…</em></h2>
          <p>Reading the Miro board and generating images for each shot.</p>
        </div>
        <span className="tally">
          <span className="tally-dot" />
          WORKING
        </span>
      </header>
      <div className="stage-body">
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(360px, 0.65fr)", gap: 24, marginBottom: 26 }}>
          <div style={{ aspectRatio: "16/9", background: "#1c1812", borderRadius: 12, animation: "pulse 1.6s ease-in-out infinite" }} />
          <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
            <div style={{ height: 200, background: "var(--paper-2)", borderRadius: 10, animation: "pulse 1.6s ease-in-out infinite" }} />
            <div style={{ height: 140, background: "var(--paper-2)", borderRadius: 10, animation: "pulse 1.6s ease-in-out infinite" }} />
          </div>
        </div>
        <div style={{ height: 120, background: "#1c1812", borderRadius: 10, animation: "pulse 1.6s ease-in-out infinite" }} />
      </div>
    </section>
  );
}

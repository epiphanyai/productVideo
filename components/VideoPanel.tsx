"use client";

import { useEffect, useState } from "react";
import type { Shotlist, VideoJobResult } from "@/lib/workflow/types";

type VideoPanelProps = {
  result: VideoJobResult | null;
  isCreating: boolean;
  isFinalRendering: boolean;
  error: string | null;
  shotlist: Shotlist | null;
  onRerender: () => void;
  onEditShotlist: () => void;
  onRenderFinal: () => void;
};

export function VideoPanel({ result, isCreating, isFinalRendering, error, shotlist, onRerender, onEditShotlist, onRenderFinal }: VideoPanelProps) {
  const draftReady = Boolean(result);
  const shots = shotlist?.shots ?? [];

  const heroTitle = isCreating
    ? <>Stitching frames into <em>motion.</em></>
    : draftReady
    ? <>The draft is up. <em>Want it final?</em></>
    : <>Ready to <em>render.</em></>;

  return (
    <section>
      {/* Stage hero */}
      <header className="stage-hero">
        <div>
          <h2>{heroTitle}</h2>
          <p>The draft is fast and free to iterate. The high-resolution final only runs when you ask for it.</p>
        </div>
        <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
          <span className="tally">
            <span className="tally-dot" style={{ animationPlayState: isCreating ? "running" : draftReady ? "running" : "paused" }} />
            {isCreating ? "RENDERING" : draftReady ? "DRAFT READY" : "AWAITING RENDER"}
          </span>
        </div>
      </header>

      <div className="stage-body">
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(340px, 0.6fr)", gap: 24, alignItems: "start" }}>
          {/* Player */}
          <div style={{ background: "#0e0a06", borderRadius: 12, overflow: "hidden", boxShadow: "0 16px 36px -12px rgba(28,24,18,0.4)" }}>
            <div style={{ position: "relative" }}>
              {/* Status bar */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 2, padding: "14px 18px", display: "flex", justifyContent: "space-between", background: "linear-gradient(180deg, rgba(0,0,0,0.6), transparent)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: "var(--accent)", animation: isCreating ? "pulse 1.6s ease-in-out infinite" : "none" }} />
                  <span className="mono" style={{ color: "#f3ebdc" }}>
                    {draftReady ? "DRAFT" : isCreating ? "RENDERING" : "PENDING"}
                  </span>
                </div>
                {shotlist?.productName ? (
                  <span className="mono" style={{ color: "#f3ebdc" }}>{shotlist.productName.toUpperCase()}</span>
                ) : null}
              </div>

              {/* Video area — fixed ratio only when no video loaded */}
              {result?.previewUrl ? (
                <video
                  controls
                  playsInline
                  preload="metadata"
                  src={result.previewUrl}
                  style={{ width: "100%", display: "block" }}
                />
              ) : (
                <div style={{ aspectRatio: "16/9", position: "relative", background: "#0e0a06" }}>
                  {isCreating ? (
                    <RenderingStage shots={shots} />
                  ) : (
                    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 26, color: "#f3ebdc", marginBottom: 8 }}>
                          No render yet
                        </div>
                        <div className="mono" style={{ color: "rgba(243,235,220,0.5)" }}>
                          Trigger a render from the right panel
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right rail */}
          <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
            {/* Render status */}
            <div className="card" style={{ padding: 18, display: "grid", gap: 12 }}>
              <span className="field-label-text">Render status</span>
              {isCreating ? (
                /* Simple loading state — no shot-by-shot progress */
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--card)", borderRadius: 8, border: "1px solid var(--hairline-soft)" }}>
                  <div style={{ width: 16, height: 16, border: "2px solid var(--hairline-strong)", borderTopColor: "var(--accent)", borderRadius: 99, animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
                  <div>
                    <div className="mono" style={{ color: "var(--ink)" }}>RENDERING DRAFT</div>
                    <div className="mono" style={{ color: "var(--ink-faint)", marginTop: 2 }}>
                      {shots.length > 0 ? `${shots.length} shots · this may take a few minutes` : "Building clips…"}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "var(--card)", borderRadius: 8, border: "1px solid var(--hairline-soft)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 99, background: draftReady ? "var(--accent)" : "var(--ink-faint)", flexShrink: 0 }} />
                      <div>
                        <div className="mono" style={{ color: "var(--ink)" }}>DRAFT</div>
                        <div className="mono" style={{ color: "var(--ink-faint)", marginTop: 2 }}>
                          {draftReady ? `${shots.length || result?.targetDurationSeconds || "?"} shots` : "Not rendered"}
                        </div>
                      </div>
                    </div>
                    <span className="mono" style={{ color: draftReady ? "var(--accent)" : "var(--ink-faint)" }}>
                      {draftReady ? "DONE" : "IDLE"}
                    </span>
                  </div>
                  {error ? (
                    <div style={{ padding: "10px 12px", background: "var(--accent-soft)", border: "1px solid var(--accent)", borderRadius: 8, fontSize: 13, color: "var(--accent)" }}>
                      {error}
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="card" style={{ padding: 18, display: "grid", gap: 8 }}>
              <span className="field-label-text" style={{ marginBottom: 4 }}>Actions</span>
              <button
                className="btn btn-ghost"
                disabled={isCreating}
                onClick={onEditShotlist}
                type="button"
              >
                ← Edit shotlist
              </button>
              <button
                className="btn btn-ghost"
                disabled={isCreating || isFinalRendering}
                onClick={onRerender}
                type="button"
              >
                ↻ Re-render draft
              </button>
            </div>

            {/* Final render */}
            <div style={{ background: "var(--ink)", color: "var(--paper)", borderRadius: 10, padding: 20 }}>
              <div className="mono" style={{ color: "rgba(243,235,220,0.5)", marginBottom: 10 }}>FINAL QUALITY</div>
              <div style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 20, lineHeight: 1.2, marginBottom: 14 }}>
                Render with{" "}
                <span style={{ fontFamily: "var(--serif-italic)", fontStyle: "italic", color: "var(--accent)" }}>Seedance.</span>
              </div>
              <button
                className="btn btn-accent"
                disabled={!draftReady || isCreating || isFinalRendering}
                onClick={onRenderFinal}
                style={{ width: "100%", justifyContent: "center", marginBottom: 8 }}
                type="button"
              >
                {isFinalRendering ? (
                  <>
                    <span style={{ width: 14, height: 14, border: "2px solid rgba(243,235,220,0.3)", borderTopColor: "var(--paper)", borderRadius: 99, animation: "spin 0.8s linear infinite", display: "inline-block" }} />
                    Rendering final…
                  </>
                ) : (
                  "↑ Render final"
                )}
              </button>
              <div className="mono" style={{ color: "rgba(243,235,220,0.35)", fontSize: 10 }}>
                {draftReady ? "HIGHER QUALITY · USES MORE CREDITS" : "RENDER DRAFT FIRST"}
              </div>
            </div>

            {/* Export */}
            {draftReady && result?.previewUrl ? (
              <div style={{ background: "var(--card)", borderRadius: 10, padding: 18, border: "1px solid var(--hairline-soft)" }}>
                <div className="mono" style={{ color: "var(--ink-dim)", marginBottom: 10 }}>EXPORT</div>
                <a
                  className="btn btn-primary"
                  download
                  href={result.previewUrl}
                  rel="noreferrer"
                  style={{ width: "100%", justifyContent: "center", marginBottom: 8, display: "inline-flex" }}
                  target="_blank"
                >
                  ⬇ Download video
                </a>
                <a
                  className="btn btn-ghost btn-sm"
                  href={result.previewUrl}
                  rel="noreferrer"
                  style={{ width: "100%", justifyContent: "center", display: "inline-flex" }}
                  target="_blank"
                >
                  Open in new tab ↗
                </a>
                {result.jobId ? (
                  <div className="mono" style={{ color: "var(--ink-faint)", marginTop: 12, fontSize: 10 }}>
                    JOB · {result.jobId}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function RenderingStage({ shots }: { shots: Shotlist["shots"] }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!shots.length) return;
    const id = setInterval(() => setPhase((p) => (p + 1) % shots.length), 700);
    return () => clearInterval(id);
  }, [shots.length]);

  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
      <div style={{ display: "grid", gap: 18, justifyItems: "center", textAlign: "center", padding: "0 24px" }}>
        <div style={{ width: 36, height: 36, border: "2px solid rgba(243,235,220,0.2)", borderTopColor: "var(--accent)", borderRadius: 99, animation: "spin 0.8s linear infinite" }} />
        <div style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 26, color: "#f3ebdc" }}>
          Rendering shots…
        </div>
        {shots.length > 0 ? (
          <div className="mono" style={{ color: "rgba(243,235,220,0.6)" }}>{shots[phase]?.title}</div>
        ) : null}
      </div>
    </div>
  );
}

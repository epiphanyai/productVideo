"use client";

import type { MiroBoardResult, ProductBrief } from "@/lib/workflow/types";

type MiroPanelProps = {
    brief: ProductBrief;
    result: MiroBoardResult | null;
    isConnected: boolean;
    isCreatingBoard: boolean;
    isCreatingShotlist: boolean;
    miroBoardUrl: string;
    showExistingBoardInput: boolean;
    error: string | null;
    shotlistError: string | null;
    onConnectMiro: (reconnect?: boolean) => void;
    onMiroBoardUrlChange: (value: string) => void;
    onUseExistingBoard: () => void;
    onCreateShotlist: () => void;
};

export function MiroPanel({
    brief,
    result,
    isConnected,
    isCreatingBoard,
    isCreatingShotlist,
    miroBoardUrl,
    showExistingBoardInput,
    error,
    shotlistError,
    onConnectMiro,
    onMiroBoardUrlChange,
    onUseExistingBoard,
    onCreateShotlist,
}: MiroPanelProps) {
    const seeded = Boolean(result?.boardUrl);

    return (
        <section>
            {/* Stage hero */}
            <header className="stage-hero">
                <div>
                    <h2>
                        The board is your <em>writing room.</em>
                    </h2>
                    <p>Connect Miro and we&apos;ll seed a shotlist into a fresh board your team can shape. We listen to whatever you do there — we don&apos;t lead.</p>
                </div>
                <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                    <span className="tally">
                        <span className="tally-dot" style={{ animationPlayState: isConnected ? "running" : "paused", background: isConnected ? "var(--accent)" : "var(--ink-faint)" }} />
                        {isConnected ? "MIRO CONNECTED" : "MIRO DISCONNECTED"}
                    </span>
                </div>
            </header>

            <div className="stage-body">
                {/* ── Seeded state: full iframe embed ───────────────────── */}
                {seeded && result ? (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr minmax(280px, 300px)", gap: 20, alignItems: "start" }}>
                        {/* Miro board iframe */}
                        <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--hairline-soft)", background: "#f5f5f5" }}>
                            <iframe
                                src={`https://miro.com/app/board/${result.boardId}/`}
                                title="Miro board"
                                style={{ width: "100%", height: 580, border: "none", display: "block" }}
                                allow="fullscreen; clipboard-read; clipboard-write"
                            />
                        </div>

                        {/* Right rail */}
                        <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
                            {/* Board status */}
                            <div className="card" style={{ padding: 16 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                                    <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--accent)", animation: "pulse 1.6s ease-in-out infinite", flexShrink: 0 }} />
                                    <span className="mono">BOARD LIVE</span>
                                </div>
                                <div style={{ fontFamily: "var(--display)", fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
                                    {brief.productName || "Untitled"} · Spot 01
                                </div>
                                <div className="mono" style={{ color: "var(--ink-dim)" }}>CHANGES SYNC ON READ-BACK</div>
                                {result.boardUrl ? (
                                    <a
                                        className="btn btn-ghost btn-sm"
                                        href={result.boardUrl}
                                        rel="noreferrer"
                                        target="_blank"
                                        style={{ marginTop: 12, width: "100%", justifyContent: "center" }}
                                    >
                                        Open in Miro ↗
                                    </a>
                                ) : null}
                            </div>

                            {/* Errors */}
                            {(error || shotlistError) ? (
                                <div style={{ padding: "12px 16px", background: "var(--accent-soft)", border: "1px solid var(--accent)", borderRadius: 8, fontSize: 13.5, color: "var(--accent)" }}>
                                    {error ?? shotlistError}
                                </div>
                            ) : null}

                            <FinalizeBoardCta
                                isCreatingShotlist={isCreatingShotlist}
                                isReady={seeded}
                                onCreateShotlist={onCreateShotlist}
                            />

                            {/* Connection controls */}
                            <div style={{ padding: "14px 16px", background: "var(--paper-2)", borderRadius: 10, border: "1px solid var(--hairline-soft)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div className="mono" style={{ color: "var(--ink-faint)" }}>OAUTH · ACTIVE</div>
                                <div style={{ display: "flex", gap: 8 }}>
                                    <button className="btn btn-ghost btn-sm" onClick={() => onConnectMiro(true)} type="button">↻ Reconnect</button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ── Not-seeded state: connection management ────────── */
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.3fr) minmax(340px, 0.7fr)", gap: 24 }}>
                        {/* Connection card */}
                        <div className="card" style={{ overflow: "hidden" }}>
                            {/* Card header */}
                            <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid var(--hairline-soft)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                    <MiroLogo />
                                    <div>
                                        <div style={{ fontFamily: "var(--display)", fontWeight: 600, fontSize: 18, lineHeight: 1.1 }}>Miro</div>
                                        <div className="mono" style={{ color: "var(--ink-dim)", marginTop: 4 }}>
                                            {isConnected ? "OAUTH · ACTIVE SESSION" : "NOT CONNECTED"}
                                        </div>
                                    </div>
                                </div>
                                <span style={{
                                    display: "inline-flex", alignItems: "center", gap: 8,
                                    padding: "6px 12px",
                                    background: isConnected ? "var(--accent-soft)" : "var(--paper-2)",
                                    color: isConnected ? "var(--accent)" : "var(--ink-dim)",
                                    border: `1px solid ${isConnected ? "var(--accent)" : "var(--hairline)"}`,
                                    borderRadius: 99,
                                    fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase" as const,
                                }}>
                                    <span style={{ width: 6, height: 6, borderRadius: 99, background: isConnected ? "var(--accent)" : "var(--ink-faint)", animation: isConnected ? "pulse 1.6s ease-in-out infinite" : "none" }} />
                                    {isConnected ? "Connected" : "Disconnected"}
                                </span>
                            </div>

                            {/* Card body */}
                            {!isConnected ? (
                                <div style={{ padding: "44px 28px 36px", display: "grid", placeItems: "center", textAlign: "center" }}>
                                    <div style={{ maxWidth: 460 }}>
                                        <div style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 36, marginBottom: 14 }}>
                                            Connect <em style={{ fontFamily: "var(--serif-italic)", fontStyle: "italic", color: "var(--accent)" }}>Miro</em> to begin.
                                        </div>
                                        <p style={{ color: "var(--ink-mid)", fontSize: 14.5, lineHeight: 1.6, margin: "0 0 28px" }}>
                                            We&apos;ll open a board in your workspace, drop in your seed shotlist, and watch for changes as your team shapes the cut.
                                        </p>
                                        <button className="btn btn-primary" onClick={() => onConnectMiro(false)} style={{ height: 48, padding: "0 26px", fontSize: 15 }} type="button">
                                            <MiroLogo size={18} /> Connect Miro
                                        </button>
                                        <div className="mono" style={{ color: "var(--ink-faint)", marginTop: 18 }}>READ + WRITE BOARDS · NEVER YOUR ACCOUNT</div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ padding: "22px 24px" }}>
                                    <div className="field-label-text" style={{ marginBottom: 10 }}>Board for this brief</div>

                                    {isCreatingBoard ? (
                                        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 18, background: "var(--paper-2)", borderRadius: 10, border: "1px solid var(--hairline-soft)" }}>
                                            <div style={{ width: 20, height: 20, border: "2px solid var(--hairline-strong)", borderTopColor: "var(--accent)", borderRadius: 99, animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
                                            <div>
                                                <div style={{ fontFamily: "var(--display)", fontWeight: 600, fontSize: 17 }}>Seeding board…</div>
                                                <div style={{ color: "var(--ink-mid)", fontSize: 13.5, marginTop: 4 }}>Building shotlist from your brief.</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 18, alignItems: "center", padding: 18, background: "var(--paper-2)", borderRadius: 10, border: "1px dashed var(--hairline-strong)" }}>
                                            <div>
                                                <div style={{ fontFamily: "var(--display)", fontWeight: 600, fontSize: 17 }}>No board yet</div>
                                                <div style={{ color: "var(--ink-mid)", fontSize: 13.5, marginTop: 4 }}>
                                                    Seed a fresh board for <em style={{ fontFamily: "var(--serif-italic)", fontStyle: "italic" }}>{brief.productName || "this brief"}</em>.
                                                </div>
                                            </div>
                                            <button className="btn btn-primary" onClick={onUseExistingBoard} type="button">Seed board →</button>
                                        </div>
                                    )}

                                    {/* Existing board URL input */}
                                    {showExistingBoardInput && !isCreatingBoard ? (
                                        <div style={{ marginTop: 16, padding: 16, background: "var(--paper-2)", borderRadius: 10, border: "1px solid var(--hairline-soft)" }}>
                                            <div className="field-label-text" style={{ marginBottom: 8 }}>Or paste an existing board URL</div>
                                            <div style={{ display: "flex", gap: 8 }}>
                                                <input
                                                    className="input"
                                                    onChange={(e) => onMiroBoardUrlChange(e.target.value)}
                                                    placeholder="https://miro.com/app/board/..."
                                                    style={{ flex: 1 }}
                                                    type="url"
                                                    value={miroBoardUrl}
                                                />
                                                <button
                                                    className="btn btn-primary"
                                                    disabled={!miroBoardUrl.trim() || isCreatingBoard}
                                                    onClick={onUseExistingBoard}
                                                    type="button"
                                                >
                                                    Use board
                                                </button>
                                            </div>
                                        </div>
                                    ) : null}

                                    {/* Errors */}
                                    {(error || shotlistError) ? (
                                        <div style={{ marginTop: 14, padding: "12px 16px", background: "var(--accent-soft)", border: "1px solid var(--accent)", borderRadius: 8, fontSize: 13.5, color: "var(--accent)" }}>
                                            {error ?? shotlistError}
                                        </div>
                                    ) : null}

                                    {/* Connection actions */}
                                    <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--hairline-soft)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <div className="mono" style={{ color: "var(--ink-faint)" }}>OAUTH · SESSION ACTIVE</div>
                                        <div style={{ display: "flex", gap: 8 }}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => onConnectMiro(true)} type="button">↻ Reconnect</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => onConnectMiro(false)} type="button">Disconnect</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right rail */}
                        <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
                            <div className="card-deep" style={{ padding: 20 }}>
                                <div className="field-label-text" style={{ marginBottom: 14 }}>How the board flows</div>
                                <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 14 }}>
                                    {[
                                        ["Seed", "We push a structured shotlist into a fresh board — three acts, six shots, references."],
                                        ["Shape", "Your team rewrites titles, drops references, and rearranges shots in Miro."],
                                        ["Read", "When the cut feels right, we read the board back into a shotlist for review."],
                                    ].map(([t, d], i) => (
                                        <li key={t} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 12 }}>
                                            <span style={{ fontFamily: "var(--serif-italic)", fontStyle: "italic", fontSize: 22, color: "var(--ink-faint)", lineHeight: 1, width: 24 }}>
                                                {["i", "ii", "iii"][i]}.
                                            </span>
                                            <div>
                                                <div style={{ fontFamily: "var(--display)", fontWeight: 600, fontSize: 15 }}>{t}</div>
                                                <div style={{ color: "var(--ink-mid)", fontSize: 13.5, lineHeight: 1.5 }}>{d}</div>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </div>

                            <FinalizeBoardCta
                                isCreatingShotlist={isCreatingShotlist}
                                isReady={seeded}
                                onCreateShotlist={onCreateShotlist}
                            />
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

function FinalizeBoardCta({
    isCreatingShotlist,
    isReady,
    onCreateShotlist,
}: {
    isCreatingShotlist: boolean;
    isReady: boolean;
    onCreateShotlist: () => void;
}) {
    return (
        <div style={{ background: "var(--ink)", color: "var(--paper)", borderRadius: 10, padding: 20 }}>
            <div className="mono" style={{ color: "rgba(243,235,220,0.6)", marginBottom: 10 }}>WHEN YOU&apos;RE READY</div>
            <div style={{ fontFamily: "var(--display)", fontWeight: 500, fontSize: 20, lineHeight: 1.2, marginBottom: 14 }}>
                Finalize board{" "}
                <span style={{ fontFamily: "var(--serif-italic)", fontStyle: "italic", color: "var(--accent)" }}>into a shotlist.</span>
            </div>
            <button
                className="btn btn-accent"
                disabled={!isReady || isCreatingShotlist}
                onClick={onCreateShotlist}
                style={{ width: "100%", justifyContent: "center" }}
                type="button"
            >
                {isCreatingShotlist ? (
                    <>
                        <span style={{ width: 14, height: 14, border: "2px solid rgba(243,235,220,0.3)", borderTopColor: "var(--paper)", borderRadius: 99, animation: "spin 0.8s linear infinite", display: "inline-block" }} />
                        Finalizing board...
                    </>
                ) : (
                    "Finalize board ->"
                )}
            </button>
            <div className="mono" style={{ color: "rgba(243,235,220,0.45)", marginTop: 10, fontSize: 10 }}>
                {isReady ? "BOARD READY" : "SEED A BOARD FIRST"}
            </div>
        </div>
    );
}

function MiroLogo({ size = 30 }: { size?: number }) {
    return (
        <span style={{
            display: "inline-flex", width: size, height: size,
            borderRadius: 6, background: "#ffd02f", color: "#050038",
            alignItems: "center", justifyContent: "center",
            fontFamily: "var(--display)", fontWeight: 800, fontSize: size * 0.55, lineHeight: 1,
            flexShrink: 0,
        }}>
            M
        </span>
    );
}

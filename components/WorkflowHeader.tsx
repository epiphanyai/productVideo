export function WorkflowHeader() {
  return (
    <header className="topbar">
      <span className="brand">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 36 36" width="36" height="36">
            <rect x="0" y="0" width="36" height="36" rx="6" fill="#1c1812" />
            <g fill="#f3ebdc">
              <rect x="7"  y="9"  width="3" height="18" rx="0.5" />
              <rect x="12" y="11" width="3" height="14" rx="0.5" opacity="0.7" />
              <rect x="17" y="13" width="3" height="10" rx="0.5" opacity="0.45" />
            </g>
            <path d="M22 11 L29 18 L22 25 Z" fill="var(--accent)" />
          </svg>
        </span>
        <span>
          Kinetic<span className="ai">ai</span>
        </span>
      </span>

      <div className="topbar-meta">
        <span>
          Static photos in.{" "}
          <em style={{ fontFamily: "var(--serif-italic)", fontStyle: "italic", color: "var(--accent)", textTransform: "none", letterSpacing: 0, fontSize: 13 }}>
            Kinetic stories
          </em>{" "}
          out.
        </span>
      </div>

      <div className="topbar-actions">
        <a
          className="btn btn-ghost btn-sm"
          href="https://github.com/epiphanyai/productVideo"
          rel="noreferrer"
          target="_blank"
        >
          ★ GitHub
        </a>
      </div>
    </header>
  );
}

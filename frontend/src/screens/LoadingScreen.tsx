import NavBar from "../components/NavBar";
import { stageStatus } from "../utils";

interface Props {
  repoUrl: string;
  progress: { pct: number; msg: string };
  onCancel: () => void;
}

const STAGES = [
  { key: "connecting",  label: "Connecting to repository",  pct: 10 },
  { key: "fetching",    label: "Fetching commit history",    pct: 25 },
  { key: "analyzing",   label: "Analyzing contributors",     pct: 50 },
  { key: "writing",     label: "Writing the script",         pct: 75 },
  { key: "rendering",   label: "Rendering video",            pct: 95 },
];

export default function LoadingScreen({ repoUrl, progress, onCancel }: Props) {
  const repoShort = repoUrl.replace("https://github.com/", "");

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--bg)" }}>
      <NavBar contextual={<span style={{ fontSize: 11, color: "var(--text-muted)" }}>{repoShort}</span>} />

      <main id="main-content" tabIndex={-1} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 560, width: "100%", margin: "0 auto", padding: "0 32px" }}>
        <div style={{ fontSize: 12, color: "var(--accent)", letterSpacing: 3, textTransform: "uppercase", marginBottom: 16, fontFamily: "var(--font-display)", fontWeight: 600 }}>
          In Production
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(40px, 5vw, 64px)", fontWeight: 900, letterSpacing: -3, lineHeight: 0.93, marginBottom: 48 }}>
          Generating<br />your film…
        </h1>

        <ul role="list" style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 40, listStyle: "none" }}>
          {STAGES.map(stage => {
            const status = stageStatus(stage.pct, progress.pct);
            return (
              <li
                key={stage.key}
                aria-current={status === "active" ? "step" : undefined}
                style={{ display: "flex", alignItems: "center", gap: 14 }}
              >
                <div
                  className={status === "active" ? "stage-dot-active" : undefined}
                  aria-hidden="true"
                  style={{
                    width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                    background: status === "pending" ? "transparent" : "var(--accent)",
                    border: status === "pending" ? "1px solid var(--border-dim)" : "none",
                    opacity: status === "done" ? 0.5 : 1,
                  }}
                />
                <span style={{
                  fontSize: 13,
                  color: status === "active" ? "var(--text-active)" : status === "done" ? "var(--text-mid)" : "var(--text-muted)",
                }}>
                  {stage.label}
                  {status === "done" && <span className="sr-only"> — complete</span>}
                </span>
                {status === "done" && <span aria-hidden="true" style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-mid)" }}>✓</span>}
              </li>
            );
          })}
        </ul>

        <div
          role="progressbar"
          aria-valuenow={progress.pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Generation progress"
          style={{ width: "100%", height: 2, background: "var(--border-dim)", borderRadius: 2, marginBottom: 10 }}
        >
          <div style={{
            height: "100%", width: `${progress.pct}%`,
            background: "linear-gradient(90deg, var(--accent), var(--text-active))",
            borderRadius: 1, boxShadow: "0 0 10px var(--accent-glow)",
            transition: "width 0.7s cubic-bezier(0.4,0,0.2,1)",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span role="status" aria-live="polite" aria-atomic="true" style={{ fontSize: 11, color: "var(--text-muted)" }}>{progress.msg}</span>
          <span aria-hidden="true" style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>{progress.pct}%</span>
        </div>
      </main>

      <footer style={{ borderTop: "1px solid var(--border)", padding: "16px 48px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Usually around 60 seconds — larger repositories may take longer</span>
        <button
          type="button"
          className="btn-cancel"
          onClick={onCancel}
          title="Stop generating and return to the home screen"
        >
          <span aria-hidden="true">✕</span> Cancel generation
        </button>
      </footer>
    </div>
  );
}

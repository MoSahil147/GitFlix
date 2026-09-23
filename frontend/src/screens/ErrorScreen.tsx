import NavBar from "../components/NavBar";
import { sanitizeError } from "../utils";

interface Props {
  error: string;
  onRetry: () => void;
}

export default function ErrorScreen({ error, onRetry }: Props) {
  const clean = sanitizeError(error);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--bg)" }}>
      <div aria-hidden="true" style={{ height: 2, background: "linear-gradient(90deg, transparent, #dc2626, transparent)", position: "absolute", top: 0, left: 0, right: 0, zIndex: 11 }} />
      <NavBar />

      <main id="main-content" tabIndex={-1} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 520, width: "100%", margin: "0 auto", padding: "0 32px" }}>
        <div role="alert">
          <div style={{ fontSize: 12, color: "#dc2626", letterSpacing: 3, textTransform: "uppercase", marginBottom: 16, fontFamily: "var(--font-display)", fontWeight: 600 }}>
            Production Failed
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(36px, 4vw, 56px)", fontWeight: 900, letterSpacing: -3, lineHeight: 0.93, marginBottom: 16 }}>
            The film couldn't<br />be made.
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 32, lineHeight: 1.6 }}>{clean}</p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          title="Return to the home screen and try a different repository"
          style={{ alignSelf: "flex-start", fontSize: 13, color: "var(--text-muted)", border: "1px solid var(--border-dim)", padding: "10px 24px", borderRadius: 6, background: "transparent", cursor: "pointer" }}
        >
          Try again <span aria-hidden="true">→</span>
        </button>
      </main>
    </div>
  );
}

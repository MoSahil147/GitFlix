import { useRef } from "react";
import NavBar from "../components/NavBar";

interface Props {
  repoUrl: string;
  tone: "epic" | "documentary" | "casual";
  error: string;
  cooldown: boolean;
  onRepoUrlChange: (v: string) => void;
  onToneChange: (t: "epic" | "documentary" | "casual") => void;
  onGenerate: () => void;
}

const TONES = ["epic", "documentary", "casual"] as const;

const TONE_DESCRIPTIONS: Record<typeof TONES[number], string> = {
  epic:        "Dramatic, high-stakes narration with cinematic flair",
  documentary: "Calm, factual narration — informative and composed",
  casual:      "Lighthearted and conversational — fun and relaxed",
};

export default function InputScreen({ repoUrl, tone, error, cooldown, onRepoUrlChange, onToneChange, onGenerate }: Props) {
  const toneRefs = useRef<(HTMLButtonElement | null)[]>([]);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--bg)" }}>
      <NavBar />

      <main id="main-content" tabIndex={-1} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 600, width: "100%", margin: "0 auto", padding: "0 32px" }}>
        <div style={{ fontSize: 12, color: "var(--accent)", letterSpacing: 3, textTransform: "uppercase", marginBottom: 16, fontFamily: "var(--font-display)", fontWeight: 600 }}>
          GitHub <span aria-hidden="true">→</span> Cinematic Video
        </div>

        <hgroup style={{ marginBottom: 40 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(48px, 6vw, 80px)", fontWeight: 900, letterSpacing: -4, lineHeight: 0.93, color: "var(--text)", marginBottom: 16 }}>
            Every repo<br />has a story.
          </h1>
          <p style={{ fontSize: 16, color: "var(--text-muted)", lineHeight: 1.6 }}>
            Paste a GitHub link. Get a cinematic documentary of your repository's history.
          </p>
        </hgroup>

        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <label htmlFor="repo-url" className="sr-only">GitHub repository URL</label>
          <input
            id="repo-url"
            className="repo-input"
            type="text"
            inputMode="url"
            autoComplete="url"
            value={repoUrl}
            onChange={e => onRepoUrlChange(e.target.value.toLowerCase())}
            onKeyDown={e => e.key === "Enter" && onGenerate()}
            placeholder="https://github.com/org/repo"
            title="Paste the URL of any public GitHub repository, e.g. https://github.com/react/react"
            aria-describedby={error ? "repo-error" : undefined}
            aria-invalid={!!error || undefined}
            style={{
              flex: 1, background: "var(--surface)", border: "1px solid var(--border-dim)",
              borderRadius: 8, padding: "14px 16px", fontSize: 14, color: "var(--text-active)",
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={onGenerate}
            disabled={cooldown}
            aria-label={cooldown ? "Please wait" : "Generate film"}
            title={cooldown ? "Please wait a moment before generating again" : "Generate a cinematic film from this repository"}
            style={{
              background: cooldown ? "var(--border-dim)" : "linear-gradient(135deg, #e8b84b 0%, #c8941f 100%)",
              border: "none", borderRadius: 8, padding: "14px 24px",
              fontSize: 14, fontWeight: 700, color: cooldown ? "var(--text-muted)" : "#1a0e00",
              whiteSpace: "nowrap", cursor: cooldown ? "not-allowed" : "pointer",
            }}
          >
            {cooldown ? "Please wait" : <>Generate <span aria-hidden="true">→</span></>}
          </button>
        </div>

        <div role="radiogroup" aria-label="Film tone" style={{ display: "flex", border: "1px solid var(--border-dim)", borderRadius: 8, overflow: "hidden", marginBottom: 8 }}>
          {TONES.map((t, i) => (
            <button
              key={t}
              type="button"
              ref={el => { toneRefs.current[i] = el; }}
              role="radio"
              aria-checked={tone === t}
              tabIndex={tone === t ? 0 : -1}
              title={TONE_DESCRIPTIONS[t]}
              onClick={() => onToneChange(t)}
              onKeyDown={e => {
                if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                  e.preventDefault();
                  const next = (i + 1) % TONES.length;
                  onToneChange(TONES[next]);
                  toneRefs.current[next]?.focus();
                } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                  e.preventDefault();
                  const prev = (i - 1 + TONES.length) % TONES.length;
                  onToneChange(TONES[prev]);
                  toneRefs.current[prev]?.focus();
                }
              }}
              style={{
                flex: 1, padding: "10px 0", fontSize: 12, textAlign: "center",
                textTransform: "capitalize", letterSpacing: 0.3,
                color: tone === t ? "var(--text-active)" : "var(--text-muted)",
                background: tone === t ? "var(--accent-dim)" : "transparent",
                border: "none",
                borderRight: i < 2 ? "1px solid var(--border-dim)" : "none",
                cursor: "pointer",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {error && (
          <p id="repo-error" role="alert" style={{ marginTop: 8, color: "#EF4444", fontSize: 13 }}>
            {error}
          </p>
        )}
      </main>

      <footer style={{ borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", maxWidth: 600, width: "100%", margin: "0 auto", padding: "0 32px" }}>
        <div style={{ padding: "24px 0", paddingRight: 32, borderRight: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 900, letterSpacing: -1 }}>7</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 2, marginTop: 4 }}>Chapters</div>
        </div>
        <div style={{ padding: "24px 0", paddingLeft: 32, paddingRight: 32, borderRight: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 900, letterSpacing: -1 }}>3</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 2, marginTop: 4 }}>Tones</div>
        </div>
        <div style={{ padding: "24px 0", paddingLeft: 32 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 900, letterSpacing: -1 }}>
            <abbr title="approximately 60 seconds">~60s</abbr>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 2, marginTop: 4 }}>Avg. wait</div>
        </div>
      </footer>
    </div>
  );
}

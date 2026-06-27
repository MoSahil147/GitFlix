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

export default function InputScreen({ repoUrl, tone, error, cooldown, onRepoUrlChange, onToneChange, onGenerate }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--bg)" }}>
      <NavBar />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 600, width: "100%", margin: "0 auto", padding: "0 32px" }}>
        <div style={{ fontSize: 12, color: "var(--accent)", letterSpacing: 3, textTransform: "uppercase", marginBottom: 16, fontFamily: "var(--font-display)", fontWeight: 600 }}>
          GitHub → Cinematic Video
        </div>

        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(48px, 6vw, 80px)", fontWeight: 900, letterSpacing: -4, lineHeight: 0.93, color: "var(--text)", marginBottom: 16 }}>
          Every repo<br />has a story.
        </h1>

        <p style={{ fontSize: 16, color: "var(--text-muted)", marginBottom: 40, lineHeight: 1.6 }}>
          Paste a GitHub link. Get a cinematic documentary of your repository's history.
        </p>

        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <input
            className="repo-input"
            value={repoUrl}
            onChange={e => onRepoUrlChange(e.target.value.toLowerCase())}
            onKeyDown={e => e.key === "Enter" && onGenerate()}
            placeholder="https://github.com/org/repo"
            style={{
              flex: 1, background: "var(--surface)", border: "1px solid var(--border-dim)",
              borderRadius: 8, padding: "14px 16px", fontSize: 14, color: "var(--text-active)",
              outline: "none",
            }}
          />
          <button
            onClick={onGenerate}
            disabled={cooldown}
            style={{
              background: cooldown ? "var(--border-dim)" : "linear-gradient(135deg, #e8b84b 0%, #c8941f 100%)",
              border: "none", borderRadius: 8, padding: "14px 24px",
              fontSize: 14, fontWeight: 700, color: cooldown ? "var(--text-muted)" : "#1a0e00",
              whiteSpace: "nowrap", cursor: cooldown ? "not-allowed" : "pointer",
            }}
          >
            {cooldown ? "Please wait…" : "Generate →"}
          </button>
        </div>

        <div style={{ display: "flex", border: "1px solid var(--border-dim)", borderRadius: 8, overflow: "hidden", marginBottom: 8 }}>
          {TONES.map((t, i) => (
            <button
              key={t}
              onClick={() => onToneChange(t)}
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

        {error && <p style={{ marginTop: 8, color: "#EF4444", fontSize: 13 }}>{error}</p>}
      </div>

      <div style={{ borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", maxWidth: 600, width: "100%", margin: "0 auto", padding: "0 32px" }}>
        {([["7", "Chapters"], ["3", "Tones"], ["~60s", "Wait time"]] as const).map(([num, label], i) => (
          <div key={label} style={{ padding: "24px 0", paddingLeft: i > 0 ? 32 : 0, paddingRight: i < 2 ? 32 : 0, borderRight: i < 2 ? "1px solid var(--border)" : "none" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 900, letterSpacing: -1 }}>{num}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 2, marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

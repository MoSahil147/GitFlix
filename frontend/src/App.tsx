import React, { useState, useRef } from "react";
import { Player } from "@remotion/player";
import type { PlayerRef } from "@remotion/player";
import { GitflixVideo, SCENE_DURATIONS } from "./remotion/GitflixVideo";
import type { ScriptJSON } from "./remotion/types";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const FPS = 30;

const ACCENT  = "#8B5CF6";
const BG      = "#050508";
const SURFACE = "#0D0D14";
const BORDER  = "#1A1A2A";

// cumulative start frame for each chapter
const CHAPTER_FRAMES: Record<string, number> = {
  S01: 0,
  S02: SCENE_DURATIONS.S01 * FPS,
  S03: (SCENE_DURATIONS.S01 + SCENE_DURATIONS.S02) * FPS,
  S04: (SCENE_DURATIONS.S01 + SCENE_DURATIONS.S02 + SCENE_DURATIONS.S03) * FPS,
  S05: (SCENE_DURATIONS.S01 + SCENE_DURATIONS.S02 + SCENE_DURATIONS.S03 + SCENE_DURATIONS.S04) * FPS,
  S06: (SCENE_DURATIONS.S01 + SCENE_DURATIONS.S02 + SCENE_DURATIONS.S03 + SCENE_DURATIONS.S04 + SCENE_DURATIONS.S05) * FPS,
  S07: (SCENE_DURATIONS.S01 + SCENE_DURATIONS.S02 + SCENE_DURATIONS.S03 + SCENE_DURATIONS.S04 + SCENE_DURATIONS.S05 + SCENE_DURATIONS.S06) * FPS,
};

const TOTAL_FRAMES = Object.values(SCENE_DURATIONS).reduce((a, b) => a + b, 0) * FPS;

const CHAPTERS = [
  { id: "S01", label: "Origin"      },
  { id: "S02", label: "Cast"        },
  { id: "S03", label: "The Rise"    },
  { id: "S04", label: "Plot Twist"  },
  { id: "S05", label: "Ghost Files" },
  { id: "S06", label: "Hero Commit" },
  { id: "S07", label: "Finale"      },
];

const fontLink = document.createElement("link");
fontLink.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

type Stage = "input" | "loading" | "preview" | "error";

export default function App() {
  const [stage, setStage]       = useState<Stage>("input");
  const [repoUrl, setRepoUrl]   = useState("");
  const [tone, setTone]         = useState<"epic" | "documentary" | "casual">("documentary");
  const [progress, setProgress] = useState({ pct: 0, msg: "" });
  const [script, setScript]     = useState<ScriptJSON | null>(null);
  const [error, setError]       = useState("");
  const playerRef               = useRef<PlayerRef>(null);

  const handleGenerate = () => {
    const normalizedUrl = repoUrl.trim().toLowerCase();
    if (!normalizedUrl.includes("github.com")) { setError("Please enter a valid GitHub URL"); return; }
    setError(""); setStage("loading"); setProgress({ pct: 0, msg: "Connecting..." });
    const url = `${API}/generate/stream?repo_url=${encodeURIComponent(normalizedUrl)}&tone=${tone}`;
    const es = new EventSource(url);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.stage === "done")       { setScript(data.data); setStage("preview"); es.close(); }
      else if (data.stage === "error") { setError(data.msg);   setStage("error");   es.close(); }
      else                             { setProgress({ pct: data.pct, msg: data.msg }); }
    };
    es.onerror = () => { setError("Connection failed. Is the backend running?"); setStage("error"); es.close(); };
  };

  const handleExport = () => {
    alert("MP4 export coming soon! For now, use your browser's screen recorder to capture the film.");
  };

  const base: React.CSSProperties = {
    minHeight: "100vh", width: "100%",
    background: BG, color: "#fff",
    fontFamily: "'DM Sans', sans-serif",
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    backgroundImage: `radial-gradient(ellipse 120% 50% at 50% -5%, ${ACCENT}22 0%, transparent 65%)`,
  };

  /* ── LANDING ── */
  if (stage === "input") return (
    <div style={base}>
      <div style={{ width: "100%", maxWidth: 600, padding: "0 24px", textAlign: "center" }}>

        {/* logo */}
        <div style={{ marginBottom: 6, lineHeight: 1 }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 96, fontWeight: 900, color: "#fff", letterSpacing: -4 }}>Git</span>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 96, fontWeight: 900, fontStyle: "italic", color: ACCENT, letterSpacing: -4 }}>flix</span>
        </div>
        <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 18, color: "#3A3A55", marginBottom: 64, letterSpacing: 0.5 }}>
          Every repository has a story worth telling.
        </p>

        {/* input */}
        <input
          value={repoUrl}
          onChange={e => setRepoUrl(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleGenerate()}
          placeholder="https://github.com/org/repo"
          style={{
            width: "100%", padding: "18px 22px", fontSize: 15,
            background: SURFACE, border: `1px solid ${BORDER}`,
            borderRadius: 14, color: "#fff", marginBottom: 14,
            boxSizing: "border-box", outline: "none",
            fontFamily: "'DM Sans', sans-serif",
          }}
        />

        {/* tone picker */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, justifyContent: "center" }}>
          {(["epic", "documentary", "casual"] as const).map(t => (
            <button key={t} onClick={() => setTone(t)} style={{
              padding: "8px 24px",
              border: `1px solid ${tone === t ? ACCENT : BORDER}`,
              borderRadius: 100,
              background: tone === t ? `${ACCENT}20` : "transparent",
              color: tone === t ? ACCENT : "#333355",
              cursor: "pointer", fontSize: 13, fontWeight: 500,
              textTransform: "capitalize", letterSpacing: 0.5,
            }}>{t}</button>
          ))}
        </div>

        <button onClick={handleGenerate} style={{
          width: "100%", padding: "18px", fontSize: 16, fontWeight: 600,
          background: ACCENT, border: "none", borderRadius: 14,
          color: "#fff", cursor: "pointer", letterSpacing: 0.3,
          boxShadow: `0 0 40px ${ACCENT}55`,
        }}>
          Generate Film
        </button>
        {error && <p style={{ marginTop: 16, color: "#EF4444", fontSize: 13 }}>{error}</p>}
      </div>
    </div>
  );

  /* ── LOADING ── */
  if (stage === "loading") return (
    <div style={base}>
      <div style={{ textAlign: "center", width: "100%", maxWidth: 480, padding: "0 24px" }}>
        <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 12, color: ACCENT, letterSpacing: 4, textTransform: "uppercase", marginBottom: 20 }}>
          In production
        </p>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 40, fontWeight: 700, marginBottom: 48, color: "#fff", lineHeight: 1.2 }}>
          Generating your film…
        </h2>
        <div style={{ width: "100%", height: 2, background: BORDER, borderRadius: 2, marginBottom: 14 }}>
          <div style={{
            width: `${progress.pct}%`, height: "100%",
            background: `linear-gradient(90deg, ${ACCENT}, #C084FC)`,
            borderRadius: 2, transition: "width 0.7s cubic-bezier(0.4,0,0.2,1)",
            boxShadow: `0 0 16px ${ACCENT}99`,
          }} />
        </div>
        <p style={{ fontSize: 13, color: "#333355", letterSpacing: 0.3 }}>{progress.msg}</p>
      </div>
    </div>
  );

  /* ── PREVIEW ── */
  if (stage === "preview" && script) return (
    <div style={{ ...base, justifyContent: "flex-start", alignItems: "stretch", padding: 0 }}>

      {/* top bar */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "18px 40px", borderBottom: `1px solid ${BORDER}`,
        background: `${BG}ee`, backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontStyle: "italic", color: ACCENT, fontSize: 24, letterSpacing: -1 }}>Gitflix</span>
          <span style={{ fontSize: 13, color: "#333355", marginLeft: 20 }}>
            {script.repo_name} · {script.total_commits} commits · {script.contributor_count} contributors
          </span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => { setStage("input"); setScript(null); }} style={{
            padding: "9px 20px", border: `1px solid #555577`, borderRadius: 10,
            background: "transparent", color: "#cccce0", cursor: "pointer", fontSize: 13,
          }}>← New Film</button>
          <button onClick={handleExport} style={{
            padding: "9px 20px", border: "none", borderRadius: 10,
            background: ACCENT, color: "#fff", fontWeight: 600,
            cursor: "pointer", fontSize: 13,
            boxShadow: `0 0 20px ${ACCENT}55`,
          }}>Export MP4</button>
        </div>
      </div>

      {/* player — full width */}
      <div style={{ width: "100%", background: "#000" }}>
        <Player
          ref={playerRef}
          component={GitflixVideo}
          inputProps={{ script }}
          durationInFrames={TOTAL_FRAMES}
          fps={FPS}
          compositionWidth={1920}
          compositionHeight={1080}
          style={{ width: "100%", maxHeight: "80vh" }}
          controls
        />
      </div>

      {/* chapter strip */}
      <div style={{
        display: "flex", gap: 8, padding: "16px 40px",
        flexWrap: "wrap", borderTop: `1px solid ${BORDER}`,
        background: SURFACE,
      }}>
        <span style={{ fontSize: 11, color: "#333355", textTransform: "uppercase", letterSpacing: 2, alignSelf: "center", marginRight: 8 }}>Chapters</span>
        {CHAPTERS.map(ch => (
          <button key={ch.id} onClick={() => playerRef.current?.seekTo(CHAPTER_FRAMES[ch.id])} style={{
            padding: "6px 18px", border: `1px solid ${BORDER}`,
            borderRadius: 100, background: "transparent",
            color: "#55557a", cursor: "pointer", fontSize: 12, letterSpacing: 0.3,
            transition: "all 0.15s",
          }}
            onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = ACCENT; (e.target as HTMLButtonElement).style.color = ACCENT; }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = BORDER;  (e.target as HTMLButtonElement).style.color = "#55557a"; }}
          >{ch.label}</button>
        ))}
      </div>
    </div>
  );

  /* ── ERROR ── */
  return (
    <div style={base}>
      <div style={{ textAlign: "center", maxWidth: 440, padding: "0 24px" }}>
        <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 12, color: "#EF4444", letterSpacing: 3, textTransform: "uppercase", marginBottom: 14 }}>Something went wrong</p>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, color: "#fff", marginBottom: 10 }}>The film couldn't be made.</h2>
        <p style={{ fontSize: 14, color: "#44445a", marginBottom: 32 }}>{error}</p>
        <button onClick={() => { setStage("input"); setError(""); }} style={{
          padding: "12px 32px", border: `1px solid ${BORDER}`, borderRadius: 10,
          background: "transparent", color: "#fff", cursor: "pointer", fontSize: 14,
        }}>Try again</button>
      </div>
    </div>
  );
}

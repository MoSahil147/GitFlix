import { useState, useRef } from "react";
import { Player, PlayerRef } from "@remotion/player";
import { GitflixVideo } from "./remotion/GitflixVideo";
import type { ScriptJSON } from "./remotion/types";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const FPS = 30;

const ACCENT = "#8B5CF6";
const ACCENT_DIM = "#8B5CF620";
const BG = "#080810";
const SURFACE = "#0F0F1A";
const BORDER = "#1E1E32";

const CHAPTER_FRAMES: Record<string, number> = {
  S01: 0, S02: 8 * FPS, S03: 20 * FPS,
  S04: 40 * FPS, S05: 50 * FPS, S06: 58 * FPS, S07: 70 * FPS,
};

const CHAPTERS = [
  { id: "S01", label: "Origin" }, { id: "S02", label: "Cast" },
  { id: "S03", label: "Rise" },   { id: "S04", label: "Twist" },
  { id: "S05", label: "Ghosts" }, { id: "S06", label: "Hero" },
  { id: "S07", label: "End" },
];

type Stage = "input" | "loading" | "preview" | "error";

const fontLink = document.createElement("link");
fontLink.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

export default function App() {
  const [stage, setStage]       = useState<Stage>("input");
  const [repoUrl, setRepoUrl]   = useState("");
  const [tone, setTone]         = useState<"epic" | "documentary" | "casual">("documentary");
  const [progress, setProgress] = useState({ pct: 0, msg: "" });
  const [script, setScript]     = useState<ScriptJSON | null>(null);
  const [error, setError]       = useState("");
  const playerRef               = useRef<PlayerRef>(null);

  const handleGenerate = () => {
    if (!repoUrl.includes("github.com")) {
      setError("Please enter a valid GitHub URL");
      return;
    }
    setError("");
    setStage("loading");
    setProgress({ pct: 0, msg: "Connecting..." });

    const url = `${API}/generate/stream?repo_url=${encodeURIComponent(repoUrl)}&tone=${tone}`;
    const es = new EventSource(url);

    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.stage === "done") {
        setScript(data.data);
        setStage("preview");
        es.close();
      } else if (data.stage === "error") {
        setError(data.msg);
        setStage("error");
        es.close();
      } else {
        setProgress({ pct: data.pct, msg: data.msg });
      }
    };

    es.onerror = () => {
      setError("Connection failed. Is the backend running?");
      setStage("error");
      es.close();
    };
  };

  const handleExport = async () => {
    if (!script) return;
    const res = await fetch(`${API}/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(script),
    });
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${script.repo_name.replace("/", "_")}_gitflix.mp4`;
    a.click();
  };

  const page: React.CSSProperties = {
    minHeight: "100vh",
    background: BG,
    color: "#fff",
    fontFamily: "'DM Sans', sans-serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    backgroundImage: `radial-gradient(ellipse 80% 60% at 50% -10%, ${ACCENT}18 0%, transparent 70%)`,
  };

  if (stage === "input") return (
    <div style={page}>
      <div style={{ width: "100%", maxWidth: 560, textAlign: "center" }}>
        <div style={{ marginBottom: 8 }}>
          <span style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 80, fontWeight: 900,
            color: "#fff", letterSpacing: -3, lineHeight: 1,
          }}>Git</span>
          <span style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 80, fontWeight: 900,
            fontStyle: "italic", color: ACCENT,
            letterSpacing: -3, lineHeight: 1,
          }}>flix</span>
        </div>
        <p style={{
          fontFamily: "'Playfair Display', serif",
          fontStyle: "italic", fontSize: 18,
          color: "#555570", marginBottom: 56, letterSpacing: 0.3,
        }}>
          Every repository has a story.
        </p>
        <input
          value={repoUrl}
          onChange={e => setRepoUrl(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleGenerate()}
          placeholder="https://github.com/org/repo"
          style={{
            width: "100%", padding: "16px 20px", fontSize: 15,
            background: SURFACE, border: `1px solid ${BORDER}`,
            borderRadius: 12, color: "#fff", marginBottom: 12,
            boxSizing: "border-box", outline: "none",
            fontFamily: "'DM Sans', sans-serif", letterSpacing: 0.2,
          }}
        />
        <div style={{ display: "flex", gap: 8, marginBottom: 20, justifyContent: "center" }}>
          {(["epic", "documentary", "casual"] as const).map(t => (
            <button key={t} onClick={() => setTone(t)} style={{
              padding: "8px 22px",
              border: `1px solid ${tone === t ? ACCENT : BORDER}`,
              borderRadius: 100,
              background: tone === t ? ACCENT_DIM : "transparent",
              color: tone === t ? ACCENT : "#44445a",
              cursor: "pointer", fontSize: 13,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500, textTransform: "capitalize",
              letterSpacing: 0.5,
            }}>
              {t}
            </button>
          ))}
        </div>
        <button onClick={handleGenerate} style={{
          width: "100%", padding: "16px", fontSize: 15,
          fontWeight: 500, fontFamily: "'DM Sans', sans-serif",
          background: ACCENT, border: "none", borderRadius: 12,
          color: "#fff", cursor: "pointer", letterSpacing: 0.5,
        }}>
          Generate Film
        </button>
        {error && <p style={{ marginTop: 16, color: "#EF4444", fontSize: 13 }}>{error}</p>}
      </div>
    </div>
  );

  if (stage === "loading") return (
    <div style={page}>
      <div style={{ textAlign: "center", width: "100%", maxWidth: 460 }}>
        <p style={{
          fontFamily: "'Playfair Display', serif",
          fontStyle: "italic", fontSize: 13,
          color: ACCENT, letterSpacing: 3,
          textTransform: "uppercase", marginBottom: 24,
        }}>In production</p>
        <h2 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 36, fontWeight: 700,
          marginBottom: 40, color: "#fff", lineHeight: 1.2,
        }}>Generating your film...</h2>
        <div style={{ width: "100%", height: 2, background: BORDER, borderRadius: 2, marginBottom: 16 }}>
          <div style={{
            width: `${progress.pct}%`, height: "100%",
            background: ACCENT, borderRadius: 2,
            transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: `0 0 12px ${ACCENT}88`,
          }} />
        </div>
        <p style={{ fontSize: 13, color: "#44445a", letterSpacing: 0.3 }}>{progress.msg}</p>
      </div>
    </div>
  );

  if (stage === "preview" && script) return (
    <div style={{ ...page, justifyContent: "flex-start", paddingTop: 40 }}>
      <div style={{ width: "100%", maxWidth: 1200 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
          <div>
            <p style={{
              fontFamily: "'Playfair Display', serif",
              fontStyle: "italic", fontSize: 12,
              color: ACCENT, letterSpacing: 3,
              textTransform: "uppercase", marginBottom: 6,
            }}>Now playing</p>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, color: "#fff", margin: 0 }}>
              {script.repo_name}
            </h1>
            <p style={{ fontSize: 13, color: "#44445a", marginTop: 4 }}>
              {script.total_commits} commits · {script.contributor_count} contributors · {script.repo_age_days} days
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { setStage("input"); setScript(null); }} style={{
              padding: "10px 20px", border: `1px solid ${BORDER}`,
              borderRadius: 10, background: "transparent",
              color: "#44445a", cursor: "pointer", fontSize: 13,
              fontFamily: "'DM Sans', sans-serif",
            }}>New repo</button>
            <button onClick={handleExport} style={{
              padding: "10px 20px", border: "none", borderRadius: 10,
              background: ACCENT, color: "#fff", fontWeight: 500,
              cursor: "pointer", fontSize: 13,
              fontFamily: "'DM Sans', sans-serif",
            }}>Export MP4</button>
          </div>
        </div>
        <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${BORDER}` }}>
          <Player
            ref={playerRef}
            component={GitflixVideo}
            inputProps={{ script }}
            durationInFrames={85 * FPS}
            fps={FPS}
            compositionWidth={1920}
            compositionHeight={1080}
            style={{ width: "100%" }}
            controls
          />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          {CHAPTERS.map(ch => (
            <button key={ch.id} onClick={() => playerRef.current?.seekTo(CHAPTER_FRAMES[ch.id])} style={{
              padding: "6px 16px", border: `1px solid ${BORDER}`,
              borderRadius: 100, background: "transparent",
              color: "#44445a", cursor: "pointer", fontSize: 12,
              fontFamily: "'DM Sans', sans-serif", letterSpacing: 0.3,
            }}>{ch.label}</button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div style={page}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <p style={{
          fontFamily: "'Playfair Display', serif",
          fontStyle: "italic", fontSize: 12,
          color: "#EF4444", letterSpacing: 3,
          textTransform: "uppercase", marginBottom: 16,
        }}>Something went wrong</p>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: "#fff", marginBottom: 12 }}>
          The film couldn't be made.
        </h2>
        <p style={{ fontSize: 14, color: "#44445a", marginBottom: 32 }}>{error}</p>
        <button onClick={() => { setStage("input"); setError(""); }} style={{
          padding: "12px 28px", border: `1px solid ${BORDER}`,
          borderRadius: 10, background: "transparent",
          color: "#fff", cursor: "pointer", fontSize: 14,
          fontFamily: "'DM Sans', sans-serif",
        }}>Try again</button>
      </div>
    </div>
  );
}
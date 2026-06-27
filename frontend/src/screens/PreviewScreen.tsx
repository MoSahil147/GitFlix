import React from "react";
import { Player } from "@remotion/player";
import type { PlayerRef } from "@remotion/player";
import { GitflixVideo } from "../remotion/GitflixVideo";
import { FPS } from "../remotion/constants";
import type { ScriptJSON } from "../remotion/types";
import NavBar from "../components/NavBar";
const CHAPTERS = [
  { id: "S01", label: "Origin" },
  { id: "S02", label: "Cast" },
  { id: "S03", label: "The Rise" },
  { id: "S04", label: "Plot Twist" },
  { id: "S05", label: "Ghost Files" },
  { id: "S06", label: "Hero Commit" },
  { id: "S07", label: "Finale" },
];

interface Props {
  script: ScriptJSON;
  playerRef: React.RefObject<PlayerRef | null>;
  totalFrames: number;
  chapterFrames: Record<string, number>;
  onNewFilm: () => void;
  onExport: () => void;
}

export default function PreviewScreen({ script, playerRef, totalFrames, chapterFrames, onNewFilm, onExport }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--bg)" }}>
      <NavBar
        contextual={
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {script.repo_name}
            <span style={{ margin: "0 6px", color: "var(--border-dim)" }}>·</span>
            {script.total_commits} commits
            <span style={{ margin: "0 6px", color: "var(--border-dim)" }}>·</span>
            {script.contributor_count} contributors
          </span>
        }
        actions={
          <>
            <button onClick={onNewFilm} className="btn-new-film" style={{ fontSize: 12, color: "var(--text-muted)", border: "1px solid var(--border-dim)", padding: "8px 18px", borderRadius: 6, background: "transparent", cursor: "pointer" }}>
              ← New Film
            </button>
            <button onClick={onExport} style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: "var(--accent)", border: "none", padding: "8px 18px", borderRadius: 6, cursor: "not-allowed", opacity: 0.5 }} title="Export coming soon">
              Export MP4
            </button>
          </>
        }
      />

      <div style={{ background: "#000", width: "100%" }}>
        <Player
          ref={playerRef}
          component={GitflixVideo}
          inputProps={{ script }}
          durationInFrames={totalFrames}
          fps={FPS}
          compositionWidth={1920}
          compositionHeight={1080}
          style={{ width: "100%", maxHeight: "80vh" }}
          controls
        />
      </div>

      <div style={{ borderTop: "1px solid var(--border)", padding: "14px 48px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", background: "var(--bg)" }}>
        <span style={{ fontSize: 10, color: "var(--text-mid)", textTransform: "uppercase", letterSpacing: 3, marginRight: 8 }}>Chapters</span>
        {CHAPTERS.map(ch => (
          <button
            key={ch.id}
            onClick={() => playerRef.current?.seekTo(chapterFrames[ch.id])}
            style={{ fontSize: 12, color: "var(--text-muted)", border: "1px solid var(--border-dim)", padding: "5px 14px", borderRadius: 4, background: "transparent", letterSpacing: 0.2, cursor: "pointer" }}
            onMouseEnter={e => { (e.currentTarget.style.borderColor = "var(--accent)"); (e.currentTarget.style.color = "var(--text-active)"); }}
            onMouseLeave={e => { (e.currentTarget.style.borderColor = "var(--border-dim)"); (e.currentTarget.style.color = "var(--text-muted)"); }}
          >
            {ch.label}
          </button>
        ))}
      </div>
    </div>
  );
}

import React from "react";
import { Player } from "@remotion/player";
import type { PlayerRef } from "@remotion/player";
import { GitflixVideo } from "../remotion/GitflixVideo";
import { FPS } from "../remotion/constants";
import type { ScriptJSON } from "../remotion/types";
import NavBar from "../components/NavBar";

const CHAPTERS = [
  { id: "S01", label: "Origin",      title: "Repository birth — creation date, name, and first contributor" },
  { id: "S02", label: "Cast",        title: "Top contributors and their roles: hero, ghost, late joiner, backbone" },
  { id: "S03", label: "The Rise",    title: "Commit volume over time — the repository's growth story" },
  { id: "S04", label: "Plot Twist",  title: "The single busiest week in the repository's history" },
  { id: "S05", label: "Ghost Files", title: "Files that haven't been touched in over 6 months" },
  { id: "S06", label: "Hero Commit", title: "The single largest diff ever merged into this repository" },
  { id: "S07", label: "Finale",      title: "Summary: total commits, contributors, and days active" },
];

interface Props {
  script: ScriptJSON;
  playerRef: React.RefObject<PlayerRef | null>;
  totalFrames: number;
  chapterFrames: Record<string, number>;
  onNewFilm: () => void;
  onExport: () => void;
  exporting: boolean;
  exportPct: number;
}

export default function PreviewScreen({ script, playerRef, totalFrames, chapterFrames, onNewFilm, onExport, exporting, exportPct }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--bg)" }}>
      <NavBar
        contextual={
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {script.repo_name}
            <span aria-hidden="true" style={{ margin: "0 6px", color: "var(--border-dim)" }}>·</span>
            {script.total_commits} commits
            <span aria-hidden="true" style={{ margin: "0 6px", color: "var(--border-dim)" }}>·</span>
            {script.contributor_count} contributors
          </span>
        }
        actions={
          <>
            <button type="button" onClick={onNewFilm} className="btn-new-film" title="Discard this film and generate a new one" style={{ fontSize: 12, color: "var(--text-muted)", border: "1px solid var(--border-dim)", padding: "8px 18px", borderRadius: 6, background: "transparent", cursor: "pointer" }}>
              <span aria-hidden="true">←</span> New Film
            </button>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <button
                type="button"
                onClick={onExport}
                disabled={exporting}
                aria-busy={exporting}
                aria-label={exporting ? `Exporting video, ${exportPct}% complete` : "Export MP4"}
                title={exporting ? "Export in progress — please wait" : "Download this film as an MP4 video file"}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#1a0e00",
                  background: exporting ? "var(--text-mid)" : "var(--accent)",
                  border: "none",
                  padding: "8px 18px",
                  borderRadius: 6,
                  cursor: exporting ? "not-allowed" : "pointer",
                  minWidth: 120,
                  transition: "background 0.2s ease",
                }}
              >
                {exporting ? `Rendering ${exportPct}%` : "Export MP4"}
              </button>
              {exporting && (
                <span role="status" style={{ fontSize: 10, color: "var(--text-mid)" }}>
                  Large renders may take several minutes.
                </span>
              )}
            </div>
          </>
        }
      />

      <main id="main-content" tabIndex={-1} aria-label="Film preview" style={{ background: "#000", width: "100%" }}>
        <figure style={{ margin: 0 }}>
          <figcaption className="sr-only">
            Generated film for {script.repo_name}. Press Space to play or pause, and the Left and Right arrow keys to seek through the video.
          </figcaption>
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
        </figure>
      </main>

      <nav aria-label="Chapters" style={{ borderTop: "1px solid var(--border)", padding: "14px 48px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", background: "var(--bg)" }}>
        <span aria-hidden="true" style={{ fontSize: 10, color: "var(--text-mid)", textTransform: "uppercase", letterSpacing: 3, marginRight: 8 }}>Chapters</span>
        <ul role="list" style={{ display: "flex", gap: 8, flexWrap: "wrap", listStyle: "none" }}>
          {CHAPTERS.map(ch => (
            <li key={ch.id}>
              <button
                type="button"
                className="btn-chapter"
                onClick={() => playerRef.current?.seekTo(chapterFrames[ch.id])}
                aria-label={`Jump to ${ch.label}`}
                title={ch.title}
              >
                {ch.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

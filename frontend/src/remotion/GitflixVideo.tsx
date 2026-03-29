import React from "react";
import { Series, Html5Audio, staticFile } from "remotion";
import type { ScriptJSON } from "./types";

const MUSIC: Record<string, string> = {
  epic:         staticFile("music/epic.mp3"),
  documentary:  staticFile("music/documentary.mp3"),
  casual:       staticFile("music/casual.mp3"),
};
import { S01Origin } from "./scenes/S01Origin";
import { S02Cast } from "./scenes/S02Cast";
import { S03Rise } from "./scenes/S03Rise";
import { S04PlotTwist } from "./scenes/S04PlotTwist";
import { S05GhostTowns } from "./scenes/S05GhostTowns";
import { S06HeroCommit } from "./scenes/S06HeroCommit";
import { S07FinalState } from "./scenes/S07FinalState";

const FPS = 30;

// cinematic pacing — each scene has enough time to breathe and land
export const SCENE_DURATIONS = {
  S01: 12,  // origin — dot → title → contributor → subtitle
  S02: 15,  // cast   — all character cards stagger in with time to read
  S03: 22,  // rise   — bar chart builds dramatically week by week
  S04: 13,  // twist  — slow fade reveal + stats
  S05: 13,  // ghosts — terminal reveal with pulse effect
  S06: 16,  // hero   — diff animates in + stats + subtitle
  S07: 14,  // finale — stats stagger + Gitflix watermark + narration
};

const getNarration = (script: ScriptJSON, id: string) =>
  script.scenes.find((s) => s.scene_id === id)?.narration_text ?? "";

const getAudio = (script: ScriptJSON, id: string) =>
  script.scenes.find((s) => s.scene_id === id)?.audio_url;

export const GitflixVideo: React.FC<{ script: ScriptJSON }> = ({ script }) => (
  <>
    {/* background music plays across the entire film at low volume */}
    <Html5Audio src={MUSIC[script.tone] ?? MUSIC.documentary} volume={0.18} />

    <Series>
      <Series.Sequence durationInFrames={SCENE_DURATIONS.S01 * FPS}>
        {getAudio(script, "S01") && (
          <Html5Audio src={getAudio(script, "S01")!} volume={0.9} />
        )}
        <S01Origin
          repoName={script.repo_name}
          firstContributor={script.characters[0]?.login ?? "unknown"}
          narration={getNarration(script, "S01")}
        />
      </Series.Sequence>

      <Series.Sequence durationInFrames={SCENE_DURATIONS.S02 * FPS}>
        {getAudio(script, "S02") && (
          <Html5Audio src={getAudio(script, "S02")!} volume={0.9} />
        )}
        <S02Cast
          characters={script.characters}
          narration={getNarration(script, "S02")}
        />
      </Series.Sequence>

      <Series.Sequence durationInFrames={SCENE_DURATIONS.S03 * FPS}>
        {getAudio(script, "S03") && (
          <Html5Audio src={getAudio(script, "S03")!} volume={0.9} />
        )}
        <S03Rise
          commitSeries={script.commit_series}
          narration={getNarration(script, "S03")}
        />
      </Series.Sequence>

      <Series.Sequence durationInFrames={SCENE_DURATIONS.S04 * FPS}>
        {getAudio(script, "S04") && (
          <Html5Audio src={getAudio(script, "S04")!} volume={0.9} />
        )}
        <S04PlotTwist
          commitSeries={script.commit_series}
          narration={getNarration(script, "S04")}
        />
      </Series.Sequence>

      <Series.Sequence durationInFrames={SCENE_DURATIONS.S05 * FPS}>
        {getAudio(script, "S05") && (
          <Html5Audio src={getAudio(script, "S05")!} volume={0.9} />
        )}
        <S05GhostTowns
          ghostFiles={script.ghost_files}
          narration={getNarration(script, "S05")}
        />
      </Series.Sequence>

      <Series.Sequence durationInFrames={SCENE_DURATIONS.S06 * FPS}>
        {getAudio(script, "S06") && (
          <Html5Audio src={getAudio(script, "S06")!} volume={0.9} />
        )}
        <S06HeroCommit
          heroCommit={script.hero_commit}
          narration={getNarration(script, "S06")}
        />
      </Series.Sequence>

      <Series.Sequence durationInFrames={SCENE_DURATIONS.S07 * FPS}>
        {getAudio(script, "S07") && (
          <Html5Audio src={getAudio(script, "S07")!} volume={0.9} />
        )}
        <S07FinalState
          script={script}
          narration={getNarration(script, "S07")}
        />
      </Series.Sequence>
    </Series>
  </>
);

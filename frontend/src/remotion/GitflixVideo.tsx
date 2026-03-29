import React from "react";
import { Series, Audio } from "remotion";
import type { ScriptJSON } from "./types";
import { S01Origin } from "./scenes/S01Origin";
import { S02Cast } from "./scenes/S02Cast";
import { S03Rise } from "./scenes/S03Rise";
import { S04PlotTwist } from "./scenes/S04PlotTwist";
import { S05GhostTowns } from "./scenes/S05GhostTowns";
import { S06HeroCommit } from "./scenes/S06HeroCommit";
import { S07FinalState } from "./scenes/S07FinalState";

const FPS = 30;

// tighter scene durations — keeps the film punchy
export const SCENE_DURATIONS = {
  S01: 5,   // origin
  S02: 7,   // cast
  S03: 10,  // rise (bar chart)
  S04: 5,   // plot twist
  S05: 5,   // ghost towns
  S06: 8,   // hero commit
  S07: 8,   // final state
};

const getNarration = (script: ScriptJSON, id: string) =>
  script.scenes.find((s) => s.scene_id === id)?.narration_text ?? "";

const getAudio = (script: ScriptJSON, id: string) =>
  script.scenes.find((s) => s.scene_id === id)?.audio_url;

export const GitflixVideo: React.FC<{ script: ScriptJSON }> = ({ script }) => (
  <Series>
    <Series.Sequence durationInFrames={SCENE_DURATIONS.S01 * FPS}>
      {getAudio(script, "S01") && <Audio src={getAudio(script, "S01")!} />}
      <S01Origin
        repoName={script.repo_name}
        firstContributor={script.characters[0]?.login ?? "unknown"}
        narration={getNarration(script, "S01")}
      />
    </Series.Sequence>

    <Series.Sequence durationInFrames={SCENE_DURATIONS.S02 * FPS}>
      {getAudio(script, "S02") && <Audio src={getAudio(script, "S02")!} />}
      <S02Cast
        characters={script.characters}
        narration={getNarration(script, "S02")}
      />
    </Series.Sequence>

    <Series.Sequence durationInFrames={SCENE_DURATIONS.S03 * FPS}>
      {getAudio(script, "S03") && <Audio src={getAudio(script, "S03")!} />}
      <S03Rise
        commitSeries={script.commit_series}
        narration={getNarration(script, "S03")}
      />
    </Series.Sequence>

    <Series.Sequence durationInFrames={SCENE_DURATIONS.S04 * FPS}>
      {getAudio(script, "S04") && <Audio src={getAudio(script, "S04")!} />}
      <S04PlotTwist
        commitSeries={script.commit_series}
        narration={getNarration(script, "S04")}
      />
    </Series.Sequence>

    <Series.Sequence durationInFrames={SCENE_DURATIONS.S05 * FPS}>
      {getAudio(script, "S05") && <Audio src={getAudio(script, "S05")!} />}
      <S05GhostTowns
        ghostFiles={script.ghost_files}
        narration={getNarration(script, "S05")}
      />
    </Series.Sequence>

    <Series.Sequence durationInFrames={SCENE_DURATIONS.S06 * FPS}>
      {getAudio(script, "S06") && <Audio src={getAudio(script, "S06")!} />}
      <S06HeroCommit
        heroCommit={script.hero_commit}
        narration={getNarration(script, "S06")}
      />
    </Series.Sequence>

    <Series.Sequence durationInFrames={SCENE_DURATIONS.S07 * FPS}>
      {getAudio(script, "S07") && <Audio src={getAudio(script, "S07")!} />}
      <S07FinalState
        script={script}
        narration={getNarration(script, "S07")}
      />
    </Series.Sequence>
  </Series>
);

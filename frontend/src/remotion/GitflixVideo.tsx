import React from "react";
import { Series } from "remotion";
import type { ScriptJSON } from "./types";
import { S01Origin } from "./scenes/S01Origin";
import { S02Cast } from "./scenes/S02Cast";
import { S03Rise } from "./scenes/S03Rise";
import { S04PlotTwist } from "./scenes/S04PlotTwist";
import { S05GhostTowns } from "./scenes/S05GhostTowns";
import { S06HeroCommit } from "./scenes/S06HeroCommit";
import { S07FinalState } from "./scenes/S07FinalState";

const FPS = 30;

// helper to find the narration text for a scene by its id
const getNarration = (script: ScriptJSON, id: string) =>
  script.scenes.find((s) => s.scene_id === id)?.narration_text ?? "";

// Series sequences the scenes one after another
// durationInFrames = seconds * fps
export const GitflixVideo: React.FC<{ script: ScriptJSON }> = ({ script }) => (
  <Series>
    <Series.Sequence durationInFrames={8 * FPS}>
      <S01Origin
        repoName={script.repo_name}
        firstContributor={script.characters[0]?.login ?? "unknown"}
        narration={getNarration(script, "S01")}
      />
    </Series.Sequence>

    <Series.Sequence durationInFrames={12 * FPS}>
      <S02Cast
        characters={script.characters}
        narration={getNarration(script, "S02")}
      />
    </Series.Sequence>

    <Series.Sequence durationInFrames={20 * FPS}>
      <S03Rise
        commitSeries={script.commit_series}
        narration={getNarration(script, "S03")}
      />
    </Series.Sequence>

    <Series.Sequence durationInFrames={10 * FPS}>
      <S04PlotTwist
        commitSeries={script.commit_series}
        narration={getNarration(script, "S04")}
      />
    </Series.Sequence>

    <Series.Sequence durationInFrames={8 * FPS}>
      <S05GhostTowns
        ghostFiles={script.ghost_files}
        narration={getNarration(script, "S05")}
      />
    </Series.Sequence>

    <Series.Sequence durationInFrames={12 * FPS}>
      <S06HeroCommit
        heroCommit={script.hero_commit}
        narration={getNarration(script, "S06")}
      />
    </Series.Sequence>

    <Series.Sequence durationInFrames={15 * FPS}>
      <S07FinalState
        script={script}
        narration={getNarration(script, "S07")}
      />
    </Series.Sequence>
  </Series>
);
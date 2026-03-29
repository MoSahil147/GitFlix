import React from "react";
import { Series, Html5Audio, staticFile, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { ScriptJSON } from "./types";
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
  S01: 12,  // origin
  S02: 15,  // cast
  S03: 22,  // commit share pie chart
  S04: 13,  // twist
  S05: 13,  // ghosts
  S06: 16,  // hero
  S07: 14,  // finale
};

const MUSIC: Record<string, string> = {
  epic:         staticFile("music/epic.mp3"),
  documentary:  staticFile("music/documentary.mp3"),
  casual:       staticFile("music/casual.mp3"),
};

const getNarration = (script: ScriptJSON, id: string) =>
  script.scenes.find((s) => s.scene_id === id)?.narration_text ?? "";

// Fades each scene in from black and out to black — smooth cinematic transition
const Fade: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const FRAMES = 18;
  const fadeIn  = interpolate(frame, [0, FRAMES], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - FRAMES, durationInFrames], [1, 0], { extrapolateRight: "clamp" });
  return (
    <div style={{ opacity: Math.min(fadeIn, fadeOut), width: "100%", height: "100%" }}>
      {children}
    </div>
  );
};

export const GitflixVideo: React.FC<{ script: ScriptJSON }> = ({ script }) => (
  <>
    {/* background music — stops exactly when video ends */}
    <Html5Audio src={MUSIC[script.tone] ?? MUSIC.documentary} volume={0.18} />

    <Series>
      <Series.Sequence durationInFrames={SCENE_DURATIONS.S01 * FPS}>
        <Fade>
          <S01Origin
            repoName={script.repo_name}
            firstContributor={script.characters[0]?.login ?? "unknown"}
            narration={getNarration(script, "S01")}
          />
        </Fade>
      </Series.Sequence>

      <Series.Sequence durationInFrames={SCENE_DURATIONS.S02 * FPS}>
        <Fade>
          <S02Cast
            characters={script.characters}
            narration={getNarration(script, "S02")}
          />
        </Fade>
      </Series.Sequence>

      <Series.Sequence durationInFrames={SCENE_DURATIONS.S03 * FPS}>
        <Fade>
          <S03Rise
            characters={script.characters}
            narration={getNarration(script, "S03")}
          />
        </Fade>
      </Series.Sequence>

      <Series.Sequence durationInFrames={SCENE_DURATIONS.S04 * FPS}>
        <Fade>
          <S04PlotTwist
            commitSeries={script.commit_series}
            narration={getNarration(script, "S04")}
          />
        </Fade>
      </Series.Sequence>

      <Series.Sequence durationInFrames={SCENE_DURATIONS.S05 * FPS}>
        <Fade>
          <S05GhostTowns
            ghostFiles={script.ghost_files}
            narration={getNarration(script, "S05")}
          />
        </Fade>
      </Series.Sequence>

      <Series.Sequence durationInFrames={SCENE_DURATIONS.S06 * FPS}>
        <Fade>
          <S06HeroCommit
            heroCommit={script.hero_commit}
            narration={getNarration(script, "S06")}
          />
        </Fade>
      </Series.Sequence>

      <Series.Sequence durationInFrames={SCENE_DURATIONS.S07 * FPS}>
        <Fade>
          <S07FinalState
            script={script}
            narration={getNarration(script, "S07")}
          />
        </Fade>
      </Series.Sequence>
    </Series>
  </>
);

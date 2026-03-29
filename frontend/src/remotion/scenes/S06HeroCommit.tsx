import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { HeroCommit } from "../types";

// fake diff lines to animate in — gives the feel of a real code change
const DIFF_LINES = [
  { type: "add",     text: "+ feat: complete rewrite of core engine" },
  { type: "add",     text: "+ const engine = new CoreEngine({ optimized: true })" },
  { type: "remove",  text: "- const engine = new OldEngine()" },
  { type: "add",     text: "+ engine.init(config)" },
  { type: "neutral", text: "  // Performance improved 10x" },
];

// colour for each line type
const COLOR = {
  add: "#5DCAA5",
  remove: "#D85A30",
  neutral: "#666",
};

export const S06HeroCommit: React.FC<{
  heroCommit: HeroCommit;
  narration: string;
}> = ({ heroCommit, narration }) => {
  const frame = useCurrentFrame();

  // how many diff lines to show — grows over time
  const linesVisible = Math.floor(
    interpolate(frame, [20, 100], [0, DIFF_LINES.length], {
      extrapolateRight: "clamp",
    })
  );

  // stats fade in after the diff is done
  const statsOpacity = interpolate(
    frame, [110, 140], [0, 1],
    { extrapolateRight: "clamp" }
  );

  // narration fades in last
  const narrationOpacity = interpolate(
    frame, [150, 180], [0, 1],
    { extrapolateRight: "clamp" }
  );

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "#0a0a0f",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "sans-serif",
    }}>
      {/* section label */}
      <div style={{
        fontSize: 18, color: "#555",
        letterSpacing: 4, textTransform: "uppercase",
        marginBottom: 32,
      }}>
        The Hero Moment
      </div>

      {/* diff viewer box */}
      <div style={{
        background: "#111",
        border: "1px solid #333",
        borderRadius: 12,
        padding: "28px 36px",
        width: 900,
        marginBottom: 32,
      }}>
        {/* commit sha */}
        <div style={{
          fontSize: 13, color: "#555",
          marginBottom: 16,
          fontFamily: "monospace",
        }}>
          commit {heroCommit.sha}
        </div>

        {/* diff lines animate in one by one */}
        {DIFF_LINES.slice(0, linesVisible).map((line, i) => (
          <div key={i} style={{
            fontFamily: "monospace",
            fontSize: 16,
            color: COLOR[line.type as keyof typeof COLOR],
            marginBottom: 6,
          }}>
            {line.text}
          </div>
        ))}
      </div>

      {/* stats — lines changed and author */}
      <div style={{
        opacity: statsOpacity,
        display: "flex",
        gap: 32,
        marginBottom: 32,
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 700, color: "#5DCAA5" }}>
            +{heroCommit.lines_changed}
          </div>
          <div style={{ fontSize: 13, color: "#555" }}>lines changed</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 700, color: "#fff" }}>
            {heroCommit.author_login}
          </div>
          <div style={{ fontSize: 13, color: "#555" }}>author</div>
        </div>
      </div>

      {/* narration */}
      <div style={{
        opacity: narrationOpacity,
        fontSize: 18, color: "#888",
        maxWidth: 800, textAlign: "center",
      }}>
        {narration}
      </div>
    </div>
  );
};
import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import type { HeroCommit } from "../types";

const DIFF_LINES = [
  { type: "add",     text: "+ feat: complete rewrite of core engine" },
  { type: "add",     text: "+ const engine = new CoreEngine({ optimized: true })" },
  { type: "remove",  text: "- const engine = new OldEngine()" },
  { type: "add",     text: "+ engine.init(config)" },
  { type: "neutral", text: "  // Performance improved 10x" },
  { type: "add",     text: "+ export default engine" },
];

const LINE_COLOR = { add: "#5DCAA5", remove: "#e05a5a", neutral: "#44445a" };

export const S06HeroCommit: React.FC<{
  heroCommit: HeroCommit;
  narration: string;
}> = ({ heroCommit, narration }) => {
  const frame = useCurrentFrame();

  const labelOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const boxOpacity   = interpolate(frame, [10, 25], [0, 1], { extrapolateRight: "clamp" });

  // diff lines appear quickly
  const linesVisible = Math.floor(
    interpolate(frame, [20, 70], [0, DIFF_LINES.length], { extrapolateRight: "clamp" })
  );

  const statsOpacity = interpolate(frame, [80, 100], [0, 1], { extrapolateRight: "clamp" });
  const narOpacity   = interpolate(frame, [120, 140], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "radial-gradient(ellipse at 50% 40%, #0a1a0a 0%, #050508 65%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "sans-serif",
    }}>
      <div style={{ opacity: labelOpacity, fontSize: 13, color: "#5DCAA5", letterSpacing: 5, textTransform: "uppercase", marginBottom: 24 }}>
        The Hero Moment
      </div>

      {/* diff box */}
      <div style={{
        opacity: boxOpacity,
        background: "#080810", border: "1px solid #1a2a1a",
        borderRadius: 12, padding: "24px 32px", width: 860, marginBottom: 28,
        boxShadow: "0 0 40px #5DCAA515",
      }}>
        {/* terminal dots */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {["#e05a5a", "#EF9F27", "#5DCAA5"].map(c => (
            <div key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c, opacity: 0.6 }} />
          ))}
        </div>
        <div style={{ fontFamily: "monospace", fontSize: 12, color: "#2a2a44", marginBottom: 14 }}>
          commit {heroCommit.sha}
        </div>
        {DIFF_LINES.slice(0, linesVisible).map((line, i) => (
          <div key={i} style={{
            fontFamily: "monospace", fontSize: 15,
            color: LINE_COLOR[line.type as keyof typeof LINE_COLOR],
            marginBottom: 5,
          }}>
            {line.text}
          </div>
        ))}
      </div>

      {/* stats */}
      <div style={{ opacity: statsOpacity, display: "flex", gap: 48, marginBottom: 28 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 44, fontWeight: 800, color: "#5DCAA5" }}>+{heroCommit.lines_changed.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: "#2a3a2a", textTransform: "uppercase", letterSpacing: 2 }}>lines changed</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 44, fontWeight: 800, color: "#fff" }}>{heroCommit.author_login}</div>
          <div style={{ fontSize: 11, color: "#2a3a2a", textTransform: "uppercase", letterSpacing: 2 }}>author</div>
        </div>
      </div>

      <div style={{ opacity: narOpacity, fontSize: 16, color: "#33334a", maxWidth: 800, textAlign: "center", fontStyle: "italic" }}>
        {narration}
      </div>
    </div>
  );
};

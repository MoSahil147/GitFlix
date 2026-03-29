import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import type { CommitPoint } from "../types";

export const S04PlotTwist: React.FC<{
  commitSeries: CommitPoint[];
  narration: string;
}> = ({ commitSeries, narration }) => {
  const frame = useCurrentFrame();

  // find the biggest single-week drop
  let twistIdx = 1, maxDrop = -Infinity;
  for (let i = 1; i < commitSeries.length; i++) {
    const drop = commitSeries[i - 1].count - commitSeries[i].count;
    if (drop > maxDrop) { maxDrop = drop; twistIdx = i; }
  }
  const twistWeek = commitSeries[twistIdx]?.week ?? "—";
  const dropAmt   = Math.max(maxDrop, 0);

  // cinematic slow reveal — no jarring flash
  const bgOpacity    = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const labelOpacity = interpolate(frame, [10, 28], [0, 1], { extrapolateRight: "clamp" });
  const titleOpacity = interpolate(frame, [22, 45], [0, 1], { extrapolateRight: "clamp" });
  const titleY       = interpolate(frame, [22, 45], [30, 0], { extrapolateRight: "clamp" });
  const statsOpacity = interpolate(frame, [50, 70], [0, 1], { extrapolateRight: "clamp" });
  const narOpacity   = interpolate(frame, [90, 110], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "radial-gradient(ellipse at 50% 30%, #1a0808 0%, #050508 65%)",
      opacity: bgOpacity,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "sans-serif",
    }}>
      {/* label */}
      <div style={{
        opacity: labelOpacity,
        fontSize: 13, color: "#e05a5a",
        letterSpacing: 6, textTransform: "uppercase", marginBottom: 24,
      }}>
        Plot Twist
      </div>

      {/* main title */}
      <div style={{
        opacity: titleOpacity,
        transform: `translateY(${titleY}px)`,
        fontSize: 80, fontWeight: 900, color: "#fff",
        lineHeight: 1.05, textAlign: "center", marginBottom: 48,
        textShadow: "0 0 60px #e05a5a44",
      }}>
        Then everything<br />changed.
      </div>

      {/* stats row */}
      <div style={{
        opacity: statsOpacity,
        display: "flex", gap: 48, marginBottom: 40,
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 44, fontWeight: 800, color: "#e05a5a" }}>−{dropAmt}</div>
          <div style={{ fontSize: 12, color: "#4a2222", textTransform: "uppercase", letterSpacing: 2 }}>commits dropped</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 44, fontWeight: 800, color: "#fff" }}>{twistWeek}</div>
          <div style={{ fontSize: 12, color: "#4a2222", textTransform: "uppercase", letterSpacing: 2 }}>turning point</div>
        </div>
      </div>

      {/* narration */}
      <div style={{
        opacity: narOpacity,
        fontSize: 16, color: "#4a2222",
        maxWidth: 800, textAlign: "center", fontStyle: "italic",
      }}>
        {narration}
      </div>
    </div>
  );
};

import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import type { CommitPoint } from "../types";
import { Subtitle } from "../Subtitle";

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

  const bgOpacity    = interpolate(frame, [0, 20],  [0, 1], { extrapolateRight: "clamp" });
  const labelOpacity = interpolate(frame, [12, 28], [0, 1], { extrapolateRight: "clamp" });
  const titleOpacity = interpolate(frame, [25, 50], [0, 1], { extrapolateRight: "clamp" });
  const titleY       = interpolate(frame, [25, 50], [30, 0], { extrapolateRight: "clamp" });
  const statsOpacity = interpolate(frame, [55, 75], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "radial-gradient(ellipse at 50% 30%, #1a0808 0%, #050508 65%)",
      opacity: bgOpacity,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "sans-serif",
      position: "relative",
    }}>
      <div style={{
        opacity: labelOpacity,
        fontSize: 13, color: "#e05a5a",
        letterSpacing: 6, textTransform: "uppercase", marginBottom: 24,
      }}>
        Plot Twist
      </div>

      <div style={{
        opacity: titleOpacity,
        transform: `translateY(${titleY}px)`,
        fontSize: 80, fontWeight: 900, color: "#fff",
        lineHeight: 1.05, textAlign: "center", marginBottom: 52,
        textShadow: "0 0 60px #e05a5a44",
      }}>
        Then everything<br />changed.
      </div>

      <div style={{ opacity: statsOpacity, display: "flex", gap: 56, marginBottom: 32 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, fontWeight: 800, color: "#e05a5a" }}>−{dropAmt}</div>
          <div style={{ fontSize: 11, color: "#4a2222", textTransform: "uppercase", letterSpacing: 2, marginTop: 6 }}>
            commits dropped
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, fontWeight: 800, color: "#fff" }}>{twistWeek}</div>
          <div style={{ fontSize: 11, color: "#4a2222", textTransform: "uppercase", letterSpacing: 2, marginTop: 6 }}>
            turning point
          </div>
        </div>
      </div>

      <Subtitle text={narration} startFrame={130} />
    </div>
  );
};

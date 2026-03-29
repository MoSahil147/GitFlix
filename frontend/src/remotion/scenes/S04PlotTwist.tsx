import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import type { CommitPoint, PlotTwist } from "../types";
import { Subtitle } from "../Subtitle";

function formatWeek(week: string): string {
  const d = new Date(week + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export const S04PlotTwist: React.FC<{
  plotTwist?: PlotTwist;
  commitSeries: CommitPoint[];
  narration: string;
}> = ({ plotTwist, commitSeries, narration }) => {
  const frame = useCurrentFrame();

  // Use backend plot_twist if available; otherwise fall back to biggest drop in series
  let twistWeek: string;
  let dropAmt: number;

  if (plotTwist) {
    twistWeek = formatWeek(plotTwist.week);
    dropAmt   = plotTwist.commit_count;
  } else {
    let twistIdx = 1, maxDrop = -Infinity;
    for (let i = 1; i < commitSeries.length; i++) {
      const drop = commitSeries[i - 1].count - commitSeries[i].count;
      if (drop > maxDrop) { maxDrop = drop; twistIdx = i; }
    }
    twistWeek = commitSeries[twistIdx]?.week ? formatWeek(commitSeries[twistIdx].week) : "—";
    dropAmt   = Math.max(maxDrop, 0);
  }

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
          <div style={{ fontSize: 48, fontWeight: 800, color: "#e05a5a" }}>
            {plotTwist ? `+${dropAmt}` : `−${dropAmt}`}
          </div>
          <div style={{ fontSize: 11, color: "#4a2222", textTransform: "uppercase", letterSpacing: 2, marginTop: 6 }}>
            {plotTwist ? "commits that week" : "commits dropped"}
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

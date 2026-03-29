import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { CommitPoint } from "../types";

export const S03Rise: React.FC<{
  commitSeries: CommitPoint[];
  narration: string;
}> = ({ commitSeries, narration }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const data = commitSeries.slice(0, 52);
  const maxCount = Math.max(...data.map(d => d.count), 1);

  // all bars revealed by 70% of the scene
  const barsToShow = Math.floor(
    interpolate(frame, [0, durationInFrames * 0.7], [0, data.length], { extrapolateRight: "clamp" })
  );

  const narrationOpacity = interpolate(frame, [durationInFrames * 0.75, durationInFrames * 0.9], [0, 1], { extrapolateRight: "clamp" });
  const CHART_H = 380;
  const BAR_W   = Math.floor(1400 / data.length) - 2;

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "radial-gradient(ellipse at 50% 60%, #0a1a0a 0%, #050508 70%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "sans-serif",
    }}>
      <div style={{ fontSize: 15, color: "#5DCAA5", letterSpacing: 5, textTransform: "uppercase", marginBottom: 36 }}>
        Commit Activity
      </div>

      {/* bar chart */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: CHART_H }}>
        {data.map((d, i) => {
          const h = (d.count / maxCount) * CHART_H;
          const visible = i < barsToShow;
          const isSpike = d.count > maxCount * 0.7;
          return (
            <div key={i} style={{
              width: BAR_W, height: visible ? h : 0,
              background: isSpike
                ? "linear-gradient(180deg, #f5c842 0%, #EF9F27 100%)"
                : "linear-gradient(180deg, #5DCAA5 0%, #3aaa85 100%)",
              opacity: visible ? 1 : 0,
              transition: "height 0.08s, opacity 0.08s",
              borderRadius: "3px 3px 0 0",
              boxShadow: isSpike ? "0 0 10px #EF9F2760" : "0 0 6px #5DCAA530",
            }} />
          );
        })}
      </div>

      {/* baseline */}
      <div style={{ width: 1400, height: 1, background: "#1a1a2a", marginBottom: 28 }} />

      <div style={{ opacity: narrationOpacity, fontSize: 16, color: "#33334a", maxWidth: 800, textAlign: "center", fontStyle: "italic" }}>
        {narration}
      </div>
    </div>
  );
};

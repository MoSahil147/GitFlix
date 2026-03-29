import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { CommitPoint } from "../types";
import { Subtitle } from "../Subtitle";

export const S03Rise: React.FC<{
  commitSeries: CommitPoint[];
  narration: string;
}> = ({ commitSeries, narration }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const data = commitSeries.slice(0, 52);
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  // all bars revealed by 75% of the scene
  const barsToShow = Math.floor(
    interpolate(frame, [0, durationInFrames * 0.75], [0, data.length], {
      extrapolateRight: "clamp",
    })
  );

  const CHART_H = 560;
  // bar width: generous minimum, cap at 56px so wide repos don't overflow
  const BAR_W = Math.min(56, Math.floor(1560 / Math.max(data.length, 1)) - 4);

  const labelOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const axisOpacity  = interpolate(frame, [10, 25], [0, 1], { extrapolateRight: "clamp" });

  // x-axis: show a label every N bars so they don't overlap
  const labelEvery = data.length <= 12 ? 1 : data.length <= 26 ? 2 : 4;

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "radial-gradient(ellipse at 50% 60%, #0a1a0a 0%, #050508 70%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "sans-serif",
      position: "relative",
    }}>
      <div style={{ opacity: labelOpacity, fontSize: 18, color: "#5DCAA5", letterSpacing: 5, textTransform: "uppercase", marginBottom: 28 }}>
        Commit Activity
      </div>

      <div style={{
        opacity: axisOpacity,
        display: "flex", alignItems: "flex-end", gap: 0, position: "relative",
      }}>
        {/* y-axis labels */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: CHART_H, marginRight: 14, alignItems: "flex-end" }}>
          {[maxCount, Math.round(maxCount / 2), 0].map((v) => (
            <div key={v} style={{ fontSize: 14, color: "#4a6a4a", lineHeight: 1, fontWeight: 600 }}>{v}</div>
          ))}
        </div>

        {/* bars + axes */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: CHART_H }}>
            {data.map((d, i) => {
              const h = Math.max((d.count / maxCount) * CHART_H, d.count > 0 ? 4 : 0);
              const visible = i < barsToShow;
              const isSpike = d.count > maxCount * 0.7;
              return (
                <div key={i} style={{
                  width: BAR_W, height: visible ? h : 0, opacity: visible ? 1 : 0,
                  background: isSpike
                    ? "linear-gradient(180deg, #f5c842 0%, #EF9F27 100%)"
                    : "linear-gradient(180deg, #5DCAA5 0%, #3aaa85 100%)",
                  transition: "height 0.06s, opacity 0.06s",
                  borderRadius: "4px 4px 0 0",
                  boxShadow: isSpike ? "0 0 10px #EF9F2766" : "0 0 6px #5DCAA530",
                  flexShrink: 0,
                }} />
              );
            })}
          </div>

          {/* baseline */}
          <div style={{ width: data.length * (BAR_W + 4), height: 2, background: "#2a3a2a", marginBottom: 8 }} />

          {/* x-axis labels */}
          <div style={{ display: "flex", gap: 4 }}>
            {data.map((d, i) => (
              <div key={i} style={{
                width: BAR_W, fontSize: 11, color: "#4a6a4a",
                textAlign: "center", flexShrink: 0,
                overflow: "hidden", fontWeight: 500,
              }}>
                {i % labelEvery === 0
                  ? d.week.replace(/\d{4}-/, "").replace(/-\d{2}$/, "")
                  : ""}
              </div>
            ))}
          </div>
        </div>
      </div>

      <Subtitle text={narration} startFrame={Math.floor(durationInFrames * 0.7)} />
    </div>
  );
};

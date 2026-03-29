import React from "react";
import { useCurrentFrame, interpolate, useVideoConfig } from "remotion";
import { CommitPoint } from "../types";

export const S03Rise: React.FC<{
  commitSeries: CommitPoint[];
  narration: string;
}> = ({ commitSeries, narration }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // only use first 52 weeks (1 year)
  const data = commitSeries.slice(0, 52);

  // highest commit count in any week — used to scale bar heights
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  // how many bars to show — grows over time as film plays
  // by 80% of the scene duration all bars are visible
  const barsToShow = Math.floor(
    interpolate(frame, [0, durationInFrames * 0.8], [0, data.length], {
      extrapolateRight: "clamp",
    })
  );

  // narration fades in near the end of the scene
  const narrationOpacity = interpolate(
    frame,
    [durationInFrames * 0.7, durationInFrames * 0.9],
    [0, 1],
    { extrapolateRight: "clamp" }
  );

  const CHART_HEIGHT = 400;

  // bar width fits all bars across 1400px
  const BAR_WIDTH = Math.floor(1400 / data.length) - 2;

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
        marginBottom: 48,
      }}>
        The Rise
      </div>

      {/* bar chart */}
      <div style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 2,
        height: CHART_HEIGHT,
      }}>
        {data.map((d, i) => {
          // height of this bar relative to the tallest bar
          const height = (d.count / maxCount) * CHART_HEIGHT;

          // only show bars up to barsToShow
          const visible = i < barsToShow;

          // spike weeks get a different colour — orange instead of green
          const isSpike = d.count > maxCount * 0.7;

          return (
            <div key={i} style={{
              width: BAR_WIDTH,
              height: visible ? height : 0,
              background: isSpike ? "#EF9F27" : "#5DCAA5",
              opacity: visible ? 1 : 0,
              transition: "height 0.1s, opacity 0.1s",
              borderRadius: "2px 2px 0 0",
            }} />
          );
        })}
      </div>

      {/* baseline */}
      <div style={{
        width: 1400, height: 1,
        background: "#333",
        marginBottom: 40,
      }} />

      {/* narration */}
      <div style={{
        opacity: narrationOpacity,
        fontSize: 18, color: "#888",
        maxWidth: 900, textAlign: "center",
      }}>
        {narration}
      </div>
    </div>
  );
};
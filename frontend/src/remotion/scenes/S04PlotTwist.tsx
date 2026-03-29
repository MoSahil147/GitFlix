import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import type { CommitPoint } from "../types";

export const S04PlotTwist: React.FC<{
  commitSeries: CommitPoint[];
  narration: string;
}> = ({ narration }) => {
  const frame = useCurrentFrame();

  // white flash at the very start — dramatic effect
  const flashOpacity = interpolate(
    frame, [0, 5, 15], [0, 1, 0],
    { extrapolateRight: "clamp" }
  );

  // main text fades in after the flash
  const textOpacity = interpolate(
    frame, [20, 50], [0, 1],
    { extrapolateRight: "clamp" }
  );

  // narration fades in last
  const narrationOpacity = interpolate(
    frame, [80, 110], [0, 1],
    { extrapolateRight: "clamp" }
  );

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "#0a0a0f",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "sans-serif",
      position: "relative",
    }}>
      {/* white flash overlay — appears and disappears in 15 frames */}
      <div style={{
        position: "absolute", inset: 0,
        background: "#ffffff",
        opacity: flashOpacity,
        pointerEvents: "none",
      }} />

      {/* plot twist label */}
      <div style={{
        fontSize: 18, color: "#EF9F27",
        letterSpacing: 4, textTransform: "uppercase",
        marginBottom: 32,
        opacity: textOpacity,
      }}>
        Plot Twist
      </div>

      {/* big dramatic text */}
      <div style={{
        fontSize: 88, fontWeight: 900,
        color: "#ffffff",
        opacity: textOpacity,
        lineHeight: 1,
        marginBottom: 24,
        textAlign: "center",
      }}>
        Then everything<br />changed.
      </div>

      {/* narration */}
      <div style={{
        opacity: narrationOpacity,
        fontSize: 20, color: "#888",
        maxWidth: 900, textAlign: "center",
        lineHeight: 1.6, marginTop: 40,
      }}>
        {narration}
      </div>
    </div>
  );
};
import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface Props {
  text: string;
  startFrame?: number; // frame at which subtitle fades in
}

// Renders narration as a cinematic subtitle bar at the bottom of the frame.
export const Subtitle: React.FC<Props> = ({ text, startFrame = 20 }) => {
  const frame = useCurrentFrame();
  if (!text) return null;

  const opacity = interpolate(frame, [startFrame, startFrame + 12], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 52,
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(0, 0, 0, 0.72)",
        backdropFilter: "blur(6px)",
        padding: "10px 32px",
        borderRadius: 6,
        maxWidth: 1100,
        textAlign: "center",
        opacity,
        pointerEvents: "none",
        whiteSpace: "normal",
      }}
    >
      <span
        style={{
          fontSize: 20,
          color: "#d0d0d0",
          lineHeight: 1.5,
          fontFamily: "sans-serif",
          fontWeight: 300,
          letterSpacing: 0.3,
        }}
      >
        {text}
      </span>
    </div>
  );
};

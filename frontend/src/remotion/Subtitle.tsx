import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

interface Props {
  text: string;
  startFrame?: number;
}

// Splits narration into sentences and shows them one at a time with fade transitions.
export const Subtitle: React.FC<Props> = ({ text, startFrame = 20 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  if (!text) return null;

  // Split on sentence boundaries
  const lines = (text.match(/[^.!?]+[.!?]*/g) ?? [text])
    .map((s) => s.trim())
    .filter(Boolean);

  const availableFrames = Math.max(durationInFrames - startFrame, 1);
  const framesPerLine = Math.floor(availableFrames / lines.length);

  if (frame < startFrame) return null;

  const elapsed = frame - startFrame;
  const lineIdx = Math.min(
    Math.floor(elapsed / framesPerLine),
    lines.length - 1
  );
  const lineFrame = elapsed - lineIdx * framesPerLine;

  const FADE = 8;
  const fadeIn  = interpolate(lineFrame, [0, FADE], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(lineFrame, [framesPerLine - FADE, framesPerLine], [1, 0], { extrapolateRight: "clamp" });
  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 52,
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(6px)",
        padding: "10px 32px",
        borderRadius: 6,
        maxWidth: 1100,
        textAlign: "center",
        opacity,
        pointerEvents: "none",
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
        {lines[lineIdx]}
      </span>
    </div>
  );
};

import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

interface Props {
  text: string;
  startFrame?: number;
}

const FPS = 30;
const MIN_SECONDS_PER_LINE = 4; // never faster than 4 seconds per sentence

export const Subtitle: React.FC<Props> = ({ text, startFrame = 20 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  if (!text) return null;

  // Split on sentence boundaries, keep max 3 sentences
  const allLines = (text.match(/[^.!?]+[.!?]*/g) ?? [text])
    .map((s) => s.trim())
    .filter(Boolean);
  const lines = allLines.slice(0, 3);

  const availableFrames = Math.max(durationInFrames - startFrame, 1);
  // each line gets an equal share, but never less than MIN_SECONDS_PER_LINE
  const framesPerLine = Math.max(
    Math.floor(availableFrames / lines.length),
    MIN_SECONDS_PER_LINE * FPS
  );

  if (frame < startFrame) return null;

  const elapsed = frame - startFrame;
  const lineIdx = Math.min(
    Math.floor(elapsed / framesPerLine),
    lines.length - 1
  );
  const lineFrame = elapsed - lineIdx * framesPerLine;

  const FADE = 10;
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
        background: "rgba(0,0,0,0.76)",
        backdropFilter: "blur(6px)",
        padding: "12px 40px",
        borderRadius: 6,
        maxWidth: 1200,
        textAlign: "center",
        opacity,
        pointerEvents: "none",
      }}
    >
      <span
        style={{
          fontSize: 22,
          color: "#e8e8e8",
          lineHeight: 1.6,
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

import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

export const S05GhostTowns: React.FC<{
  ghostFiles: string[];
  narration: string;
}> = ({ ghostFiles, narration }) => {
  const frame = useCurrentFrame();

  // only show max 8 files
  const files = ghostFiles.slice(0, 8);

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
        Ghost Towns
      </div>

      {/* ghost file paths */}
      <div style={{
        display: "flex", flexDirection: "column",
        gap: 12, marginBottom: 60,
      }}>
        {files.map((file, i) => {
          // each file appears at a different time
          const startFrame = i * 12;

          // opacity goes up then fades back down, like a ghost appearing and vanishing
          const opacity = interpolate(
            frame,
            [startFrame, startFrame + 10, startFrame + 30, startFrame + 50],
            [0, 0.8, 0.8, 0.1],
            { extrapolateRight: "clamp" }
          );

          return (
            <div key={file} style={{
              opacity,
              fontFamily: "monospace",
              fontSize: 20,
              color: "#5DCAA5",
            }}>
              {file}
            </div>
          );
        })}
      </div>

      {/* subtitle */}
      <div style={{
        fontSize: 22, color: "#444",
        fontStyle: "italic",
      }}>
        Some ideas were left behind.
      </div>

      {/* narration */}
      <div style={{
        position: "absolute", bottom: 60,
        fontSize: 16, color: "#444",
        maxWidth: 800, textAlign: "center",
      }}>
        {narration}
      </div>
    </div>
  );
};
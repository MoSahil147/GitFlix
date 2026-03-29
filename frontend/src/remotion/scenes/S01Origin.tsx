import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

export const S01Origin: React.FC<{
  repoName: string;
  firstContributor: string;
  narration: string;
}> = ({ repoName, firstContributor, narration }) => {
  const frame = useCurrentFrame();

  const dotOpacity  = interpolate(frame, [0, 8],  [0, 1], { extrapolateRight: "clamp" });
  const dotScale    = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const titleOpacity   = interpolate(frame, [15, 30], [0, 1], { extrapolateRight: "clamp" });
  const subtitleOpacity = interpolate(frame, [30, 45], [0, 1], { extrapolateRight: "clamp" });
  const narrationOpacity = interpolate(frame, [55, 70], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "radial-gradient(ellipse at 50% 40%, #12122a 0%, #050508 70%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "sans-serif",
    }}>
      {/* origin dot */}
      <div style={{
        width: 14, height: 14, borderRadius: "50%",
        background: "#8B5CF6",
        opacity: dotOpacity,
        transform: `scale(${dotScale})`,
        marginBottom: 48,
        boxShadow: "0 0 40px #8B5CF6aa",
      }} />

      {/* repo name */}
      <div style={{
        fontSize: 80, fontWeight: 900, color: "#fff",
        opacity: titleOpacity,
        letterSpacing: -3, marginBottom: 16,
        textShadow: "0 0 60px #8B5CF644",
      }}>
        {repoName}
      </div>

      {/* first contributor */}
      <div style={{
        fontSize: 26, color: "#555570",
        opacity: subtitleOpacity, marginBottom: 64,
      }}>
        started by <span style={{ color: "#8B5CF6", fontWeight: 600 }}>{firstContributor}</span>
      </div>

      {/* narration */}
      <div style={{
        fontSize: 20, color: "#44445a",
        opacity: narrationOpacity,
        maxWidth: 800, textAlign: "center", lineHeight: 1.7,
        fontStyle: "italic",
      }}>
        {narration}
      </div>
    </div>
  );
};

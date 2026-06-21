import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { Subtitle } from "../Subtitle";

export const S01Origin: React.FC<{
  repoName: string;
  firstContributor: string;
  narration: string;
}> = ({ repoName, firstContributor, narration }) => {
  const frame = useCurrentFrame();

  const dotOpacity  = interpolate(frame, [0, 8],   [0, 1], { extrapolateRight: "clamp" });
  const dotScale    = interpolate(frame, [0, 12],  [0, 1], { extrapolateRight: "clamp" });
  const titleOpacity    = interpolate(frame, [15, 35], [0, 1], { extrapolateRight: "clamp" });
  const titleY          = interpolate(frame, [15, 35], [20,  0], { extrapolateRight: "clamp" });
  const subtitleOpacity = interpolate(frame, [45, 68], [0, 1], { extrapolateRight: "clamp" });
  const subtitleY       = interpolate(frame, [45, 68], [16,  0], { extrapolateRight: "clamp" });

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "radial-gradient(ellipse at 50% 40%, #141008 0%, #050508 70%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "sans-serif",
      position: "relative",
    }}>
      {/* origin dot */}
      <div style={{
        width: 14, height: 14, borderRadius: "50%",
        background: "#d4a843",
        opacity: dotOpacity,
        transform: `scale(${dotScale})`,
        marginBottom: 52,
        boxShadow: "0 0 48px #d4a843bb",
      }} />

      {/* repo name */}
      <div style={{
        fontSize: 84, fontWeight: 900, color: "#fff",
        opacity: titleOpacity,
        transform: `translateY(${titleY}px)`,
        letterSpacing: -3, marginBottom: 40,
        textShadow: "0 0 60px #d4a84344",
      }}>
        {repoName}
      </div>

      {/* first contributor */}
      <div style={{
        fontSize: 26, color: "#6a5e44",
        opacity: subtitleOpacity,
        transform: `translateY(${subtitleY}px)`,
      }}>
        started by{" "}
        <span style={{ color: "#d4a843", fontWeight: 600 }}>{firstContributor}</span>
      </div>

      <Subtitle text={narration} startFrame={100} />
    </div>
  );
};

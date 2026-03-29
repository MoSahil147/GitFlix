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
  const subtitleOpacity = interpolate(frame, [35, 55], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "radial-gradient(ellipse at 50% 40%, #12122a 0%, #050508 70%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "sans-serif",
      position: "relative",
    }}>
      {/* origin dot */}
      <div style={{
        width: 14, height: 14, borderRadius: "50%",
        background: "#8B5CF6",
        opacity: dotOpacity,
        transform: `scale(${dotScale})`,
        marginBottom: 52,
        boxShadow: "0 0 48px #8B5CF6bb",
      }} />

      {/* repo name */}
      <div style={{
        fontSize: 84, fontWeight: 900, color: "#fff",
        opacity: titleOpacity,
        letterSpacing: -3, marginBottom: 18,
        textShadow: "0 0 60px #8B5CF644",
      }}>
        {repoName}
      </div>

      {/* first contributor */}
      <div style={{
        fontSize: 28, color: "#333355",
        opacity: subtitleOpacity,
      }}>
        started by{" "}
        <span style={{ color: "#8B5CF6", fontWeight: 600 }}>{firstContributor}</span>
      </div>

      <Subtitle text={narration} startFrame={100} />
    </div>
  );
};

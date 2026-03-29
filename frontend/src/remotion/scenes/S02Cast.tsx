import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import type { Character } from "../types";

const ROLE_LABELS = {
  hero: "The Hero",
  ghost: "The Ghost",
  late_joiner: "Late Arrival",
  consistent: "The Backbone",
};

export const S02Cast: React.FC<{
  characters: Character[];
  narration: string;
}> = ({ characters, narration }) => {
  const frame = useCurrentFrame();

  const headerOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "radial-gradient(ellipse at 50% 40%, #0f0f20 0%, #050508 70%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "sans-serif", gap: 36,
    }}>
      <div style={{ opacity: headerOpacity, fontSize: 15, color: "#8B5CF6", letterSpacing: 5, textTransform: "uppercase" }}>
        The Cast
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "center", maxWidth: 1400 }}>
        {characters.slice(0, 6).map((char, i) => {
          const delay = i * 6;
          const opacity = interpolate(frame, [delay + 10, delay + 22], [0, 1], { extrapolateRight: "clamp" });
          const y       = interpolate(frame, [delay + 10, delay + 22], [24, 0], { extrapolateRight: "clamp" });

          return (
            <div key={char.login} style={{
              opacity, transform: `translateY(${y}px)`,
              background: "#0d0d18",
              border: `1px solid ${char.color}40`,
              borderRadius: 16, padding: "24px 28px", width: 240, textAlign: "center",
              boxShadow: `0 0 30px ${char.color}18`,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: char.color,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, fontWeight: 700, color: "#050508",
                margin: "0 auto 14px",
              }}>
                {char.login.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{char.login}</div>
              <div style={{ fontSize: 11, color: char.color, textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>
                {ROLE_LABELS[char.role]}
              </div>
              <div style={{ fontSize: 12, color: "#33334a", lineHeight: 1.6 }}>{char.arc_summary}</div>
            </div>
          );
        })}
      </div>

      <div style={{
        opacity: interpolate(frame, [90, 110], [0, 1], { extrapolateRight: "clamp" }),
        fontSize: 16, color: "#33334a", maxWidth: 800, textAlign: "center", fontStyle: "italic",
      }}>
        {narration}
      </div>
    </div>
  );
};

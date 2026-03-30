import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import type { Character } from "../types";
import { Subtitle } from "../Subtitle";

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
      position: "relative",
    }}>
      <div style={{
        opacity: headerOpacity,
        fontSize: 13, color: "#8B5CF6",
        letterSpacing: 5, textTransform: "uppercase",
      }}>
        The Cast
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 28, justifyContent: "center", maxWidth: 1600 }}>
        {characters.slice(0, 6).map((char, i) => {
          const delay   = i * 8;
          const opacity = interpolate(frame, [delay + 12, delay + 28], [0, 1], { extrapolateRight: "clamp" });
          const y       = interpolate(frame, [delay + 12, delay + 28], [24, 0], { extrapolateRight: "clamp" });

          // flicker: each card has its own phase offset so they don't all pulse together
          const phase = i * 1.37;
          const flicker = 0.55 + 0.45 * Math.abs(Math.sin(frame * 0.09 + phase));
          const borderFlicker = 0.18 + 0.22 * Math.abs(Math.sin(frame * 0.11 + phase + 0.5));

          return (
            <div key={char.login} style={{
              opacity, transform: `translateY(${y}px)`,
              position: "relative",
              background: "#0d0d18",
              border: `1px solid ${char.color}${Math.round(borderFlicker * 255).toString(16).padStart(2, "0")}`,
              borderRadius: 20, padding: "36px 36px", width: 300, textAlign: "center",
              boxShadow: `0 0 ${40 + 30 * flicker}px ${char.color}${Math.round(flicker * 0.3 * 255).toString(16).padStart(2, "0")}`,
            }}>
              {/* flickering light bloom behind the card */}
              <div style={{
                position: "absolute", top: "-40%", left: "50%",
                transform: "translateX(-50%)",
                width: 340, height: 340,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${char.color}${Math.round(flicker * 0.22 * 255).toString(16).padStart(2, "0")} 0%, transparent 70%)`,
                pointerEvents: "none", zIndex: 0,
              }} />

              {/* card content — sits above the bloom */}
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{
                  width: 80, height: 80, borderRadius: "50%",
                  background: char.color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 30, fontWeight: 700, color: "#050508",
                  margin: "0 auto 18px",
                  boxShadow: `0 0 24px ${char.color}88`,
                }}>
                  {char.login.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
                  {char.login}
                </div>
                <div style={{ fontSize: 12, color: char.color, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>
                  {ROLE_LABELS[char.role]}
                </div>
                <div style={{ fontSize: 14, color: "#2a2a40", lineHeight: 1.6 }}>
                  {char.arc_summary}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Subtitle text={narration} startFrame={160} />
    </div>
  );
};

import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { Character } from "../types";

// maps role to a human readable label for the card
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
        letterSpacing: 4,
        textTransform: "uppercase",
        marginBottom: 48,
      }}>
        The Cast
      </div>

      {/* contributor cards */}
      <div style={{
        display: "flex", flexWrap: "wrap",
        gap: 24, justifyContent: "center",
        maxWidth: 1400,
      }}>
        {characters.slice(0, 6).map((char, i) => {
          // each card starts appearing 8 frames after the previous one
          const delay = i * 8;
          const cardOpacity = interpolate(frame, [delay, delay + 20], [0, 1], { extrapolateRight: "clamp" });
          const cardY = interpolate(frame, [delay, delay + 20], [30, 0], { extrapolateRight: "clamp" });

          return (
            <div key={char.login} style={{
              opacity: cardOpacity,
              transform: `translateY(${cardY}px)`,
              background: "#111",
              border: `1px solid ${char.color}33`,  // 33 = 20% opacity in hex
              borderRadius: 16,
              padding: "28px 32px",
              width: 260,
              textAlign: "center",
            }}>
              {/* avatar circle with first 2 letters of username */}
              <div style={{
                width: 64, height: 64,
                borderRadius: "50%",
                background: char.color,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, fontWeight: 700,
                color: "#0a0a0f",
                margin: "0 auto 16px",
              }}>
                {char.login.slice(0, 2).toUpperCase()}
              </div>

              {/* username */}
              <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                {char.login}
              </div>

              {/* role label */}
              <div style={{
                fontSize: 13, color: char.color,
                marginBottom: 10,
                textTransform: "uppercase", letterSpacing: 2,
              }}>
                {ROLE_LABELS[char.role]}
              </div>

              {/* arc summary */}
              <div style={{ fontSize: 13, color: "#666", lineHeight: 1.5 }}>
                {char.arc_summary}
              </div>
            </div>
          );
        })}
      </div>

      {/* narration at the bottom */}
      <div style={{
        position: "absolute", bottom: 60,
        fontSize: 18, color: "#555",
        maxWidth: 900, textAlign: "center",
      }}>
        {narration}
      </div>
    </div>
  );
};
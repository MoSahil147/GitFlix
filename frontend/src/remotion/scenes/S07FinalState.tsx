import React from "react";
import { useCurrentFrame, interpolate, useVideoConfig } from "remotion";
import type { ScriptJSON } from "../types";

export const S07FinalState: React.FC<{
  script: ScriptJSON;
  narration: string;
}> = ({ script, narration }) => {
  const frame = useCurrentFrame();

  // the 4 stats to show at the end
  const STATS = [
    { label: "Commits",      value: script.total_commits.toLocaleString() },
    { label: "Contributors", value: script.contributor_count.toString() },
    { label: "Days active",  value: script.repo_age_days.toString() },
    { label: "Language",     value: script.primary_language ?? "—" },
  ];

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "#0a0a0f",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "sans-serif",
    }}>
      {/* repo name fades in first */}
      <div style={{
        opacity: interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" }),
        fontSize: 52, fontWeight: 800,
        color: "#fff", marginBottom: 16,
      }}>
        {script.repo_name}
      </div>

      {/* tagline fades in second */}
      <div style={{
        opacity: interpolate(frame, [20, 50], [0, 1], { extrapolateRight: "clamp" }),
        fontSize: 20, color: "#555",
        fontStyle: "italic", marginBottom: 72,
      }}>
        Every repo has a story.
      </div>

      {/* stats — each one staggered */}
      <div style={{
        display: "flex", gap: 48,
        marginBottom: 80,
      }}>
        {STATS.map((stat, i) => {
          // each stat appears 12 frames after the previous one
          const opacity = interpolate(
            frame, [40 + i * 12, 70 + i * 12], [0, 1],
            { extrapolateRight: "clamp" }
          );
          const y = interpolate(
            frame, [40 + i * 12, 70 + i * 12], [20, 0],
            { extrapolateRight: "clamp" }
          );

          return (
            <div key={stat.label} style={{
              opacity,
              transform: `translateY(${y}px)`,
              textAlign: "center",
            }}>
              {/* big number in green */}
              <div style={{
                fontSize: 48, fontWeight: 700,
                color: "#5DCAA5",
              }}>
                {stat.value}
              </div>
              {/* label underneath */}
              <div style={{
                fontSize: 14, color: "#555",
                textTransform: "uppercase", letterSpacing: 2,
              }}>
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* narration fades in last */}
      <div style={{
        opacity: interpolate(frame, [130, 160], [0, 1], { extrapolateRight: "clamp" }),
        fontSize: 18, color: "#444",
        maxWidth: 800, textAlign: "center",
        lineHeight: 1.6,
      }}>
        {narration}
      </div>
    </div>
  );
};
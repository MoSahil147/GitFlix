import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import type { ScriptJSON } from "../types";

export const S07FinalState: React.FC<{
  script: ScriptJSON;
  narration: string;
}> = ({ script, narration }) => {
  const frame = useCurrentFrame();

  const STATS = [
    { label: "Commits",      value: script.total_commits.toLocaleString() },
    { label: "Contributors", value: script.contributor_count.toString()    },
    { label: "Days active",  value: script.repo_age_days.toString()        },
    { label: "Language",     value: script.primary_language ?? "—"         },
  ];

  const titleOpacity   = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const taglineOpacity = interpolate(frame, [14, 30], [0, 1], { extrapolateRight: "clamp" });
  const narOpacity     = interpolate(frame, [150, 175], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "radial-gradient(ellipse at 50% 40%, #12102a 0%, #050508 70%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "sans-serif",
    }}>
      <div style={{ opacity: titleOpacity, fontSize: 64, fontWeight: 900, color: "#fff", marginBottom: 12, letterSpacing: -2 }}>
        {script.repo_name}
      </div>

      <div style={{ opacity: taglineOpacity, fontSize: 18, color: "#333355", fontStyle: "italic", marginBottom: 64 }}>
        Every repository has a story.
      </div>

      {/* stat row */}
      <div style={{ display: "flex", gap: 56, marginBottom: 72 }}>
        {STATS.map((stat, i) => {
          const op = interpolate(frame, [30 + i * 8, 50 + i * 8], [0, 1], { extrapolateRight: "clamp" });
          const y  = interpolate(frame, [30 + i * 8, 50 + i * 8], [16, 0], { extrapolateRight: "clamp" });
          return (
            <div key={stat.label} style={{ opacity: op, transform: `translateY(${y}px)`, textAlign: "center" }}>
              <div style={{ fontSize: 52, fontWeight: 800, color: "#8B5CF6", lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: "#2a2a44", textTransform: "uppercase", letterSpacing: 3, marginTop: 8 }}>{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Gitflix watermark */}
      <div style={{
        opacity: interpolate(frame, [90, 110], [0, 1], { extrapolateRight: "clamp" }),
        fontSize: 22, fontWeight: 900, fontStyle: "italic",
        color: "#8B5CF6", letterSpacing: -1, marginBottom: 40,
      }}>
        Gitflix
      </div>

      <div style={{ opacity: narOpacity, fontSize: 15, color: "#2a2a44", maxWidth: 720, textAlign: "center", fontStyle: "italic", lineHeight: 1.7 }}>
        {narration}
      </div>
    </div>
  );
};

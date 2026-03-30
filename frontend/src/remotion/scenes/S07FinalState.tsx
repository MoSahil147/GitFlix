import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import type { ScriptJSON } from "../types";
import { Subtitle } from "../Subtitle";

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

  const titleOpacity   = interpolate(frame, [0, 20],  [0, 1], { extrapolateRight: "clamp" });
  const taglineOpacity = interpolate(frame, [18, 38], [0, 1], { extrapolateRight: "clamp" });
  const brandOpacity   = interpolate(frame, [100, 120], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "radial-gradient(ellipse at 50% 40%, #12102a 0%, #050508 70%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "sans-serif",
      position: "relative",
      paddingBottom: 160,
    }}>
      <div style={{ opacity: titleOpacity, fontSize: 68, fontWeight: 900, color: "#fff", marginBottom: 14, letterSpacing: -2 }}>
        {script.repo_name}
      </div>

      <div style={{ opacity: taglineOpacity, fontSize: 18, color: "#28284a", fontStyle: "italic", marginBottom: 68 }}>
        Every repository has a story.
      </div>

      {/* stats */}
      <div style={{ display: "flex", gap: 60, marginBottom: 72 }}>
        {STATS.map((stat, i) => {
          const op = interpolate(frame, [35 + i * 10, 58 + i * 10], [0, 1], { extrapolateRight: "clamp" });
          const y  = interpolate(frame, [35 + i * 10, 58 + i * 10], [18, 0],  { extrapolateRight: "clamp" });
          return (
            <div key={stat.label} style={{ opacity: op, transform: `translateY(${y}px)`, textAlign: "center" }}>
              <div style={{ fontSize: 56, fontWeight: 800, color: "#8B5CF6", lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: "#22224a", textTransform: "uppercase", letterSpacing: 3, marginTop: 10 }}>
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Gitflix watermark */}
      <div style={{
        opacity: brandOpacity,
        fontSize: 24, fontWeight: 900, fontStyle: "italic",
        color: "#8B5CF6", letterSpacing: -1,
      }}>
        GitFlix
      </div>

      <Subtitle text={narration} startFrame={90} />
    </div>
  );
};

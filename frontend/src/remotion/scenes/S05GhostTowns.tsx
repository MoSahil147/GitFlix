import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { Subtitle } from "../Subtitle";

export const S05GhostTowns: React.FC<{
  ghostFiles: string[];
  narration: string;
}> = ({ ghostFiles, narration }) => {
  const frame = useCurrentFrame();

  const files = ghostFiles.slice(0, 7);
  const hasGhosts = files.length > 0;

  const headerOpacity = interpolate(frame, [0, 15],  [0, 1], { extrapolateRight: "clamp" });
  const titleOpacity  = interpolate(frame, [12, 30], [0, 1], { extrapolateRight: "clamp" });
  const titleY        = interpolate(frame, [12, 30], [20, 0], { extrapolateRight: "clamp" });

  return (
    <div style={{
      width: "100%", height: "100%",
      background: hasGhosts
        ? "radial-gradient(ellipse at 50% 30%, #0a0a16 0%, #050508 65%)"
        : "radial-gradient(ellipse at 50% 30%, #0a160a 0%, #050508 65%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "sans-serif",
      position: "relative",
    }}>
      <div style={{ opacity: headerOpacity, fontSize: 13, color: hasGhosts ? "#5566aa" : "#5DCAA5", letterSpacing: 6, textTransform: "uppercase", marginBottom: 20 }}>
        Ghost Files
      </div>

      <div style={{
        opacity: titleOpacity, transform: `translateY(${titleY}px)`,
        fontSize: 52, fontWeight: 800, color: "#fff",
        marginBottom: 48, textAlign: "center",
        textShadow: hasGhosts ? "0 0 40px #5566aa44" : "0 0 40px #5DCAA544",
      }}>
        {hasGhosts ? "Abandoned. Forgotten." : "All Fresh. No Ghosts."}
      </div>

      {/* terminal box */}
      <div style={{
        background: "#080810",
        border: `1px solid ${hasGhosts ? "#1a1a30" : "#1a301a"}`,
        borderRadius: 12,
        padding: "22px 32px",
        width: 820,
        marginBottom: 32,
      }}>
        {/* traffic light dots */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {["#e05a5a", "#EF9F27", "#5DCAA5"].map((c) => (
            <div key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c, opacity: 0.6 }} />
          ))}
        </div>

        {hasGhosts ? (
          files.map((file, i) => {
            const start   = 32 + i * 10;
            const entered = interpolate(frame, [start, start + 12], [0, 1], { extrapolateRight: "clamp" });
            const pulse   = 0.45 + 0.55 * Math.abs(Math.sin((frame - start) * 0.08));
            const opacity = frame < start ? 0 : entered < 1 ? entered : pulse;
            return (
              <div key={file} style={{ opacity, fontFamily: "monospace", fontSize: 15, color: "#5566aa", marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: "#22224a", fontSize: 13 }}>~</span>
                {file}
              </div>
            );
          })
        ) : (
          <div style={{ opacity: interpolate(frame, [32, 50], [0, 1], { extrapolateRight: "clamp" }), fontFamily: "monospace", fontSize: 15, color: "#5DCAA5" }}>
            <div style={{ marginBottom: 10 }}>$ find . -mtime +180 -type f</div>
            <div style={{ color: "#2a4a2a", marginBottom: 10 }}>{"// no results"}</div>
            <div>All files are recently active - this codebase has no ghosts.</div>
          </div>
        )}
      </div>

      <Subtitle text={narration} startFrame={140} />
    </div>
  );
};

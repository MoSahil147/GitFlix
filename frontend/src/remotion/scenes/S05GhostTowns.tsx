import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

export const S05GhostTowns: React.FC<{
  ghostFiles: string[];
  narration: string;
}> = ({ ghostFiles, narration }) => {
  const frame = useCurrentFrame();

  const files = ghostFiles.slice(0, 7);

  const headerOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const titleOpacity  = interpolate(frame, [10, 28], [0, 1], { extrapolateRight: "clamp" });
  const titleY        = interpolate(frame, [10, 28], [20, 0], { extrapolateRight: "clamp" });
  const narOpacity    = interpolate(frame, [100, 120], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "radial-gradient(ellipse at 50% 30%, #0a0a16 0%, #050508 65%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "sans-serif",
    }}>
      {/* label */}
      <div style={{ opacity: headerOpacity, fontSize: 13, color: "#5566aa", letterSpacing: 6, textTransform: "uppercase", marginBottom: 20 }}>
        Ghost Files
      </div>

      {/* title */}
      <div style={{
        opacity: titleOpacity, transform: `translateY(${titleY}px)`,
        fontSize: 52, fontWeight: 800, color: "#fff",
        marginBottom: 48, textAlign: "center",
        textShadow: "0 0 40px #5566aa44",
      }}>
        Abandoned. Forgotten.
      </div>

      {/* terminal box */}
      <div style={{
        background: "#080810",
        border: "1px solid #1a1a30",
        borderRadius: 12,
        padding: "24px 32px",
        width: 820,
        marginBottom: 32,
      }}>
        {/* terminal header */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {["#e05a5a", "#EF9F27", "#5DCAA5"].map(c => (
            <div key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c, opacity: 0.6 }} />
          ))}
        </div>

        {/* file list */}
        {files.map((file, i) => {
          const start = 30 + i * 10;
          const op = interpolate(frame, [start, start + 12], [0, 1], { extrapolateRight: "clamp" });
          // ghost effect: pulse opacity
          const pulse = 0.5 + 0.5 * Math.sin((frame - start) * 0.12);
          const finalOp = frame < start ? 0 : op < 1 ? op : 0.4 + 0.6 * pulse;

          return (
            <div key={file} style={{
              opacity: finalOp,
              fontFamily: "monospace", fontSize: 15,
              color: "#5566aa", marginBottom: 10,
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <span style={{ color: "#2a2a44", fontSize: 12 }}>~</span>
              {file}
            </div>
          );
        })}
      </div>

      <div style={{ opacity: narOpacity, fontSize: 16, color: "#33334a", maxWidth: 800, textAlign: "center", fontStyle: "italic" }}>
        {narration}
      </div>
    </div>
  );
};

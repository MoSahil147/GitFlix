import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { Character } from "../types";
import { Subtitle } from "../Subtitle";

const COLORS = ["#8B5CF6", "#5DCAA5", "#EF9F27", "#e05a5a", "#5566aa"];

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function wedge(cx: number, cy: number, outer: number, inner: number, s: number, e: number) {
  if (e - s >= 360) e = s + 359.99;
  const [ox1, oy1] = polar(cx, cy, outer, s);
  const [ox2, oy2] = polar(cx, cy, outer, e);
  const [ix1, iy1] = polar(cx, cy, inner, e);
  const [ix2, iy2] = polar(cx, cy, inner, s);
  const large = e - s > 180 ? 1 : 0;
  return `M ${ox1} ${oy1} A ${outer} ${outer} 0 ${large} 1 ${ox2} ${oy2} L ${ix1} ${iy1} A ${inner} ${inner} 0 ${large} 0 ${ix2} ${iy2} Z`;
}

export const S03Rise: React.FC<{
  characters: Character[];
  narration: string;
}> = ({ characters, narration }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const top = characters.slice(0, 5).filter((c) => c.commit_count > 0);
  const total = top.reduce((s, c) => s + c.commit_count, 0) || 1;

  const CX = 340, CY = 340, OUTER = 240, INNER = 110;

  let cumDeg = 0;
  const slices = top.map((c, i) => {
    const pct = c.commit_count / total;
    const startDeg = cumDeg;
    const endDeg = cumDeg + pct * 360;
    cumDeg = endDeg;
    return { c, pct, startDeg, endDeg, color: COLORS[i % COLORS.length] };
  });

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "radial-gradient(ellipse at 40% 50%, #0d0a1a 0%, #050508 70%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "sans-serif", position: "relative",
      gap: 80,
    }}>

      {/* legend */}
      <div style={{ opacity: titleOpacity }}>
        <div style={{ fontSize: 14, color: "#8B5CF6", letterSpacing: 5, textTransform: "uppercase", marginBottom: 32 }}>
          Commit Share
        </div>
        {slices.map(({ c, pct, color }, i) => {
          const op = interpolate(frame, [20 + i * 10, 44 + i * 10], [0, 1], { extrapolateRight: "clamp" });
          const y  = interpolate(frame, [20 + i * 10, 44 + i * 10], [12, 0],  { extrapolateRight: "clamp" });
          return (
            <div key={c.login} style={{ opacity: op, transform: `translateY(${y}px)`, display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, background: color, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>{c.login}</div>
                <div style={{ fontSize: 13, color: "#44445a", marginTop: 2 }}>
                  {c.commit_count} commits · {Math.round(pct * 100)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* donut */}
      <svg width={CX * 2} height={CY * 2} viewBox={`0 0 ${CX * 2} ${CY * 2}`}>
        {slices.map(({ startDeg, endDeg, color }, i) => {
          const progress = interpolate(frame, [15 + i * 8, 60 + i * 8], [0, 1], { extrapolateRight: "clamp" });
          const animEnd = startDeg + (endDeg - startDeg) * progress;
          if (animEnd <= startDeg + 0.1) return null;
          return (
            <path key={i} d={wedge(CX, CY, OUTER, INNER, startDeg, animEnd)} fill={color} opacity={0.92} />
          );
        })}
        <text x={CX} y={CY - 14} textAnchor="middle" fill="#fff" fontSize={52} fontWeight={800} fontFamily="sans-serif">
          {top.length}
        </text>
        <text x={CX} y={CY + 22} textAnchor="middle" fill="#44445a" fontSize={14} letterSpacing={4} fontFamily="sans-serif">
          CONTRIBUTORS
        </text>
      </svg>

      <Subtitle text={narration} startFrame={Math.floor(durationInFrames * 0.65)} />
    </div>
  );
};

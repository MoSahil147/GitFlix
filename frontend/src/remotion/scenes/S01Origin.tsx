import { useCurrentFrame, interpolate, useVideoConfig } from "remotion";

const BG = "#0a0a0f";
const ACCENT = "#5DCAA5";

export const S01Origin: React.FC<{
  repoName: string;
  firstContributor: string;
  narration: string;
}> = ({ repoName, firstContributor, narration }) => {
  const frame = useCurrentFrame();

  // small dot appears first — like a single commit being born
  const dotOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const dotScale = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });

  // repo name fades in after the dot
  const titleOpacity = interpolate(frame, [40, 70], [0, 1], { extrapolateRight: "clamp" });

  // contributor name fades in after title
  const subtitleOpacity = interpolate(frame, [80, 110], [0, 1], { extrapolateRight: "clamp" });

  // narration fades in last
  const narrationOpacity = interpolate(frame, [130, 160], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{
      width: "100%", height: "100%",
      background: BG,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "sans-serif",
    }}>
      {/* small green dot — the origin point */}
      <div style={{
        width: 12, height: 12,
        borderRadius: "50%",
        background: ACCENT,
        opacity: dotOpacity,
        transform: `scale(${dotScale})`,
        marginBottom: 60,
      }} />

      {/* repo name */}
      <div style={{
        fontSize: 72, fontWeight: 800,
        color: "#ffffff",
        opacity: titleOpacity,
        letterSpacing: -2,
        marginBottom: 16,
      }}>
        {repoName}
      </div>

      {/* first contributor */}
      <div style={{
        fontSize: 28, color: "#888888",
        opacity: subtitleOpacity,
        marginBottom: 80,
      }}>
        started by {firstContributor}
      </div>

      {/* narration text */}
      <div style={{
        fontSize: 22, color: "#aaaaaa",
        opacity: narrationOpacity,
        maxWidth: 900, textAlign: "center",
        lineHeight: 1.6,
      }}>
        {narration}
      </div>
    </div>
  );
};
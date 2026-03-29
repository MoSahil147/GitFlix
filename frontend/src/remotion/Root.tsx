import { Composition } from "remotion";
import { GitflixVideo } from "./GitflixVideo";
import { ScriptJSON } from "./types";

// sample data used for testing in Remotion Studio
// this gets replaced by real API data in the actual app
const SAMPLE_SCRIPT: ScriptJSON = {
  repo_name: "demo/repo",
  tone: "documentary",
  total_commits: 342,
  repo_age_days: 520,
  contributor_count: 8,
  characters: [
    {
      login: "alice",
      color: "#5DCAA5",
      role: "hero",
      commit_count: 180,
      active_months: 14,
      arc_summary: "Alice drove the project from day one.",
    },
    {
      login: "bob",
      color: "#7F77DD",
      role: "consistent",
      commit_count: 90,
      active_months: 10,
      arc_summary: "Bob showed up consistently.",
    },
  ],
  // generate 52 weeks of fake commit data for testing
  commit_series: Array.from({ length: 52 }, (_, i) => ({
    week: `2023-W${i + 1}`,
    count: Math.floor(Math.random() * 20),
  })),
  hero_commit: {
    sha: "abc123",
    author_login: "alice",
    message: "feat: complete rewrite of core engine",
    lines_changed: 2400,
    timestamp: "2023-06-15",
    narration_text: "One commit changed everything.",
  },
  ghost_files: ["src/old_parser.py", "utils/deprecated.js"],
  scenes: [],
  primary_language: "Python",
};

const FPS = 30;
const TOTAL_SECS = 85;

// this registers the composition with Remotion
// Remotion needs to know the fps, dimensions and total length
export const RemotionRoot = () => (
  <Composition
    id="Gitflix"
    component={GitflixVideo}
    durationInFrames={TOTAL_SECS * FPS}
    fps={FPS}
    width={1920}
    height={1080}
    defaultProps={{ script: SAMPLE_SCRIPT }}
  />
);
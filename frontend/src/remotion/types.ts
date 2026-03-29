// shape of one contributor in the film
export interface Character {
  login: string;
  color: string;
  role: "hero" | "ghost" | "late_joiner" | "consistent";
  commit_count: number;
  active_months: number;
  arc_summary: string;
}

// one week of commit data — used for the animated bar chart
export interface CommitPoint {
  week: string;
  count: number;
}

// the single biggest commit in the repo
export interface HeroCommit {
  sha: string;
  author_login: string;
  message: string;
  lines_changed: number;
  timestamp: string;
  narration_text: string;
}

// one scene in the documentary
export interface Scene {
  scene_id: string;
  title: string;
  duration_secs: number;
  narration_text: string;
  visual_params: Record<string, any>;
  audio_url?: string; // base64 data URI from ElevenLabs TTS
}

// the master object — holds everything needed to render the film
export interface ScriptJSON {
  repo_name: string;
  description?: string;
  tone: string;
  total_commits: number;
  repo_age_days: number;
  contributor_count: number;
  characters: Character[];
  commit_series: CommitPoint[];
  hero_commit: HeroCommit;
  ghost_files: string[];
  scenes: Scene[];
  primary_language?: string;
  music_url?: string; // base64 data URI for background music
}
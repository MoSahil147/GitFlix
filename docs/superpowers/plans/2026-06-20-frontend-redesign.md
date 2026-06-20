# Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the GitFlix shell (input, loading, preview, error screens) with an editorial dark aesthetic — all existing logic (SSE, cancel, sendBeacon, health check) is preserved exactly.

**Architecture:** Split the monolithic `App.tsx` into focused screen components. `App.tsx` keeps all state and logic. Each screen receives only the props it needs and renders the new design.

**Tech Stack:** React 19, TypeScript, Vite, Remotion Player (unchanged)

## Global Constraints

- Do NOT touch any file in `src/remotion/` — video scenes are out of scope
- Do NOT change any logic in `App.tsx` — only the JSX/styles change
- All existing functionality must work: SSE streaming, cancel, sendBeacon, beforeunload, health check, EventSource cleanup
- Fonts: Space Grotesk (headlines) + Inter (body) via Google Fonts in `index.html`
- Color tokens: `--bg: #050308`, `--surface: #0a0614`, `--border: #12091e`, `--accent: #7c3aed`, `--accent-dim: #1e1030`, `--text-muted: #2e1f4a`, `--text-active: #a78bfa`
- Eyebrow copy: "GitHub → Cinematic Video" (no dash/line before it)
- No Beta tag anywhere
- `CHAPTER_FRAMES` must be derived from `SCENE_DURATIONS` using `reduce`

---

### Task 1: Foundation — `index.html`, CSS tokens, fix `CHAPTER_FRAMES`

**Files:**
- Modify: `frontend/index.html`
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/App.tsx` (CHAPTER_FRAMES fix only)

- [ ] **Step 1: Add fonts to `index.html`** — remove the `document.createElement` block from `App.tsx` (lines 38–41) and add to `<head>` in `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Replace `index.css` with design tokens and global resets**

```css
:root {
  --bg:           #050308;
  --surface:      #0a0614;
  --border:       #12091e;
  --border-dim:   #1e1030;
  --accent:       #7c3aed;
  --accent-glow:  #7c3aed66;
  --accent-dim:   #7c3aed18;
  --text:         #ffffff;
  --text-muted:   #2e1f4a;
  --text-mid:     #3a2a5a;
  --text-active:  #a78bfa;
  --font-display: 'Space Grotesk', sans-serif;
  --font-body:    'Inter', sans-serif;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

#root { min-height: 100vh; display: flex; flex-direction: column; }

button { font-family: var(--font-body); cursor: pointer; }
input  { font-family: var(--font-body); }
```

- [ ] **Step 3: Fix `CHAPTER_FRAMES` in `App.tsx`** — replace lines 16–24 with:

```ts
const CHAPTER_IDS = ["S01","S02","S03","S04","S05","S06","S07"] as const;

const CHAPTER_FRAMES = CHAPTER_IDS.reduce<Record<string, number>>(
  (acc, id, i) => {
    const prev = i === 0 ? 0 : acc[CHAPTER_IDS[i - 1]];
    const prevDur = i === 0 ? 0 : SCENE_DURATIONS[CHAPTER_IDS[i - 1] as keyof typeof SCENE_DURATIONS] * FPS;
    acc[id] = prev + prevDur;
    return acc;
  },
  {}
);
```

- [ ] **Step 4: Remove the font side-effect from `App.tsx`** — delete these lines:

```ts
const fontLink = document.createElement("link");
fontLink.href = "https://fonts.googleapis.com/css2?...";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);
```

- [ ] **Step 5: Verify app still loads** — run `npm run dev` in `frontend/`, open browser, confirm no console errors, existing UI still renders.

- [ ] **Step 6: Commit**
```bash
git add frontend/index.html frontend/src/index.css frontend/src/App.tsx
git commit -m "refactor(frontend): move fonts to index.html, add CSS tokens, fix CHAPTER_FRAMES"
```

---

### Task 2: NavBar component

**Files:**
- Create: `frontend/src/components/NavBar.tsx`

**Interfaces:**
- Produces: `<NavBar logo contextual={ReactNode} actions={ReactNode} />`

- [ ] **Step 1: Create `frontend/src/components/NavBar.tsx`**

```tsx
import React from "react";

interface NavBarProps {
  contextual?: React.ReactNode;
  actions?: React.ReactNode;
}

export default function NavBar({ contextual, actions }: NavBarProps) {
  return (
    <>
      <div style={{ height: 2, background: "linear-gradient(90deg, transparent, var(--accent), transparent)" }} />
      <nav style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "16px 48px", borderBottom: "1px solid var(--border)",
        position: "sticky", top: 0, zIndex: 10,
        background: "#050308ee", backdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 800, letterSpacing: -0.5, color: "var(--text)" }}>
            GITFLIX
          </span>
          {contextual && (
            <>
              <div style={{ width: 1, height: 14, background: "var(--border-dim)" }} />
              {contextual}
            </>
          )}
        </div>
        {actions && <div style={{ display: "flex", gap: 8 }}>{actions}</div>}
      </nav>
    </>
  );
}
```

- [ ] **Step 2: Commit**
```bash
git add frontend/src/components/NavBar.tsx
git commit -m "feat(frontend): add NavBar component"
```

---

### Task 3: InputScreen

**Files:**
- Create: `frontend/src/screens/InputScreen.tsx`

**Interfaces:**
- Consumes: `NavBar` from Task 2
- Produces: `<InputScreen repoUrl tone error cooldown onRepoUrlChange onToneChange onGenerate />`

- [ ] **Step 1: Create `frontend/src/screens/InputScreen.tsx`**

```tsx
import React from "react";
import NavBar from "../components/NavBar";

interface Props {
  repoUrl: string;
  tone: "epic" | "documentary" | "casual";
  error: string;
  cooldown: boolean;
  onRepoUrlChange: (v: string) => void;
  onToneChange: (t: "epic" | "documentary" | "casual") => void;
  onGenerate: () => void;
}

const TONES = ["epic", "documentary", "casual"] as const;

export default function InputScreen({ repoUrl, tone, error, cooldown, onRepoUrlChange, onToneChange, onGenerate }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--bg)" }}>
      <NavBar />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 600, width: "100%", margin: "0 auto", padding: "0 32px" }}>
        {/* eyebrow */}
        <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: 4, textTransform: "uppercase", marginBottom: 16, fontFamily: "var(--font-display)" }}>
          GitHub → Cinematic Video
        </div>

        {/* headline */}
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(48px, 6vw, 80px)", fontWeight: 900, letterSpacing: -4, lineHeight: 0.93, color: "var(--text)", marginBottom: 16 }}>
          Every repo<br />has a story.
        </h1>

        <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 40, lineHeight: 1.6 }}>
          Paste a GitHub link. Get a cinematic documentary of your repository's history.
        </p>

        {/* input + button row */}
        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <input
            value={repoUrl}
            onChange={e => onRepoUrlChange(e.target.value.toLowerCase())}
            onKeyDown={e => e.key === "Enter" && onGenerate()}
            placeholder="https://github.com/org/repo"
            style={{
              flex: 1, background: "var(--surface)", border: "1px solid var(--border-dim)",
              borderRadius: 8, padding: "14px 16px", fontSize: 14, color: "var(--text-active)",
              outline: "none",
            }}
          />
          <button
            onClick={onGenerate}
            disabled={cooldown}
            style={{
              background: cooldown ? "var(--border-dim)" : "var(--accent)",
              border: "none", borderRadius: 8, padding: "14px 24px",
              fontSize: 14, fontWeight: 700, color: cooldown ? "var(--text-muted)" : "#fff",
              whiteSpace: "nowrap", cursor: cooldown ? "not-allowed" : "pointer",
            }}
          >
            {cooldown ? "Please wait…" : "Generate →"}
          </button>
        </div>

        {/* tone segmented control */}
        <div style={{ display: "flex", border: "1px solid var(--border-dim)", borderRadius: 8, overflow: "hidden", marginBottom: 8 }}>
          {TONES.map((t, i) => (
            <button
              key={t}
              onClick={() => onToneChange(t)}
              style={{
                flex: 1, padding: "10px 0", fontSize: 12, textAlign: "center",
                textTransform: "capitalize", letterSpacing: 0.3,
                color: tone === t ? "var(--text-active)" : "var(--text-muted)",
                background: tone === t ? "var(--accent-dim)" : "transparent",
                border: "none",
                borderRight: i < 2 ? "1px solid var(--border-dim)" : "none",
                cursor: "pointer",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {error && <p style={{ marginTop: 8, color: "#EF4444", fontSize: 13 }}>{error}</p>}
      </div>

      {/* stats bar */}
      <div style={{ borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", maxWidth: 600, width: "100%", margin: "0 auto", padding: "0 32px" }}>
        {[["7", "Chapters"], ["3", "Tones"], ["~60s", "Wait time"]].map(([num, label], i) => (
          <div key={label} style={{ padding: "24px 0", paddingLeft: i > 0 ? 32 : 0, paddingRight: i < 2 ? 32 : 0, borderRight: i < 2 ? "1px solid var(--border)" : "none" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 900, letterSpacing: -1 }}>{num}</div>
            <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 2, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**
```bash
git add frontend/src/screens/InputScreen.tsx
git commit -m "feat(frontend): add InputScreen with new design"
```

---

### Task 4: LoadingScreen

**Files:**
- Create: `frontend/src/screens/LoadingScreen.tsx`

**Interfaces:**
- Consumes: `NavBar` from Task 2
- Produces: `<LoadingScreen repoUrl progress onCancel />`

- [ ] **Step 1: Create `frontend/src/screens/LoadingScreen.tsx`**

```tsx
import React from "react";
import NavBar from "../components/NavBar";

interface Props {
  repoUrl: string;
  progress: { pct: number; msg: string };
  onCancel: () => void;
}

const STAGES = [
  { key: "connecting",   label: "Connecting to repository",  pct: 10 },
  { key: "fetching",     label: "Fetching commit history",    pct: 25 },
  { key: "analyzing",    label: "Analyzing contributors",     pct: 50 },
  { key: "writing",      label: "Writing the script",         pct: 75 },
  { key: "rendering",    label: "Rendering video",            pct: 95 },
];

function getStageStatus(stagePct: number, currentPct: number): "done" | "active" | "pending" {
  if (currentPct >= stagePct + 10) return "done";
  if (currentPct >= stagePct - 10) return "active";
  return "pending";
}

export default function LoadingScreen({ repoUrl, progress, onCancel }: Props) {
  const repoShort = repoUrl.replace("https://github.com/", "");

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--bg)" }}>
      <NavBar contextual={<span style={{ fontSize: 11, color: "var(--text-muted)" }}>{repoShort}</span>} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 560, width: "100%", margin: "0 auto", padding: "0 32px" }}>
        <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: 4, textTransform: "uppercase", marginBottom: 16, fontFamily: "var(--font-display)" }}>
          In Production
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(40px, 5vw, 64px)", fontWeight: 900, letterSpacing: -3, lineHeight: 0.93, marginBottom: 48 }}>
          Generating<br />your film…
        </h1>

        {/* stages */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 40 }}>
          {STAGES.map(stage => {
            const status = getStageStatus(stage.pct, progress.pct);
            return (
              <div key={stage.key} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                  background: status === "pending" ? "transparent" : "var(--accent)",
                  border: status === "pending" ? "1px solid var(--border-dim)" : "none",
                  boxShadow: status === "active" ? "0 0 10px var(--accent)" : "none",
                  opacity: status === "active" ? 1 : status === "done" ? 0.6 : 0.3,
                }} />
                <span style={{
                  fontSize: 13,
                  color: status === "active" ? "var(--text-active)" : status === "done" ? "var(--text-mid)" : "var(--border-dim)",
                }}>
                  {stage.label}
                </span>
                {status === "done" && <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-mid)" }}>✓</span>}
              </div>
            );
          })}
        </div>

        {/* progress bar */}
        <div style={{ width: "100%", height: 1, background: "var(--border)", borderRadius: 1, marginBottom: 10 }}>
          <div style={{
            height: "100%", width: `${progress.pct}%`,
            background: "linear-gradient(90deg, var(--accent), var(--text-active))",
            borderRadius: 1, boxShadow: "0 0 10px var(--accent-glow)",
            transition: "width 0.7s cubic-bezier(0.4,0,0.2,1)",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{progress.msg}</span>
          <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>{progress.pct}%</span>
        </div>
      </div>

      {/* footer */}
      <div style={{ borderTop: "1px solid var(--border)", padding: "16px 48px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "var(--border-dim)" }}>This usually takes about 60 seconds</span>
        <button onClick={onCancel} style={{ fontSize: 11, color: "var(--text-mid)", border: "1px solid var(--border-dim)", padding: "8px 20px", borderRadius: 6, background: "transparent" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**
```bash
git add frontend/src/screens/LoadingScreen.tsx
git commit -m "feat(frontend): add LoadingScreen with stage tracker"
```

---

### Task 5: PreviewScreen

**Files:**
- Create: `frontend/src/screens/PreviewScreen.tsx`

**Interfaces:**
- Consumes: `NavBar` from Task 2, `ScriptJSON` type from `../remotion/types`, `Player` + `PlayerRef` from `@remotion/player`, `GitflixVideo` + `SCENE_DURATIONS` from `../remotion/GitflixVideo`
- Produces: `<PreviewScreen script playerRef totalFrames chapterFrames onNewFilm onExport />`

- [ ] **Step 1: Create `frontend/src/screens/PreviewScreen.tsx`**

```tsx
import React from "react";
import { Player } from "@remotion/player";
import type { PlayerRef } from "@remotion/player";
import { GitflixVideo } from "../remotion/GitflixVideo";
import type { ScriptJSON } from "../remotion/types";
import NavBar from "../components/NavBar";

const FPS = 30;
const CHAPTERS = [
  { id: "S01", label: "Origin" },
  { id: "S02", label: "Cast" },
  { id: "S03", label: "The Rise" },
  { id: "S04", label: "Plot Twist" },
  { id: "S05", label: "Ghost Files" },
  { id: "S06", label: "Hero Commit" },
  { id: "S07", label: "Finale" },
];

interface Props {
  script: ScriptJSON;
  playerRef: React.RefObject<PlayerRef>;
  totalFrames: number;
  chapterFrames: Record<string, number>;
  onNewFilm: () => void;
  onExport: () => void;
}

export default function PreviewScreen({ script, playerRef, totalFrames, chapterFrames, onNewFilm, onExport }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--bg)" }}>
      <NavBar
        contextual={
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {script.repo_name}
            <span style={{ margin: "0 6px", color: "var(--border-dim)" }}>·</span>
            {script.total_commits} commits
            <span style={{ margin: "0 6px", color: "var(--border-dim)" }}>·</span>
            {script.contributor_count} contributors
          </span>
        }
        actions={
          <>
            <button onClick={onNewFilm} style={{ fontSize: 12, color: "var(--text-mid)", border: "1px solid var(--border-dim)", padding: "8px 18px", borderRadius: 6, background: "transparent" }}>
              ← New Film
            </button>
            <button onClick={onExport} style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: "var(--accent)", border: "none", padding: "8px 18px", borderRadius: 6 }}>
              Export MP4
            </button>
          </>
        }
      />

      {/* player */}
      <div style={{ background: "#000", width: "100%" }}>
        <Player
          ref={playerRef}
          component={GitflixVideo}
          inputProps={{ script }}
          durationInFrames={totalFrames}
          fps={FPS}
          compositionWidth={1920}
          compositionHeight={1080}
          style={{ width: "100%", maxHeight: "80vh" }}
          controls
        />
      </div>

      {/* chapter strip */}
      <div style={{ borderTop: "1px solid var(--border)", padding: "14px 48px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", background: "var(--bg)" }}>
        <span style={{ fontSize: 9, color: "var(--border-dim)", textTransform: "uppercase", letterSpacing: 3, marginRight: 8 }}>Chapters</span>
        {CHAPTERS.map(ch => (
          <button
            key={ch.id}
            onClick={() => playerRef.current?.seekTo(chapterFrames[ch.id])}
            style={{ fontSize: 11, color: "var(--text-muted)", border: "1px solid var(--border)", padding: "5px 14px", borderRadius: 4, background: "transparent", letterSpacing: 0.2 }}
            onMouseEnter={e => { (e.currentTarget.style.borderColor = "var(--accent)"); (e.currentTarget.style.color = "var(--text-active)"); }}
            onMouseLeave={e => { (e.currentTarget.style.borderColor = "var(--border)"); (e.currentTarget.style.color = "var(--text-muted)"); }}
          >
            {ch.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**
```bash
git add frontend/src/screens/PreviewScreen.tsx
git commit -m "feat(frontend): add PreviewScreen with chapter navigation"
```

---

### Task 6: ErrorScreen

**Files:**
- Create: `frontend/src/screens/ErrorScreen.tsx`

**Interfaces:**
- Consumes: `NavBar` from Task 2
- Produces: `<ErrorScreen error onRetry />`

- [ ] **Step 1: Create `frontend/src/screens/ErrorScreen.tsx`**

```tsx
import React from "react";
import NavBar from "../components/NavBar";

interface Props {
  error: string;
  onRetry: () => void;
}

export default function ErrorScreen({ error, onRetry }: Props) {
  const clean = error.startsWith("{") ? "Repository not found or is private. Please check the URL and try again." : error;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ height: 2, background: "linear-gradient(90deg, transparent, #dc2626, transparent)" }} />
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 48px", borderBottom: "1px solid #1e0a0a" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 800, letterSpacing: -0.5 }}>GITFLIX</span>
      </nav>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 520, width: "100%", margin: "0 auto", padding: "0 32px" }}>
        <div style={{ fontSize: 10, color: "#dc2626", letterSpacing: 4, textTransform: "uppercase", marginBottom: 16, fontFamily: "var(--font-display)" }}>
          Production Failed
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(36px, 4vw, 56px)", fontWeight: 900, letterSpacing: -3, lineHeight: 0.93, marginBottom: 16 }}>
          The film couldn't<br />be made.
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 32, lineHeight: 1.6 }}>{clean}</p>
        <button
          onClick={onRetry}
          style={{ alignSelf: "flex-start", fontSize: 13, color: "var(--text-mid)", border: "1px solid var(--border-dim)", padding: "10px 24px", borderRadius: 6, background: "transparent" }}
        >
          Try again →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**
```bash
git add frontend/src/screens/ErrorScreen.tsx
git commit -m "feat(frontend): add ErrorScreen"
```

---

### Task 7: Wire everything into `App.tsx`

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Replace all JSX in `App.tsx`** — keep every `useState`, `useRef`, `useEffect`, `handleGenerate`, `handleCancel`, `handleExport`, `notifyBackendCancel` function exactly as-is. Only replace the return statements and remove inline styles/constants that are now in components.

Replace the four render blocks (`if (stage === "input")`, `if (stage === "loading")`, `if (stage === "preview")`, error fallback) with:

```tsx
import InputScreen   from "./screens/InputScreen";
import LoadingScreen from "./screens/LoadingScreen";
import PreviewScreen from "./screens/PreviewScreen";
import ErrorScreen   from "./screens/ErrorScreen";

// inside App():
if (stage === "input") return (
  <InputScreen
    repoUrl={repoUrl} tone={tone} error={error} cooldown={cooldown}
    onRepoUrlChange={setRepoUrl} onToneChange={setTone} onGenerate={handleGenerate}
  />
);

if (stage === "loading") return (
  <LoadingScreen repoUrl={repoUrl} progress={progress} onCancel={handleCancel} />
);

if (stage === "preview" && script) return (
  <PreviewScreen
    script={script} playerRef={playerRef}
    totalFrames={TOTAL_FRAMES} chapterFrames={CHAPTER_FRAMES}
    onNewFilm={() => { setStage("input"); setScript(null); }}
    onExport={handleExport}
  />
);

return <ErrorScreen error={error} onRetry={() => { setStage("input"); setError(""); }} />;
```

- [ ] **Step 2: Remove now-unused constants from `App.tsx`** — delete `ACCENT`, `BG`, `SURFACE`, `BORDER`, `CHAPTER_IDS` (if duplicated), `CHAPTERS`, `FPS` (kept in PreviewScreen), `base` style object.

- [ ] **Step 3: Run the dev server and manually test all 4 screens**
  - Input → paste a GitHub URL → Generate → confirm loading stages animate
  - Let it complete → confirm preview + chapters work
  - Try a bad URL → confirm error screen shows clean message (not raw JSON)
  - Try closing tab mid-generation → confirm `beforeunload` warning fires

- [ ] **Step 4: Commit**
```bash
git add frontend/src/App.tsx frontend/src/screens/ frontend/src/components/
git commit -m "feat(frontend): wire new screen components into App"
```

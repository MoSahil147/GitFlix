# Journal

A running log of decisions taken on this project, in the order they were made.

Each entry covers: what was decided, why, and what it affects.

---

## How to use this file

1. When a decision is taken (naming, architecture, tooling, trade-off), add an entry below.
2. Keep entries short and dated.
3. Newest entries go at the bottom, so the file reads chronologically.
4. Use the format:

```
### YYYY-MM-DD - Short title
Decision: what was decided.
Reason: why it was decided this way.
Affects: which part of the project this touches.
```

---

## Decisions

### 2026-03-22 - Backend scaffolded with uv
Decision: use `uv` for Python dependency and environment management instead of plain pip or poetry.
Reason: faster installs and simpler lockfile handling for a solo-maintained backend.
Affects: `backend/`, project setup instructions.

### 2026-03-23 - Pydantic schemas as the data contract
Decision: define core data models (`CommitData`, `ContributorStats`, `FileHistory`, `RepoData`) in `schemas.py` using Pydantic, with strict typing (`datetime` not `str`, `Optional` where GitHub data can be missing).
Reason: catch bad data at the boundary rather than deep inside the pipeline, and enable safe date arithmetic for analytics.
Affects: `backend/schemas.py`, ingestion, analytics.

### 2026-03-24 - GitHub URL parsing kept simple
Decision: parse `owner/repo` from a GitHub URL with plain string splitting, no scraping or regex library.
Reason: the input shape is predictable enough that a heavier solution would be unnecessary complexity.
Affects: `backend/ingestion/github_client.py`.

### 2026-03-26 - Two-tier commit fetch strategy
Decision: do a lightweight scan of up to 300 commits for overall stats, then a detailed fetch of the first 100 (configurable) for per-file history.
Reason: fetching full file history for every commit is expensive (one extra GitHub API call each); this keeps the app inside GitHub's rate limits while still giving enough data for good analytics.
Affects: `backend/ingestion/github_client.py`.

### 2026-03-26 - Ghost file definition fixed
Decision: a file counts as a "ghost file" if it has not been modified in 180+ days and was modified more than 3 times in its lifetime.
Reason: distinguishes files that were once actively worked on and then abandoned from files that were simply never touched much, which is what makes the "Ghost Towns" scene (S05) work narratively.
Affects: `backend/analytics/analyzer.py`, Remotion scene S05.

### 2026-03-28 - Hero, ghost, late joiner, and consistent contributor arcs
Decision: only the top 6 contributors get a character role. Hero = highest commit count. Ghost = last commit 180+ days ago and more than 5 commits. Late joiner = first commit after the repo's midpoint and more than 10 commits. Everyone else is "consistent."
Reason: gives the LLM narration a small, clear cast instead of trying to build a story around every contributor.
Affects: `backend/analytics/analyzer.py`, narration prompts.

### 2026-03-28 - Spike detection via Z-score (2-sigma rule)
Decision: use a 2-sigma threshold on weekly commit counts to flag "spike" weeks for the plot-twist scene, despite knowing real commit histories are right-skewed rather than normally distributed.
Reason: a statistically purer method (Poisson/negative binomial) was judged not worth the complexity for a cinematic storytelling tool where "good enough" spikes are all that is needed.
Affects: `backend/analytics/analyzer.py`, Remotion scene S04.

### 2026-03-28 - Analytics output stays a plain dict, not a Pydantic model
Decision: the final analytics dict handed to the LangChain agent is not wrapped in its own Pydantic schema.
Reason: it is immediately serialised to JSON for the agent and nothing downstream inspects its structure directly, so a dedicated schema would be extra work for no real benefit at this stage.
Affects: `backend/analytics/analyzer.py`, `backend/agent/director.py`.

### 2026-03-29 - LangChain agent with 5 tools builds the script
Decision: use a LangChain agent with 5 `@tool` functions (contributors, plot twist, hero commit, ghost files, commit series) to gather story data before writing narration, orchestrated in `director.py`.
Reason: separates "what data does the story need" from "how is the narration written," and lets the LLM pull only the pieces relevant to each scene.
Affects: `backend/agent/tools.py`, `backend/agent/director.py`.

### 2026-03-29 - Remotion for video, 7 fixed scenes at 30fps
Decision: build the film as 7 Remotion scenes (S01 Origin through S07 Finale) played in sequence with `Series`, total runtime around 85 seconds at 30fps.
Reason: Remotion allows the video to be built programmatically from React components driven directly by the backend's `ScriptJSON`, rather than manual video editing.
Affects: `frontend/src/remotion/`.

### 2026-03-29 - Cinematic dark UI established early
Decision: dark UI theme (Playfair Display + DM Sans, purple accent) for the frontend from the first working version.
Reason: matches the "cinematic" framing of the product, distinct from a typical dashboard look.
Affects: `frontend/`.

### 2026-03-29/30 - Voiceover experiments, ultimately dropped
Decision: tried ElevenLabs TTS, then Groq/Orpheus TTS with per-scene streaming, then disabled voiceovers entirely in favour of subtitles only.
Reason: ElevenLabs free tier was blocked and Groq TTS hit the 3600 TPD token limit; subtitles gave a more reliable experience without depending on a flaky third-party voice quota.
Affects: `frontend/src/remotion/`, later `agent/llm_balancer.py` no longer needs to budget for TTS text length; `elevenlabs` package later flagged for removal from dependencies.

### 2026-03-30 - Narration prompt hardened against LLM quirks
Decision: explicit prompt rules ban parentheses, stage directions, music mentions, scene numbers, and years in narration; dates instead formatted as "Month Year."
Reason: the LLM kept producing narration that broke immersion (e.g. "(pause for effect)" or "Scene 3:"); constraining the prompt was more reliable than post-processing the text.
Affects: `backend/agent/director.py` system prompt.

### 2026-04-06/07 - Security hardening pass
Decision: added six security fixes together: strict GitHub URL regex validation, locked-down CORS via `ALLOWED_ORIGINS` env var, sanitised error responses (log full error server-side, return generic message to client), rate limiting (5/minute per IP via `slowapi`), startup env validation using FastAPI's `lifespan` (refuse to boot if `GITHUB_TOKEN`/`GROQ_API_KEY` missing), and removal of the dead `ELEVENLABS_API_KEY` from `render.yaml`.
Reason: `/generate` can trigger up to ~700 GitHub API calls and 7 Groq calls per request, so it needed protecting from abuse; raw tracebacks and open CORS were also flagged as unsafe for a public deployment.
Affects: `backend/main.py`, `backend/ingestion/github_client.py`, `render.yaml`.

### 2026-04-07 - LLM load balancer with round-robin and fallback
Decision: added `LLMLoadBalancer` (`agent/llm_balancer.py`) that round-robins between `llama-3.1-8b-instant` and `llama-3.3-70b-versatile`, falling back to the other model if one fails.
Reason: a single Groq model call failing (rate limit, timeout) should not fail the whole narration step.
Affects: `backend/agent/llm_balancer.py`, `backend/agent/director.py`.

### 2026-04-07 - Non-blocking I/O for the pipeline
Decision: wrap the synchronous `fetch_repo_data`, `run_analytics`, and `build_script` calls in `asyncio.to_thread` inside the async FastAPI handlers.
Reason: these functions make hundreds of blocking HTTP calls; calling them directly inside `async def` would freeze the event loop for every other concurrent request.
Affects: `backend/main.py`.

### 2026-04-07 - In-memory TTL cache keyed by (repo_url, tone)
Decision: cache generated scripts for 10 minutes, keyed on the repo URL and tone together, shared between the POST and streaming endpoints.
Reason: `/generate` hits the GitHub API roughly 700 times per call; caching avoids repeating that work when multiple people request the same repo/tone combination in a short window.
Affects: `backend/main.py`.

### 2026-04-07 - Hero role bug fixed with a single flag
Decision: compute `max_commits` once before the contributor loop, and only assign the "hero" role to the first contributor who matches it via a `hero_assigned` flag.
Reason: the previous approach recalculated the max on every iteration (unnecessary work) and assigned "hero" to every tied contributor, which broke the single-hero story structure.
Affects: `backend/analytics/analyzer.py`.

### 2026-04-07 - URL normalisation centralised
Decision: move `.strip().lower()` and trailing-slash handling into `_validate_repo_url` inside `github_client.py`, called from both endpoints.
Reason: the streaming endpoint normalised the URL but the plain POST endpoint did not, so the same repo could be treated inconsistently depending on which endpoint was hit.
Affects: `backend/ingestion/github_client.py`, `backend/main.py`.

### 2026-04-07 - Dead TTS code removed rather than commented out
Decision: delete the disabled Groq TTS block, `TTSRequest` model, and commented-out `/tts` endpoint entirely instead of leaving them commented in the file.
Reason: large blocks of commented-out code add noise without value; git history already preserves it if TTS is ever revisited.
Affects: `backend/main.py`.

### 2026-05-21 - Health check endpoint renamed to /status
Decision: renamed the backend's `/health` endpoint (and the render server's later on) to `/status`, updating the frontend's pre-flight fetch call to match.
Reason: some browser ad blockers and privacy extensions block requests to paths named `/health`, which could make a perfectly healthy backend look unreachable to the frontend.
Affects: `backend/main.py`, `frontend/src/App.tsx`, later `render-server/server.js` (which added `/status` alongside `/health`).

### 2026-06-20 - Frontend redesign scoped and locked before implementation
Decision: ran a structured brainstorm and design pass before touching code, producing a written plan (`docs/superpowers/plans/2026-06-20-frontend-redesign.md`). Locked in: dark desaturated palette with a single violet accent (`#7c3aed`), a thin violet gradient rule at the top of every screen, a persistent nav bar, a heavy display font for headlines, a segmented control (not pills) for the tone picker, and explicit exclusion of `src/remotion/` and all existing App.tsx logic (SSE streaming, cancel, sendBeacon, health check) from the redesign.
Reason: this was a purely visual overhaul of a working app; scoping it up front and freezing the logic boundary reduced the risk of regressions in the streaming/cancel flow while redesigning the shell.
Affects: `frontend/index.html`, `frontend/src/index.css`, `frontend/src/components/`, `frontend/src/App.tsx` (styling only).

### 2026-06-20 - Naming convention: "GitHub" not "GitHub" with a dash
Decision: standardise the eyebrow copy as "GitHub → Cinematic Video" with an arrow, no leading dash, and remove any leftover "BETA" tag from the UI.
Reason: consistency in how the product describes its core transformation across all screens.
Affects: frontend copy across input, loading, preview, and error screens.

### 2026-06-27 - MP4 export via a separate Node render server
Decision: build a standalone `render-server/` (Express + `@remotion/bundler` + `@remotion/renderer`) rather than rendering MP4s from the Python backend or in the browser.
Reason: Remotion's server-side rendering toolchain is Node-based; keeping it as its own service avoids mixing Node and Python runtimes inside `backend/` and keeps the render workload isolated from the main API.
Affects: `render-server/` (new), `frontend/src/App.tsx` (Export MP4 button, progress, download).

### 2026-06-28 - Render server bundle cached as a shared Promise
Decision: assign the `bundle()` call's Promise itself to `cachedBundle` before awaiting it, so concurrent requests all await the same in-flight Promise instead of each starting their own bundle.
Reason: assigning only the resolved value let two concurrent requests both pass the cache check before the first bundle finished, each independently calling `bundle()` and leaking a temp directory.
Affects: `render-server/server.js`.

### 2026-06-28 - Rendered file cleanup tied to successful send, not stream close
Decision: delete the rendered MP4 on `res.on('finish')` (successful full send) and on `stream.on('error')` (failure), not on generic stream `close`.
Reason: `close` also fires when a client disconnects mid-download, which was deleting the file before it had actually been received, breaking retry attempts.
Affects: `render-server/server.js`.

### 2026-06-28 - Export EventSource tracked in a ref and explicitly closed
Decision: store the export `EventSource` in `exportEsRef` and close/clear it on completion, error, "New Film" navigation, and component unmount.
Reason: the connection was previously a local variable with no external reference, so navigating away mid-export left it open and able to trigger a phantom download later.
Affects: `frontend/src/App.tsx`.

### 2026-07-02 - Decorative comment dividers removed across the codebase
Decision: stripped decorative comment-divider lines (e.g. banner-style `# ----` separators) from the backend, including `main.py`.
Reason: they added visual noise without conveying information; code should read cleanly without banner formatting.
Affects: `backend/` (codebase-wide cleanup).

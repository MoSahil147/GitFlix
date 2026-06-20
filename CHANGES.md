# GitFlix — Planned Changes

## Backend

### High Impact
- [ ] **Parallelize LLM narration calls** (`agent/director.py`)
  - Run all 7 `narrate()` calls concurrently with `ThreadPoolExecutor`
  - Cuts agent phase from ~20s to ~3s

- [ ] **Fix N+1 GitHub API calls** (`ingestion/github_client.py`)
  - Accessing `.files` and `.stats` per commit triggers a separate API call each time (up to 200 extra calls for 100 commits)
  - Reuse a single `Github()` client across requests instead of creating one per request

- [ ] **Remove LangChain tools indirection** (`agent/tools.py` + `agent/director.py`)
  - The 5 `@tool` functions serialize the analytics dict to JSON just to immediately deserialize it
  - Replace with direct dict access in `director.py`
  - Eliminates ~10 pointless JSON encode/decode cycles per generation

### Memory Leaks / Correctness
- [ ] **Cap in-memory cache** (`main.py`)
  - `_CACHE` grows forever; expired entries only pruned on exact key lookup
  - Swap for `cachetools.TTLCache` with a max size

- [ ] **Fix rate limiter memory leak** (`main.py`)
  - `_RateLimiter._requests` never removes old IPs
  - Add pruning for IPs with no recent requests

- [ ] **Replace polling loop with async queue** (`main.py`)
  - Streaming handler polls `queue.Queue` every 200ms burning wakeups
  - Replace with `asyncio.Queue` and `await q.get()`

### Cleanup / Correctness
- [ ] **Validate config once at startup** (`main.py`)
  - `_runtime_config_status()` calls `os.getenv()` on every request
  - Run once at boot, raise early if required vars are missing

- [ ] **Reuse `ChatGroq` instances** (`agent/llm_balancer.py`)
  - New HTTP client created on every `invoke()` call
  - Instantiate models once and store them
  - Fix broken round-robin — `_model_cycle` is advanced but never actually used for routing

- [ ] **Remove dead `/generate` POST endpoint** (`main.py`)
  - Frontend only uses the streaming endpoint
  - POST endpoint has no progress reporting, no cancel support, no tests

### Dependencies
- [ ] **Strip unused packages** (`requirements.txt`)
  - `langgraph`, `langgraph-checkpoint`, `langgraph-prebuilt`, `langgraph-sdk`, `langsmith` — not imported anywhere
  - `elevenlabs` — voiceover is disabled in frontend
  - Removing these cuts Render cold-start time significantly

---

## Frontend

### Redesign (in progress — design approved)
Full visual redesign of the shell (input, loading, preview, error screens). Remotion video scenes (S01–S07) are untouched. All existing logic (SSE streaming, cancel, beforeunload, sendBeacon, health check) is preserved — purely visual changes.

**Design decisions locked in:**
- Dark desaturated palette (`#050308` BG) — no strong accent except violet (`#7c3aed`)
- Thin violet gradient rule at top of every screen as structural anchor
- Nav bar on every screen — `GITFLIX` logo left, contextual info right
- Heavy display font (`900` weight, tight tracking) for headlines
- Clean readable font for body/labels
- Segmented control for tone picker (not pills)
- Stats grid (7 chapters / 3 tones / ~60s) pinned to bottom of input screen
- Loading screen: stage list with dots (done/active/pending) + thin progress bar + percent
- Preview screen: sticky nav with repo metadata, Remotion player full-width, chapter strip below
- Error screen: red rule replaces violet, "Production Failed" eyebrow, same structural language

**Items covered by redesign (supersedes old items below):**
- [ ] **Full App.tsx redesign** — split into focused components, CSS moved out of inline styles
- [ ] **Fix `CHAPTER_FRAMES` computation** — derive from `SCENE_DURATIONS` with `reduce`
- [ ] **Move font loading to `index.html`** — remove `document.createElement` side-effect
- [ ] **Eyebrow copy** — "GitHub → Cinematic Video" (no dash before it)
- [ ] **Remove Beta tag** — not present in current code, must not appear in redesign

---

## Tests

- [ ] **Replace `test_schemas.py` with real pytest tests**
  - Current file uses `print()`, has no assertions, and crashes on the bad-data test case
  - Write proper `pytest` tests with `pytest.raises` for validation errors
  - Add fixture-based tests for the analytics pipeline (`run_analytics`)
  - Add tests for `_validate_repo_url` edge cases

---

## Your Items
<!-- Add your own planned changes below -->

---

## Run Session Verification (2026-06-20)

### What Was Tested
Full end-to-end run of the app: backend routes, streaming pipeline, error handling, validation, cancel, and frontend serving.

---

### Backend — `http://localhost:8000`

**Routes confirmed working:**
| Route | Status |
|---|---|
| `GET /status` | ✅ Returns `{"status":"ok","missing_required":[],"warnings":[]}` |
| `GET /generate/stream` | ✅ Streams SSE events with `stage`, `pct`, `msg` |
| `POST /generate/cancel` | ✅ Returns `{"status":"not_found"}` for unknown IDs |
| `POST /generate` | ✅ Exists (unused by frontend — dead endpoint per CHANGES.md) |
| `GET /docs` | ✅ Swagger UI accessible |

**Streaming behavior observed (GitFlix repo, 97 commits):**
- Progress: `ingestion` stage fires rapidly with `pct` stuck at 15 during commit fetching
- Commit fetch batches at 20/40/60… with `pct` updates between "Processing..." floods
- "Processing..." messages fire every ~200ms between real progress (polling artifact — see CHANGES.md async queue item)

**Error handling confirmed:**
- Missing `repo_url` → `422` with clear field error: `"Field required"`
- Invalid `tone` → `422` with enum hint: `"Input should be 'epic', 'documentary' or 'casual'"`
- Private/nonexistent repo → streams `{"stage":"error","msg":"404 {\"message\":\"Not Found\"...}"}` — raw GitHub error exposed to client
- Cancel with unknown `request_id` → `{"status":"not_found"}` (correct)

**CORS:**
- Hardcoded default allows only `localhost:5173` and `localhost:3000`
- Dev is safe because frontend uses Vite proxy (`/api` → `localhost:8000`)
- Production requires `ALLOWED_ORIGINS` env var set correctly on Render

---

### Frontend — `http://localhost:6768`

**Port note:** `6767` is occupied by macOS system process (`bmc-perf-agent`). Vite auto-bumped to `6768`. The `vite.config.ts` port is set to `6767` but system conflict means actual dev URL is `6768`.

**Features confirmed present:**
- Input stage: GitHub URL field + tone selector (`epic` / `documentary` / `casual`)
- Loading stage: live SSE progress bar with cancel button
- Preview stage: Remotion video player with 7 chapter navigation
- Error stage: error message with retry

**7 Chapters:**
`Origin` → `Cast` → `The Rise` → `Plot Twist` → `Ghost Files` → `Hero Commit` → `Finale`

**Frontend guards:**
- Checks backend health (`/status`) before starting generation — good UX
- Uses `navigator.sendBeacon` for cancel on page unload (works even mid-navigation)
- `beforeunload` warning fires if user tries to leave during generation
- URL lowercased before sending to backend (`normalizedUrl`)
- Validates `github.com` presence client-side before hitting backend
- In production, shows clear error if `VITE_API_URL` env var is missing

**`CHAPTER_FRAMES` computation:** Manually chained additions (noted in CHANGES.md — derive from `reduce` instead)

**Font loading:** `document.createElement("link")` at module scope — side-effect on import (noted in CHANGES.md)

---

### Findings / Observations

- ⚠️ Port `6767` is system-reserved on this machine (`bmc-perf-agent`). Actual dev URL is `6768`.
- ⚠️ Raw GitHub 404 error message is exposed in SSE error event — user sees `{"message":"Not Found","documentation_url":"..."}` instead of a clean message like "Repository not found or is private."
- ⚠️ Progress `pct` bounces back and forth (e.g., `19 → 15 → 15 → 15 → 21`) during ingestion — caused by two threads writing to the same queue independently. Looks buggy in the UI progress bar.
- `POST /generate` endpoint exists and is reachable but the frontend never uses it (confirmed — only `GET /generate/stream` is called).
- CORS default origins don't include any `localhost:6767+` — only matters in production where `ALLOWED_ORIGINS` must be set.

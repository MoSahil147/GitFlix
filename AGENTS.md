# GitFlix — Agent Guide

## Project Overview

GitFlix transforms any public GitHub repository into a cinematic documentary-style video. It analyzes commit history, identifies key contributors and events, generates narration using an LLM, and produces a seven-scene animated film with subtitles and background music.

**Live:** [gitflix.netlify.app](https://gitflix.netlify.app)

**Architecture:** Monorepo with two independent services:
- **Backend** (`backend/`): FastAPI REST API + SSE streaming, Python 3.11+, managed with `uv`
- **Frontend** (`frontend/`): React 19 + TypeScript + Vite + Remotion 4, managed with `npm`

---

## Quick Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- GitHub personal access token (optional but recommended. Without it, the GitHub API is limited to 60 requests/hour)
- Groq API key (required)

### Backend Setup
```bash
cd backend
uv sync
source .venv/bin/activate        # Windows: .venv\Scripts\activate
```

Create `backend/.env`:
```env
GITHUB_TOKEN=your_github_personal_access_token
GROQ_API_KEY=your_groq_api_key
```

Start server:
```bash
uv run uvicorn main:app --reload
```

API runs at `http://localhost:8000`.

### Frontend Setup
```bash
cd frontend
npm install
```

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:8000
```

Start dev server:
```bash
npm run dev
```

Frontend runs at `http://localhost:5173`.

---

## Development Workflow

### Package Management
- **Backend:** Always use `uv` for Python operations:
  - `uv run python script.py` — run Python scripts
  - `uv run uvicorn main:app --reload` — start dev server
  - `uv add package` — add dependency
  - `uv sync` — install/update all dependencies from `pyproject.toml`
  - `uv run python -m pytest` — run tests

- **Frontend:** Use `npm`:
  - `npm run dev` — start dev server
  - `npm run build` — production build (includes TypeScript check)
  - `npm run lint` — run ESLint
  - `npm run preview` — preview production build

### Code Style
- **Backend:** Python 3.11+. Use `Optional[X]` for nullable types (not `X | None`). Use built-in generics (`list[X]`, `dict[K, V]`) for non-nullable collection types. Minimal comments — only where the *why* is non-obvious. No em-dashes or AI-generated filler in comments.
- **Frontend:** ESLint with `react-hooks` and `react-refresh` plugins enforced. TypeScript strict mode. All shared constants (`FPS`, `SCENE_DURATIONS`) live in `remotion/constants.ts` — do not re-export them from component files or the `react-refresh/only-export-components` rule will fire.

### Git Workflow
- Main branch: `main`
- Feature branches: descriptive names
- Conventional commit messages: `type(scope): description`

---

## Architecture

### Backend Pipeline
```
GitHub URL -> Ingestion -> Analytics -> Agent -> SSE Stream -> Frontend
```

1. **Ingestion** (`ingestion/github_client.py`):
   - Validates and normalises the GitHub URL (enforces HTTPS, strips trailing slashes, rejects non-GitHub hosts)
   - Fetches commits, contributors, and file histories from the GitHub API via PyGitHub
   - Uses the authenticated rate limit (5000 req/hr with token; 60 req/hr without)
   - Returns a `RepoData` Pydantic model

2. **Analytics** (`analytics/analyzer.py`):
   - Processes raw commit data into story elements
   - Identifies eras, ghost files, hero commits, and plot-twist spike weeks (2-sigma rule)
   - Calculates contributor statistics, roles (hero / ghost / late_joiner / consistent), and weekly commit series
   - Returns an analytics dict consumed by the agent

3. **Agent** (`agent/director.py`):
   - Builds a `ScriptJSON` from the analytics dict
   - Generates narration for all 7 scenes in parallel using `ThreadPoolExecutor` (reduces agent phase from ~20 s to ~3 s)
   - Uses `LLMLoadBalancer` for round-robin across Groq models with automatic fallback:
     - Primary: `llama-3.1-8b-instant` (fast)
     - Fallback: `llama-3.3-70b-versatile` (more capable)
   - Respects `cancel_event` between LLM calls
   - Returns a `ScriptJSON` Pydantic model

4. **API** (`main.py`):
   - `GET /generate/stream` — SSE endpoint for real-time progress updates
   - `POST /generate/cancel?request_id=<id>` — cancels an in-flight generation
   - `GET /status` — health check and config validation
   - In-memory cache keyed on `(repo_url, tone)` with 10-minute TTL and 50-entry cap
   - Sliding-window rate limiter (5 req/min per IP by default)
   - Duplicate-request guard: returns HTTP 409 if the same repo+tone is already in flight

### Frontend Architecture
```
App.tsx -> InputScreen -> LoadingScreen -> PreviewScreen
                                       \-> ErrorScreen
```

1. **`App.tsx`**: Manages four application states — `input`, `loading`, `preview`, and `error` — and holds all shared state (repo URL, tone, progress, script).
2. **`InputScreen`**: Landing page with repo URL input, tone selector, and call-to-action.
3. **`LoadingScreen`**: Shows per-stage progress from SSE events, a progress bar, elapsed percentage, and a cancel button with red accent hover styling.
4. **`PreviewScreen`**: Hosts the Remotion `Player` for the generated video with chapter navigation.
5. **`ErrorScreen`**: Displays backend errors with a retry action.
6. **`NavBar`** (`components/NavBar.tsx`): Shared top bar used across all screens.
7. **Remotion** (`remotion/`):
   - `constants.ts` — single source of truth for `FPS` and `SCENE_DURATIONS`
   - `GitflixVideo.tsx` — sequences all 7 scenes with per-scene fade transitions
   - `Subtitle.tsx` — animated subtitle overlay (imports `FPS` from `constants.ts`)
   - `Root.tsx` — Remotion composition root (imports both constants)
   - `scenes/S01-S07` — individual scene components

### Key Data Models
- `RepoData`: Raw repository data from GitHub
- `CommitData`: Individual commit with SHA, author, timestamp, diff stats, and optional diff excerpt
- `ContributorStats`: Contributor profile with activity metrics and language history
- `ScriptJSON`: Final output — all 7 scenes plus repo-level stats
- `Scene`: Individual scene with `scene_id`, narration text, and visual parameters
- `Character`: Contributor with assigned role and arc summary
- `HeroCommit`: Largest-diff commit with author and patch lines
- `PlotTwist`: Spike week with date and commit count

---

## Testing

### Backend
32 tests across 4 files, all runnable without network access or API keys:

| File | Coverage |
|------|----------|
| `test_schemas.py` | Pydantic model validation (7 tests) |
| `test_ingestion.py` | URL normalisation and validation (8 tests) |
| `test_analytics.py` | Analytics engine — hero commits, character roles, ghost files, plot twists (12 tests) |
| `test_main.py` | FastAPI endpoints — `/status` and `/generate/cancel` (5 tests) |

Run all tests:
```bash
cd backend
uv run python -m pytest
```

### Frontend
No automated tests currently configured. Manual testing via dev server.

---

## Building

### Backend
No build step required. Python runs directly.

For production:
```bash
cd backend
uv sync
uv run uvicorn main:app --host 0.0.0.0 --port $PORT
```

### Frontend
```bash
cd frontend
npm run build
```

Output in `frontend/dist/`. Deploy this directory to any static host.

---

## Deployment

### Backend (Render)
Configuration in `backend/render.yaml`:
- Service type: web
- Build: `pip install uv && uv sync`
- Start: `uv run uvicorn main:app --host 0.0.0.0 --port $PORT`
- Environment variables: `GITHUB_TOKEN`, `GROQ_API_KEY`, `ALLOWED_ORIGINS`

**SSE Headers:** Backend sends `X-Accel-Buffering: no` and `Cache-Control: no-cache` for proxy compatibility.

### Frontend (Netlify)
- Build command: `npm run build`
- Publish directory: `dist`
- Environment variable: `VITE_API_URL` (set to backend URL)

### Nginx Configuration (if applicable)
```nginx
proxy_buffering off;
proxy_cache off;
```

---

## Key Implementation Details

### SSE Streaming
- Server-sent events for real-time progress updates
- Event format: `data: {"stage": "...", "pct": N, "msg": "..."}\n\n`
- Stages: `ingestion` (0-40%) -> `analytics` (40%) -> `agent` (70%) -> `done` (100%)
- Error events: `{"stage": "error", "msg": "..."}`
- Client parses events using a `SSEEvent` discriminated union in `App.tsx`

### Cancellation
- Client sends `POST /generate/cancel?request_id=<id>` when the cancel button is clicked
- Backend sets a `threading.Event` that is checked between each pipeline stage and between LLM calls
- On cancellation the in-flight entry is cleaned up and streaming stops immediately

### Rate Limiting
- 5 requests per minute per IP (sliding window), configurable via env vars
- In-memory storage (resets on restart)
- Returns HTTP 429 when exceeded

### Caching
- In-memory cache, 10-minute TTL, capped at 50 entries (LRU eviction on overflow)
- Key: `(repo_url, tone)` tuple
- Prevents duplicate API calls for the same request

### Error Handling
- Frontend: `SSEEvent` discriminated union guards all SSE parsing; errors route to `ErrorScreen`
- Backend: errors sanitised before sending to client (no stack traces), logged server-side with structured format
- Pydantic validation catches malformed data at every stage boundary

---

## Environment Variables

| Variable | Service | Required | Purpose |
|----------|---------|----------|---------|
| `GROQ_API_KEY` | Backend | **Yes** | LLM narration via Groq |
| `GITHUB_TOKEN` | Backend | No | GitHub API auth; without it requests use the unauthenticated limit (60 req/hr) |
| `ALLOWED_ORIGINS` | Backend | No | CORS origins (default: `http://localhost:5173,http://localhost:3000`) |
| `VITE_API_URL` | Frontend | No | Backend URL (default: `http://localhost:8000`) |
| `RATE_LIMIT_MAX` | Backend | No | Max requests per window (default: `5`) |
| `RATE_LIMIT_WINDOW` | Backend | No | Rate limit window in seconds (default: `60`) |
| `GENERATION_TIMEOUT` | Backend | No | Max generation time in seconds (default: `180`) |

---

## Project Structure

```
GitFlix/
├── backend/
│   ├── ingestion/
│   │   ├── __init__.py
│   │   └── github_client.py        # GitHub API client and URL validation
│   ├── analytics/
│   │   ├── __init__.py
│   │   └── analyzer.py             # Commit analytics engine
│   ├── agent/
│   │   ├── __init__.py
│   │   ├── director.py             # Script builder with parallel narration
│   │   ├── tools.py                # LangChain tools
│   │   └── llm_balancer.py         # Round-robin Groq model balancer
│   ├── main.py                     # FastAPI app, SSE stream, cache, rate limiter
│   ├── schemas.py                  # Pydantic models
│   ├── test_schemas.py             # Schema validation tests
│   ├── test_ingestion.py           # URL validation tests
│   ├── test_analytics.py           # Analytics engine tests
│   ├── test_main.py                # API endpoint tests
│   ├── pyproject.toml              # Python project config (uv)
│   ├── requirements.txt            # Pinned dependencies
│   └── render.yaml                 # Render deployment config
└── frontend/
    ├── src/
    │   ├── App.tsx                  # State machine: input / loading / preview / error
    │   ├── main.tsx                 # Entry point
    │   ├── index.css                # CSS custom properties (warm amber theme)
    │   ├── components/
    │   │   └── NavBar.tsx           # Shared top navigation bar
    │   ├── screens/
    │   │   ├── InputScreen.tsx      # Repo URL input and tone selector
    │   │   ├── LoadingScreen.tsx    # SSE progress display with cancel button
    │   │   ├── PreviewScreen.tsx    # Remotion player with chapter navigation
    │   │   └── ErrorScreen.tsx      # Error display with retry
    │   └── remotion/
    │       ├── constants.ts         # FPS and SCENE_DURATIONS (single source of truth)
    │       ├── types.ts             # ScriptJSON and related TypeScript types
    │       ├── Root.tsx             # Remotion composition root
    │       ├── GitflixVideo.tsx     # Video sequence orchestrator
    │       ├── Subtitle.tsx         # Animated subtitle component
    │       └── scenes/
    │           ├── S01Origin.tsx    # Repository origin scene
    │           ├── S02Cast.tsx      # Contributor cards scene
    │           ├── S03Rise.tsx      # Commit history donut chart
    │           ├── S04PlotTwist.tsx # Spike week visualisation
    │           ├── S05GhostTowns.tsx# Abandoned files scene
    │           ├── S06HeroCommit.tsx# Largest commit diff typewriter
    │           └── S07FinalState.tsx# Final stats and watermark
    ├── package.json
    ├── vite.config.ts
    └── tsconfig.json
```

---

## Common Tasks

### Add a New Backend Dependency
```bash
cd backend
uv add package-name
```

### Add a New Frontend Dependency
```bash
cd frontend
npm install package-name
```

### Run Both Services
Terminal 1:
```bash
cd backend && uv run uvicorn main:app --reload
```

Terminal 2:
```bash
cd frontend && npm run dev
```

### Run Backend Tests
```bash
cd backend && uv run python -m pytest
```

### Test a Repository
1. Open `http://localhost:5173`
2. Enter a GitHub URL (e.g., `https://github.com/facebook/react`)
3. Select a tone
4. Click Generate Film
5. Monitor progress in the loading screen and watch the video in the preview

---

## Known Limitations

- GitHub API rate limits: ~700 API calls per generation for large repos; set `GITHUB_TOKEN` to avoid the 60 req/hr unauthenticated limit
- Groq API rate limits: 7 LLM calls per generation (one per scene)
- In-memory cache and rate limiter reset on server restart (no persistent storage)
- No database
- Frontend has no automated tests

---

## Troubleshooting

### Backend won't start
- Check `backend/.env` exists with `GROQ_API_KEY` set (required) and `GITHUB_TOKEN` (recommended)
- Verify Python 3.11+ is installed: `python --version`
- Ensure the virtual environment is activated

### Frontend can't connect to backend
- Check `VITE_API_URL` in `frontend/.env` matches the backend URL
- Verify the backend is running on the correct port
- Check the browser console for CORS errors

### Generation fails
- Check backend logs for the specific error message
- Verify the GitHub token has sufficient permissions
- Verify the Groq API key is valid and has remaining quota
- Try a smaller repository first

### SSE stream disconnects
- Check for proxy buffering (nginx needs `proxy_buffering off`)
- Verify the `X-Accel-Buffering: no` response header is present
- Check network timeout settings

# GitFlix — Frontend

React 19 + TypeScript + Vite + Remotion frontend for GitFlix.

## Dev server

```bash
npm install
npm run dev
```

Runs at `http://localhost:6767` (auto-moves to 6768 if that port is busy).

Requires the backend running at `http://localhost:8000`. API calls are proxied via Vite — no CORS config needed in dev.

## Build

```bash
npm run build
```

Outputs a static site to `dist/`. Deploy to Netlify, Vercel, or any static host. Set `VITE_API_URL` to your backend URL in the host's environment settings.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Backend base URL. Defaults to `/api` in dev (proxied by Vite) and must be set explicitly in production. |

## Structure

```
src/
├── remotion/
│   ├── GitflixVideo.tsx    # Root Remotion composition
│   ├── Subtitle.tsx        # Animated subtitle overlay
│   └── scenes/             # S01–S07 scene components (do not edit lightly)
├── screens/
│   ├── InputScreen.tsx
│   ├── LoadingScreen.tsx
│   ├── PreviewScreen.tsx
│   └── ErrorScreen.tsx
├── components/
│   └── NavBar.tsx
└── App.tsx                 # Top-level state machine
```

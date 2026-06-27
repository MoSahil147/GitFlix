# MP4 Export — Design Spec
Date: 2026-06-27

## What we're building

A Node.js render server that sits alongside the existing Python backend. When the user clicks "Export MP4" on the preview screen, the frontend sends the `ScriptJSON` to this server, which renders the Remotion composition to a 720p MP4 and streams it back as a download. The Python backend is not touched.

## Architecture

```
frontend (React/Vite)        render-server/ (Node.js)
        │                            │
        │  POST /render              │
        │  { script: ScriptJSON } ──►│
        │                            │  @remotion/bundler → bundles Root.tsx
        │                            │  @remotion/renderer → renders frames → MP4
        │  ◄── SSE progress % ───────│
        │  ◄── MP4 file download ────│
        │                            │  cleanup temp file
   download lands in Downloads       │
```

Three independent processes:
- `npm run dev` — Vite frontend on port 5173
- `uvicorn main:app` — Python backend on port 8000
- `node server.js` — render server on port 3001

## Components

### `render-server/` (new directory)

**`package.json`**
Dependencies: `express`, `cors`, `@remotion/renderer`, `@remotion/bundler` — all pinned to 4.0.481 to match the frontend.

**`server.js`**
Single Express file, ~60 lines. One endpoint: `POST /render`.

Flow:
1. Receive `ScriptJSON` from request body
2. Bundle `Root.tsx` using `@remotion/bundler` (cached after first render — subsequent exports skip this)
3. Write a temp output path (`/tmp/gitflix-<uuid>.mp4`)
4. Call `renderMedia()` with:
   - composition id: `"Gitflix"`
   - output: 1280×720 (720p)
   - fps: 30
   - inputProps: the received `ScriptJSON`
   - onProgress: streams SSE events back to client
5. On completion, pipe the MP4 file back as a response (`Content-Disposition: attachment`)
6. `finally` block deletes the temp file

Code style: plain readable JS, no TypeScript, no classes, no abstraction layers. Just a handful of functions and one Express route.

### Frontend — `PreviewScreen.tsx`

Export button gets three visual states:

| State | Appearance |
|---|---|
| Idle | Gold background, "Export MP4", clickable |
| Rendering | Dimmed, "Rendering… 42%", disabled |
| Done | Download triggers, resets to Idle |

The `onExport` handler in `App.tsx`:
1. Opens an `EventSource` to `/render` (SSE)
2. Updates progress % on each event
3. On the `done` event, fetches the file blob and triggers `<a download>` click
4. On `error` event, shows "Export failed" for 3s then resets

No modal, no extra page. The file just lands in Downloads automatically.

## Error handling

- Render server offline → fetch fails immediately → show "Render server offline" for 3s, reset button
- Render crashes mid-way → server sends `{ type: "error" }` SSE event → "Export failed" for 3s, reset
- Double-submit → button disabled during render, not possible
- Temp file → always cleaned up in `finally`, even on error

## What doesn't change

- Python backend (`backend/`) — zero modifications
- Remotion composition (`src/remotion/`) — zero modifications
- All existing screens — zero modifications

## Style rules

- Simple, readable code — looks like a human wrote it
- No TypeScript in the render server (plain JS)
- No helper abstractions unless something is used 3+ times
- No comments explaining what the code does — only the occasional comment for a non-obvious why

## Ports

| Service | Port |
|---|---|
| Vite frontend | 5173 |
| Python backend | 8000 |
| Node.js render server | 3001 |

## Render time estimate

720p, 131 seconds, 30fps → ~3–5 min on a laptop. Acceptable for a one-time export.

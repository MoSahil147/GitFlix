## App.tsx

- 4 screens — input, loading, preview, error
- Fonts — Playfair Display (serif, for headings) + DM Sans (sans, for body)
- Accent color — #8B5CF6 (purple violet)
- Google Fonts injected at runtime via document.createElement
- Progress bar uses SSE events from /generate/stream
- playerRef.current?.seekTo() jumps to chapter frame on button click
- backgroundImage radial gradient gives the cinematic glow at top of page
### S01 Origin scene
- useCurrentFrame() = current frame number, increases every frame
- interpolate(frame, [start, end], [from, to]) = maps frames to values
- extrapolateRight clamp = stop changing after the last keyframe
- Each element has a different start frame so they stagger in

### S02 Cast scene
- Cards stagger in using delay = i * 8 (each card 8 frames after previous)
- translateY animates from 30 to 0 — slides up as it fades in
- color + "33" in hex = 20% opacity version of that color
- slice(0, 6) — max 6 characters shown in the film

### S03 Rise scene
- barsToShow grows over time using interpolate — bars appear left to right
- bar height = (count / maxCount) * CHART_HEIGHT — scales relative to tallest bar
- spikes = weeks above 70% of max count — shown in orange
- useVideoConfig() gives durationInFrames for the current scene
- BAR_WIDTH calculated to fit all 52 bars across 1400px

### S04 Plot Twist scene
- Flash uses 3 keyframes — goes from 0 to 1 to 0 opacity in 15 frames
- inset: 0 = shorthand for top/right/bottom/left all 0 — covers full screen
- pointerEvents: none = div is invisible to mouse clicks
- Text fades in after flash at frame 20

### S05 Ghost Towns scene
- Each file uses 4 keyframes — fade in, hold, fade out (ghost effect)
- startFrame = i * 12 — each file appears 12 frames after previous
- monospace font makes file paths look like real terminal output
- opacity goes 0 → 0.8 → 0.8 → 0.1 — appears then fades away

### S06 Hero Commit scene
- DIFF_LINES is hardcoded — real diff parsing too complex for now
- linesVisible grows from 0 to 5 — lines appear one by one
- COLOR object maps line type to colour — add=green, remove=red, neutral=grey
- keyof typeof COLOR = TypeScript way of saying "one of the keys in this object"
- Stats fade in at frame 110 after diff is fully visible

### S07 Final State scene
- Last scene — the outro of the film
- 4 stats stagger in 12 frames apart — same pattern as S02
- toLocaleString() formats numbers with commas e.g. 1000 → 1,000
- ?? "—" = nullish coalescing — shows dash if value is null or undefined
- narration fades in last at frame 130
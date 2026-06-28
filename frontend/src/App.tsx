import { useState, useRef, useEffect } from "react";
import type { PlayerRef } from "@remotion/player";
import { SCENE_DURATIONS, FPS } from "./remotion/constants";
import type { ScriptJSON } from "./remotion/types";
import InputScreen   from "./screens/InputScreen";
import LoadingScreen from "./screens/LoadingScreen";
import PreviewScreen from "./screens/PreviewScreen";
import type { Resolution } from "./screens/PreviewScreen";
import ErrorScreen   from "./screens/ErrorScreen";

const API = (import.meta.env.VITE_API_URL ?? "").trim() || (import.meta.env.DEV ? "/api" : "");

// cumulative start frame for each chapter
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

const TOTAL_FRAMES = Object.values(SCENE_DURATIONS).reduce((a, b) => a + b, 0) * FPS;

type Stage = "input" | "loading" | "preview" | "error";

type HealthResponse = {
  status: "ok" | "degraded";
  missing_required?: string[];
  warnings?: string[];
};

export default function App() {
  const [stage, setStage]       = useState<Stage>("input");
  const [repoUrl, setRepoUrl]   = useState("");
  const [tone, setTone]         = useState<"epic" | "documentary" | "casual">("documentary");
  const [progress, setProgress] = useState({ pct: 0, msg: "" });
  const [script, setScript]     = useState<ScriptJSON | null>(null);
  const [error, setError]       = useState("");
  const [cooldown, setCooldown] = useState(false);
  const [exporting, setExporting]     = useState(false);
  const [exportPct, setExportPct]     = useState(0);
  const [exportRes, setExportRes]     = useState<Resolution>("720p");
  const playerRef               = useRef<PlayerRef>(null);
  const eventSourceRef          = useRef<EventSource | null>(null);
  const requestIdRef            = useRef<string | null>(null);
  const exportEsRef             = useRef<EventSource | null>(null);

  // Send cancel signal to backend (works even during page unload via sendBeacon)
  const notifyBackendCancel = () => {
    if (requestIdRef.current && API) {
      try {
        navigator.sendBeacon(`${API}/generate/cancel?request_id=${requestIdRef.current}`);
      } catch {
        // sendBeacon may not be available in all browsers
      }
    }
  };

  // Warn user when trying to leave during generation
  useEffect(() => {
    if (stage !== "loading") return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    const handlePageHide = () => {
      notifyBackendCancel();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [stage]);

  // Clean up EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (exportEsRef.current) {
        exportEsRef.current.close();
        exportEsRef.current = null;
      }
      notifyBackendCancel();
    };
  }, []);

  const handleCancel = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    notifyBackendCancel();
    requestIdRef.current = null;
    setStage("input");
    setProgress({ pct: 0, msg: "" });
    setError("");
  };

  const handleGenerate = async () => {
    if (stage === "loading" || cooldown) return;
    const normalizedUrl = repoUrl.trim().toLowerCase();
    if (!normalizedUrl.includes("github.com")) { setError("Please enter a valid GitHub URL"); return; }
    if (!API) {
      setError("Frontend is missing VITE_API_URL. Set it in Netlify to your Render backend URL.");
      setStage("error");
      return;
    }
    setError(""); setStage("loading"); setProgress({ pct: 0, msg: "Connecting..." });

    try {
      const healthRes = await fetch(`${API}/status`);
      if (!healthRes.ok) {
        throw new Error(`Backend health check failed with status ${healthRes.status}.`);
      }

      const health = await healthRes.json() as HealthResponse;
      if (health.status !== "ok") {
        const missing = health.missing_required?.length
          ? `Missing backend env vars: ${health.missing_required.join(", ")}.`
          : "Backend configuration is incomplete.";
        throw new Error(missing);
      }
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : "Could not reach the backend. Please make sure it is running and try again.";
      setError(message);
      setStage("error");
      setCooldown(true);
      setTimeout(() => setCooldown(false), 3000);
      return;
    }

    const requestId = crypto.randomUUID();
    requestIdRef.current = requestId;
    const url = `${API}/generate/stream?request_id=${requestId}&repo_url=${encodeURIComponent(normalizedUrl)}&tone=${tone}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;
    type SSEEvent =
      | { stage: "done"; pct: number; data: ScriptJSON }
      | { stage: "error"; msg: string }
      | { stage: "ingestion" | "analytics" | "agent"; pct: number; msg: string };

    es.onmessage = (e) => {
      let data: SSEEvent;
      try {
        data = JSON.parse(e.data) as SSEEvent;
      } catch {
        console.error("[GitFlix] malformed SSE message:", e.data);
        return;
      }
      if (data.stage === "done") {
        setScript(data.data); setStage("preview"); es.close(); eventSourceRef.current = null;
      }
      else if (data.stage === "error") {
        setError(data.msg); setStage("error"); es.close(); eventSourceRef.current = null;
        setCooldown(true);
        setTimeout(() => setCooldown(false), 3000);
      }
      else { setProgress({ pct: data.pct, msg: data.msg }); }
    };
    es.onerror = () => {
      setError("Connection lost while streaming the film. Please check the backend and try again.");
      setStage("error");
      es.close();
      eventSourceRef.current = null;
      setCooldown(true);
      setTimeout(() => setCooldown(false), 3000);
    };
  };

  const handleExport = async () => {
    if (exporting || !script) return;
    setExporting(true);
    setExportPct(0);

    const renderUrl = (import.meta.env.VITE_RENDER_URL ?? "").trim() || "http://localhost:3001";

    try {
      const res = await fetch(`${renderUrl}/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-render-secret": import.meta.env.VITE_RENDER_SECRET || "" },
        body: JSON.stringify({ script, resolution: exportRes }),
      });
      if (!res.ok) throw new Error("Render server returned an error");
      const { id, token } = await res.json() as { id: string; token: string };

      const es = new EventSource(`${renderUrl}/render/${id}/progress?token=${encodeURIComponent(token)}`);
      exportEsRef.current = es;

      es.onmessage = (e) => {
        const data = JSON.parse(e.data) as { type: string; pct?: number; message?: string };

        if (data.type === "progress") {
          setExportPct(data.pct ?? 0);
        } else if (data.type === "done") {
          es.close();
          exportEsRef.current = null;
          const a = document.createElement("a");
          a.href = `${renderUrl}/render/${id}/file?token=${encodeURIComponent(token)}`;
          a.download = "gitflix.mp4";
          a.click();
          setExporting(false);
          setExportPct(0);
        } else if (data.type === "error") {
          es.close();
          exportEsRef.current = null;
          setExporting(false);
          setExportPct(0);
          setError(`Export failed: ${data.message}`);
          setStage("error");
        }
      };

      es.onerror = () => {
        es.close();
        exportEsRef.current = null;
        setExporting(false);
        setExportPct(0);
        setError("Lost connection to render server. Is it running on port 3001?");
        setStage("error");
      };
    } catch {
      setExporting(false);
      setError("Could not reach render server. Is it running on port 3001?");
      setStage("error");
    }
  };

  if (stage === "input") return (
    <InputScreen
      repoUrl={repoUrl}
      tone={tone}
      error={error}
      cooldown={cooldown}
      onRepoUrlChange={setRepoUrl}
      onToneChange={setTone}
      onGenerate={handleGenerate}
    />
  );

  if (stage === "loading") return (
    <LoadingScreen
      repoUrl={repoUrl}
      progress={progress}
      onCancel={handleCancel}
    />
  );

  if (stage === "preview" && script) return (
    <PreviewScreen
      script={script}
      playerRef={playerRef}
      totalFrames={TOTAL_FRAMES}
      chapterFrames={CHAPTER_FRAMES}
      onNewFilm={() => {
        if (exportEsRef.current) { exportEsRef.current.close(); exportEsRef.current = null; }
        setStage("input");
        setScript(null);
        setExporting(false);
        setExportPct(0);
        setExportRes("720p");
      }}
      onExport={handleExport}
      exporting={exporting}
      exportPct={exportPct}
      resolution={exportRes}
      onResolutionChange={setExportRes}
    />
  );

  return (
    <ErrorScreen
      error={error}
      onRetry={() => { setStage("input"); setError(""); }}
    />
  );
}

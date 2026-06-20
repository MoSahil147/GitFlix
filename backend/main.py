import asyncio
import json
import logging
import os
import threading
import time
import uuid
from collections import defaultdict

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Literal

from agent.director import build_script, CancelledError
from analytics.analyzer import run_analytics
from ingestion.github_client import fetch_repo_data

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-7s %(message)s",
    datefmt="%H:%M:%S",
)

log = logging.getLogger("gitflix")

# ---------------------------------------------------------------------------
# Config — validated once at startup
# ---------------------------------------------------------------------------
def _build_config_status() -> dict:
    missing_required = []
    warnings = []
    if not os.getenv("GROQ_API_KEY"):
        missing_required.append("GROQ_API_KEY")
    if not os.getenv("GITHUB_TOKEN"):
        warnings.append("GITHUB_TOKEN is not set. Public GitHub requests may be rate-limited.")
    return {
        "ok": not missing_required,
        "missing_required": missing_required,
        "warnings": warnings,
    }

_CONFIG_STATUS = _build_config_status()


def _require_runtime_config() -> None:
    if _CONFIG_STATUS["missing_required"]:
        missing = ", ".join(_CONFIG_STATUS["missing_required"])
        raise HTTPException(
            status_code=503,
            detail=f"Backend is missing required environment variables: {missing}",
        )


# ---------------------------------------------------------------------------
# In-memory cache — capped at 50 entries, TTL 10 minutes
# ---------------------------------------------------------------------------
_CACHE: dict = {}
_CACHE_TTL = 600
_CACHE_MAX_SIZE = 50


def _cache_get(key: tuple):
    entry = _CACHE.get(key)
    if entry and entry[1] > time.monotonic():
        return entry[0]
    return None


def _cache_set(key: tuple, value):
    if len(_CACHE) >= _CACHE_MAX_SIZE:
        now = time.monotonic()
        expired = [k for k, (_, exp) in _CACHE.items() if exp <= now]
        for k in expired:
            del _CACHE[k]
        if len(_CACHE) >= _CACHE_MAX_SIZE:
            oldest = min(_CACHE, key=lambda k: _CACHE[k][1])
            del _CACHE[oldest]
    _CACHE[key] = (value, time.monotonic() + _CACHE_TTL)


# ---------------------------------------------------------------------------
# Rate limiter — sliding window per IP, prunes dead entries
# ---------------------------------------------------------------------------
class _RateLimiter:
    def __init__(self, max_requests: int = 5, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: dict[str, list[float]] = defaultdict(list)

    def is_allowed(self, client_ip: str) -> bool:
        now = time.monotonic()
        recent = [t for t in self._requests[client_ip] if now - t < self.window_seconds]
        if recent:
            self._requests[client_ip] = recent
        else:
            del self._requests[client_ip]
        if len(recent) >= self.max_requests:
            return False
        self._requests[client_ip].append(now)
        return True


_rate_limiter = _RateLimiter(
    max_requests=int(os.getenv("RATE_LIMIT_MAX", "5")),
    window_seconds=int(os.getenv("RATE_LIMIT_WINDOW", "60")),
)

# ---------------------------------------------------------------------------
# In-flight tracking and cancel events
# ---------------------------------------------------------------------------
_inflight: set[tuple] = set()
_cancel_events: dict[str, threading.Event] = {}
_MAX_GENERATION_TIMEOUT = int(os.getenv("GENERATION_TIMEOUT", "180"))

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(title="GitFlix API")

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class GenerateRequest(BaseModel):
    repo_url: str
    tone: Literal["epic", "documentary", "casual"] = "documentary"


@app.get("/generate/stream")
async def generate_stream(
    request: Request,
    repo_url: str,
    tone: Literal["epic", "documentary", "casual"] = "documentary",
    request_id: str | None = None,
):
    req_id = request_id or uuid.uuid4().hex[:8]
    client_ip = request.client.host if request.client else "unknown"
    log.info("[stream %s] request started | ip=%s repo=%s tone=%s", req_id, client_ip, repo_url, tone)

    if not _rate_limiter.is_allowed(client_ip):
        log.warning("[stream %s] rate limited | ip=%s", req_id, client_ip)
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a moment before trying again.")

    repo_url = repo_url.strip().lower()
    cache_key = (repo_url, tone)

    if cache_key in _inflight:
        log.warning("[stream %s] duplicate request blocked | key=%s", req_id, cache_key)
        raise HTTPException(status_code=409, detail="A generation for this repository is already in progress. Please wait.")

    _inflight.add(cache_key)
    log.info("[stream %s] registered in-flight | active=%d", req_id, len(_inflight))

    cancel_event = threading.Event()
    _cancel_events[req_id] = cancel_event
    log.info("[stream %s] cancel handler registered", req_id)

    async def event_stream():
        loop = asyncio.get_running_loop()

        try:
            config_status = _build_config_status()
            if config_status["missing_required"]:
                missing = ", ".join(config_status["missing_required"])
                yield f"data: {json.dumps({'stage': 'error', 'msg': f'Backend is missing required environment variables: {missing}'})}\n\n"
                return

            cached = _cache_get(cache_key)
            if cached:
                log.info("[stream %s] cache hit | returning cached result", req_id)
                yield f"data: {json.dumps({'stage': 'done', 'pct': 100, 'data': cached.model_dump()})}\n\n"
                return

            q: asyncio.Queue = asyncio.Queue()

            def progress_cb(pct: int, msg: str) -> None:
                if not cancel_event.is_set():
                    loop.call_soon_threadsafe(q.put_nowait, {"type": "progress", "pct": pct, "msg": msg})

            def worker() -> None:
                try:
                    data = fetch_repo_data(repo_url, on_progress=progress_cb, cancel_event=cancel_event)
                    loop.call_soon_threadsafe(q.put_nowait, {"type": "result", "data": data})
                except Exception as e:
                    if not cancel_event.is_set():
                        loop.call_soon_threadsafe(q.put_nowait, {"type": "error", "msg": str(e)})
                finally:
                    loop.call_soon_threadsafe(q.put_nowait, {"type": "done"})

            t = threading.Thread(target=worker, daemon=True)
            t.start()
            log.info("[stream %s] ingestion worker started", req_id)

            repo_data = None
            start_time = time.monotonic()

            while True:
                if await request.is_disconnected():
                    log.warning("[stream %s] CLIENT DISCONNECTED | cancelling", req_id)
                    cancel_event.set()
                    return

                if time.monotonic() - start_time > _MAX_GENERATION_TIMEOUT:
                    log.warning("[stream %s] TIMEOUT | cancelling", req_id)
                    cancel_event.set()
                    yield f"data: {json.dumps({'stage': 'error', 'msg': 'Generation timed out. Please try again.'})}\n\n"
                    return

                try:
                    item = await asyncio.wait_for(q.get(), timeout=5.0)
                except asyncio.TimeoutError:
                    yield f"data: {json.dumps({'stage': 'ingestion', 'pct': 15, 'msg': 'Processing...'})}\n\n"
                    continue

                if item["type"] == "progress":
                    yield f"data: {json.dumps({'stage': 'ingestion', 'pct': item['pct'], 'msg': item['msg']})}\n\n"
                elif item["type"] == "result":
                    repo_data = item["data"]
                    break
                elif item["type"] == "error":
                    raise Exception(item["msg"])
                elif item["type"] == "done":
                    break

            if cancel_event.is_set():
                log.info("[stream %s] cancelled before analytics (elapsed=%.1fs)", req_id, time.monotonic() - start_time)
                return

            if not repo_data:
                raise Exception("Ingestion failed to return data.")

            log.info("[stream %s] ingestion done | starting analytics", req_id)
            yield f"data: {json.dumps({'stage': 'analytics', 'pct': 40, 'msg': 'Analysing commit history…'})}\n\n"
            analytics = await asyncio.to_thread(run_analytics, repo_data)

            if cancel_event.is_set():
                log.info("[stream %s] cancelled before agent (elapsed=%.1fs)", req_id, time.monotonic() - start_time)
                return

            log.info("[stream %s] analytics done | starting LLM agent", req_id)
            yield f"data: {json.dumps({'stage': 'agent', 'pct': 70, 'msg': 'Writing the cinematic script…'})}\n\n"
            script = await asyncio.to_thread(build_script, analytics, tone, cancel_event)

            if cancel_event.is_set():
                log.info("[stream %s] cancelled after agent (elapsed=%.1fs)", req_id, time.monotonic() - start_time)
                return

            _cache_set(cache_key, script)
            elapsed = time.monotonic() - start_time
            log.info("[stream %s] generation complete | elapsed=%.1fs", req_id, elapsed)
            yield f"data: {json.dumps({'stage': 'done', 'pct': 100, 'data': script.model_dump()})}\n\n"

        except CancelledError:
            log.info("[stream %s] cancelled during generation", req_id)
            return
        except Exception as e:
            log.error("[stream %s] error: %s", req_id, e)
            yield f"data: {json.dumps({'stage': 'error', 'msg': str(e)})}\n\n"
        finally:
            log.info("[stream %s] cleanup | active=%d", req_id, len(_inflight) - 1)
            _inflight.discard(cache_key)
            _cancel_events.pop(req_id, None)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "X-Accel-Buffering": "no",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@app.post("/generate/cancel")
async def cancel_generation(request_id: str):
    cancel_event = _cancel_events.get(request_id)
    if cancel_event and not cancel_event.is_set():
        log.warning("[stream %s] explicit cancel received from client", request_id)
        cancel_event.set()
        return {"status": "cancelled"}
    elif cancel_event:
        return {"status": "already_cancelled"}
    else:
        return {"status": "not_found"}


@app.get("/status")
async def health():
    status = _build_config_status()
    return {
        "status": "ok" if status["ok"] else "degraded",
        "missing_required": status["missing_required"],
        "warnings": status["warnings"],
    }

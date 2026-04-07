from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from typing import Literal
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import asyncio, json, os, logging, queue, threading, time
from dotenv import load_dotenv
load_dotenv()
from ingestion.github_client import fetch_repo_data
from analytics.analyzer import run_analytics
from agent.director import build_script
from schemas import RepoData

log = logging.getLogger("gitflix")

# In-memory cache
_CACHE: dict = {}
_CACHE_TTL = 600

def _cache_get(key: tuple):
    entry = _CACHE.get(key)
    if entry and entry[1] > time.monotonic():
        return entry[0]
    return None

def _cache_set(key: tuple, value):
    _CACHE[key] = (value, time.monotonic() + _CACHE_TTL)

@asynccontextmanager
async def lifespan(app: FastAPI):
    missing = [k for k in ("GITHUB_TOKEN", "GROQ_API_KEY") if not os.getenv(k)]
    if missing:
        raise RuntimeError(f"Missing required env vars: {', '.join(missing)}")
    yield

app = FastAPI(title="GitFlix API", lifespan=lifespan)

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

class GenerateRequest(BaseModel):
    repo_url: str
    tone: Literal["epic", "documentary", "casual"] = "documentary"

@app.post("/generate")
async def generate(req: GenerateRequest):
    cache_key = (req.repo_url.strip().lower(), req.tone)
    cached = _cache_get(cache_key)
    if cached: return cached
    try:
        repo_data  = await asyncio.to_thread(fetch_repo_data, req.repo_url)
        analytics  = await asyncio.to_thread(run_analytics, repo_data)
        script     = await asyncio.to_thread(build_script, analytics, req.tone)
        _cache_set(cache_key, script)
        return script
    except Exception as e:
        log.error("[/generate] %s", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/generate/stream")
async def generate_stream(repo_url: str, tone: Literal["epic", "documentary", "casual"] = "documentary"):
    repo_url = repo_url.strip().lower()
    cache_key = (repo_url, tone)

    async def event_stream():
        try:
            cached = _cache_get(cache_key)
            if cached:
                yield f"data: {json.dumps({'stage': 'done', 'pct': 100, 'data': cached.model_dump()})}\n\n"
                return

            # Use a standard thread-safe queue for cross-thread communication
            q = queue.Queue()
            
            def progress_cb(pct, msg):
                q.put({"type": "progress", "pct": pct, "msg": msg})

            def worker():
                try:
                    data = fetch_repo_data(repo_url, on_progress=progress_cb)
                    q.put({"type": "result", "data": data})
                except Exception as e:
                    q.put({"type": "error", "msg": str(e)})

            # Start the background thread manually
            t = threading.Thread(target=worker, daemon=True)
            t.start()

            repo_data = None
            last_heartbeat = time.monotonic()

            # Poll the queue and yield progress until the result is ready
            while t.is_alive() or not q.empty():
                try:
                    # Non-blocking get
                    item = q.get_nowait()
                    if item["type"] == "progress":
                        yield f"data: {json.dumps({'stage': 'ingestion', 'pct': item['pct'], 'msg': item['msg']})}\n\n"
                    elif item["type"] == "result":
                        repo_data = item["data"]
                        break
                    elif item["type"] == "error":
                        raise Exception(item["msg"])
                except queue.Empty:
                    # Heartbeat to keep connection alive every 5 seconds
                    if time.monotonic() - last_heartbeat > 5:
                        yield f"data: {json.dumps({'stage': 'ingestion', 'pct': 15, 'msg': 'Processing...'})}\n\n"
                        last_heartbeat = time.monotonic()
                    await asyncio.sleep(0.2)

            if not repo_data:
                raise Exception("Ingestion failed to return data.")

            yield f"data: {json.dumps({'stage': 'analytics', 'pct': 40, 'msg': 'Analysing commit history…'})}\n\n"
            analytics = await asyncio.to_thread(run_analytics, repo_data)

            yield f"data: {json.dumps({'stage': 'agent', 'pct': 70, 'msg': 'Writing the cinematic script…'})}\n\n"
            script = await asyncio.to_thread(build_script, analytics, tone)

            _cache_set(cache_key, script)
            yield f"data: {json.dumps({'stage': 'done', 'pct': 100, 'data': script.model_dump()})}\n\n"

        except Exception as e:
            log.error("[stream] error: %s", e)
            yield f"data: {json.dumps({'stage': 'error', 'msg': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "X-Accel-Buffering": "no",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )

@app.get("/health")
async def health():
    return {"status": "ok"}

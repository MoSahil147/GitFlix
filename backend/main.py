from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from typing import Literal
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import asyncio, json, os, logging
from dotenv import load_dotenv
load_dotenv()
from ingestion.github_client import fetch_repo_data
from analytics.analyzer import run_analytics
from agent.director import build_script

log = logging.getLogger("gitflix")

# In-memory cache: key = (repo_url, tone), value = (result_dict, expiry_timestamp)
# TTL = 10 minutes — avoids re-hitting GitHub API for the same repo
_CACHE: dict = {}
_CACHE_TTL = 600  # seconds


def _cache_get(key: tuple):
    entry = _CACHE.get(key)
    if entry and entry[1] > asyncio.get_event_loop().time():
        return entry[0]
    return None


def _cache_set(key: tuple, value):
    import time
    _CACHE[key] = (value, time.monotonic() + _CACHE_TTL)



# App

@asynccontextmanager
async def lifespan(app: FastAPI):
    missing = [k for k in ("GITHUB_TOKEN", "GROQ_API_KEY") if not os.getenv(k)]
    if missing:
        raise RuntimeError(f"Missing required env vars: {', '.join(missing)}")
    yield


app = FastAPI(title="GitFlix API", lifespan=lifespan)

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000"  # dev fallback; set in prod env
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



# POST /generate — full pipeline, single response
@app.post("/generate")
async def generate(req: GenerateRequest):
    cache_key = (req.repo_url.strip().lower(), req.tone)
    cached = _cache_get(cache_key)
    if cached:
        log.info("[/generate] cache hit for %s", cache_key[0])
        return cached
    try:
        repo_data  = await asyncio.to_thread(fetch_repo_data, req.repo_url)
        analytics  = await asyncio.to_thread(run_analytics, repo_data)
        script     = await asyncio.to_thread(build_script, analytics, req.tone)
        _cache_set(cache_key, script)
        return script
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        log.error("[/generate] %s: %s", type(e).__name__, e)
        raise HTTPException(status_code=500, detail="Failed to generate script.")


# GET /generate/stream — streams SSE progress to the frontend
@app.get("/generate/stream")
async def generate_stream(repo_url: str, tone: Literal["epic", "documentary", "casual"] = "documentary"):
    repo_url = repo_url.strip().lower()
    cache_key = (repo_url, tone)

    async def event_stream():
        try:
            cached = _cache_get(cache_key)
            if cached:
                log.info("[/generate/stream] cache hit for %s", repo_url)
                yield f"data: {json.dumps({'stage': 'done', 'pct': 100, 'data': cached.model_dump()})}\n\n"
                return

            yield f"data: {json.dumps({'stage': 'ingestion', 'pct': 5,  'msg': 'Fetching repo data…'})}\n\n"
            repo_data = await asyncio.to_thread(fetch_repo_data, repo_url)

            yield f"data: {json.dumps({'stage': 'analytics', 'pct': 30, 'msg': 'Analysing commit history…'})}\n\n"
            analytics = await asyncio.to_thread(run_analytics, repo_data)

            yield f"data: {json.dumps({'stage': 'agent',     'pct': 55, 'msg': 'Writing the script…'})}\n\n"
            script = await asyncio.to_thread(build_script, analytics, tone)

            _cache_set(cache_key, script)
            yield f"data: {json.dumps({'stage': 'done', 'pct': 100, 'data': script.model_dump()})}\n\n"

        except ValueError as e:
            yield f"data: {json.dumps({'stage': 'error', 'msg': str(e)})}\n\n"
        except Exception as e:
            log.error("[/generate/stream] %s: %s", type(e).__name__, e)
            yield f"data: {json.dumps({'stage': 'error', 'msg': 'Failed to generate script.'})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache"},
    )


# GET /health
@app.get("/health")
async def health():
    return {"status": "ok"}

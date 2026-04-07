from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pydantic import BaseModel
import json, os, logging
from dotenv import load_dotenv
load_dotenv()
from ingestion.github_client import fetch_repo_data
from analytics.analyzer import run_analytics
from agent.director import build_script

log = logging.getLogger("gitflix")


# # Groq TTS helpers — disabled (voiceovers removed, subtitles only)
# _TONE_VOICE = {
#     "epic":         "daniel",
#     "documentary":  "diana",
#     "casual":       "autumn",
# }
#
# def _clean_narration(text: str) -> str:
#     import re
#     text = re.sub(r"^(here'?s?\s+[\w\s]*:|scene\s+\w+:|narration:|note:)[^\n]*\n?", "", text, flags=re.IGNORECASE)
#     text = re.sub(r'\b[\w.-]+/([\w.-]+)\b', lambda m: m.group(1).replace('-', ' ').replace('_', ' '), text)
#     text = re.sub(r'\b([a-z0-9]{2,})[-_]([a-z0-9])', lambda m: m.group(1) + ' ' + m.group(2), text, flags=re.IGNORECASE)
#     text = re.sub(r'\s{2,}', ' ', text).strip()
#     sentences = re.findall(r"[^.!?]+[.!?]+", text)
#     result = sentences[0].strip() if sentences else text.strip()
#     return result[:120].strip() or text[:120].strip()
#
# def _groq_tts(text: str, voice: str = "diana") -> str | None:
#     import base64
#     from groq import Groq
#     api_key = os.getenv("GROQ_API_KEY")
#     if not api_key:
#         return None
#     clean = _clean_narration(text)
#     if not clean:
#         return None
#     try:
#         client = Groq(api_key=api_key)
#         response = client.audio.speech.create(
#             model="canopylabs/orpheus-v1-english",
#             voice=voice, input=clean, response_format="wav",
#         )
#         audio_bytes = response.read()
#         b64 = base64.b64encode(audio_bytes).decode()
#         return f"data:audio/wav;base64,{b64}"
#     except Exception as e:
#         print(f"[Groq TTS error] {type(e).__name__}: {e}")
#         return None




# App

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    missing = [k for k in ("GITHUB_TOKEN", "GROQ_API_KEY") if not os.getenv(k)]
    if missing:
        raise RuntimeError(f"Missing required env vars: {', '.join(missing)}")
    yield


def _rate_limit_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Try again later."},
    )


app = FastAPI(title="GitFlix API", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_handler)

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
    tone: str = "documentary"


class TTSRequest(BaseModel):
    text: str
    voice_id: str = "pNInz6obpgDQGcFmaJgB"


# # POST /tts — disabled (voiceovers removed)
# @app.post("/tts")
# async def tts(req: TTSRequest):
#     audio_url = _groq_tts(req.text, voice="leah")
#     if not audio_url:
#         raise HTTPException(status_code=503, detail="Groq TTS not configured or request failed")
#     return {"audio_url": audio_url}


# POST /generate — full pipeline, single response
@app.post("/generate")
@limiter.limit("5/minute")
async def generate(req: GenerateRequest, request: Request):
    try:
        repo_data  = fetch_repo_data(req.repo_url)
        analytics  = run_analytics(repo_data)
        script     = build_script(analytics, req.tone)
        return script
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        log.error("[/generate] %s: %s", type(e).__name__, e)
        raise HTTPException(status_code=500, detail="Failed to generate script.")


# GET /generate/stream — streams SSE progress to the frontend
@app.get("/generate/stream")
@limiter.limit("5/minute")
async def generate_stream(request: Request, repo_url: str, tone: str = "documentary"):
    repo_url = repo_url.strip().lower()

    async def event_stream():
        try:
            yield f"data: {json.dumps({'stage': 'ingestion', 'pct': 5,  'msg': 'Fetching repo data…'})}\n\n"
            repo_data = fetch_repo_data(repo_url)

            yield f"data: {json.dumps({'stage': 'analytics', 'pct': 30, 'msg': 'Analysing commit history…'})}\n\n"
            analytics = run_analytics(repo_data)

            yield f"data: {json.dumps({'stage': 'agent',     'pct': 55, 'msg': 'Writing the script…'})}\n\n"
            script = build_script(analytics, tone)

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

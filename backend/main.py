from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json, os, base64
from ingestion.github_client import fetch_repo_data
from analytics.analyzer import run_analytics
from agent.director import build_script


# Groq TTS helpers

# voice per tone — Orpheus voices that match each mood
_TONE_VOICE = {
    "epic":         "leo",      # deep masculine narrator
    "documentary":  "leah",     # calm neutral narrator
    "casual":       "jessica",  # warm friendly voice
}

def _groq_tts(text: str, voice: str = "leah") -> str | None:
    """TTS for one scene narration via Groq Orpheus. Returns base64 WAV data URI or None."""
    from groq import Groq
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or not text.strip():
        return None
    try:
        client = Groq(api_key=api_key)
        response = client.audio.speech.create(
            model="canopylabs/orpheus-v1-english",
            voice=voice,
            input=text,
            response_format="wav",
        )
        b64 = base64.b64encode(response.read()).decode()
        return f"data:audio/wav;base64,{b64}"
    except Exception as e:
        print(f"[Groq TTS error] {e}")
        return None


def _add_audio(script, tone: str) -> None:
    """Mutate script in-place: generate TTS per scene via Groq."""
    voice = _TONE_VOICE.get(tone, "leah")
    for scene in script.scenes:
        scene.audio_url = _groq_tts(scene.narration_text, voice)


# App

app = FastAPI(title="GitFlix API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerateRequest(BaseModel):
    repo_url: str
    tone: str = "documentary"


class TTSRequest(BaseModel):
    text: str
    voice_id: str = "pNInz6obpgDQGcFmaJgB"


# POST /tts — generate a single TTS clip, useful for testing
@app.post("/tts")
async def tts(req: TTSRequest):
    audio_url = _groq_tts(req.text, voice="leah")
    if not audio_url:
        raise HTTPException(status_code=503, detail="Groq TTS not configured or request failed")
    return {"audio_url": audio_url}


# POST /generate — full pipeline, single response
@app.post("/generate")
async def generate(req: GenerateRequest):
    try:
        repo_data  = fetch_repo_data(req.repo_url)
        analytics  = run_analytics(repo_data)
        script     = build_script(analytics, req.tone)
        # _add_audio(script, req.tone)  # ElevenLabs disabled (free tier blocked on cloud IPs)
        return script
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# GET /generate/stream — streams SSE progress to the frontend
@app.get("/generate/stream")
async def generate_stream(repo_url: str, tone: str = "documentary"):
    repo_url = repo_url.strip().lower()

    async def event_stream():
        try:
            yield f"data: {json.dumps({'stage': 'ingestion', 'pct': 5,  'msg': 'Fetching repo data…'})}\n\n"
            repo_data = fetch_repo_data(repo_url)

            yield f"data: {json.dumps({'stage': 'analytics', 'pct': 30, 'msg': 'Analysing commit history…'})}\n\n"
            analytics = run_analytics(repo_data)

            yield f"data: {json.dumps({'stage': 'agent',     'pct': 55, 'msg': 'Writing the script…'})}\n\n"
            script = build_script(analytics, tone)

            yield f"data: {json.dumps({'stage': 'tts', 'pct': 75, 'msg': 'Recording voiceovers…'})}\n\n"
            _add_audio(script, tone)

            yield f"data: {json.dumps({'stage': 'done',      'pct': 100, 'data': script.model_dump()})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'stage': 'error', 'msg': str(e)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# GET /health
@app.get("/health")
async def health():
    return {"status": "ok"}

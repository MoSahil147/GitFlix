from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json, os, base64
from dotenv import load_dotenv
load_dotenv()
from ingestion.github_client import fetch_repo_data
from analytics.analyzer import run_analytics
from agent.director import build_script


# Groq TTS helpers

# voice per tone — valid Orpheus voices for canopylabs/orpheus-v1-english
_TONE_VOICE = {
    "epic":         "daniel",   # deep authoritative male
    "documentary":  "diana",    # calm neutral female
    "casual":       "autumn",   # warm friendly female
}

def _groq_tts(text: str, voice: str = "diana") -> str | None:
    """TTS for one scene narration via Groq Orpheus. Returns base64 WAV data URI or None."""
    from groq import Groq
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("[Groq TTS] GROQ_API_KEY not set — skipping TTS")
        return None
    if not text.strip():
        print("[Groq TTS] empty text — skipping")
        return None
    print(f"[Groq TTS] generating for voice={voice}, text={text[:60]!r}…")
    try:
        client = Groq(api_key=api_key)
        response = client.audio.speech.create(
            model="canopylabs/orpheus-v1-english",
            voice=voice,
            input=text,
            response_format="wav",
        )
        audio_bytes = response.read()
        print(f"[Groq TTS] got {len(audio_bytes)} bytes")
        b64 = base64.b64encode(audio_bytes).decode()
        return f"data:audio/wav;base64,{b64}"
    except Exception as e:
        print(f"[Groq TTS error] {type(e).__name__}: {e}")
        return None




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

            voice = _TONE_VOICE.get(tone, "leah")
            n = len(script.scenes)
            print(f"[TTS] starting — voice={voice}, key_set={bool(os.getenv('GROQ_API_KEY'))}", flush=True)
            for i, scene in enumerate(script.scenes):
                yield f"data: {json.dumps({'stage': 'tts', 'pct': 75 + int(i / n * 20), 'msg': f'Recording voiceover {i+1}/{n}…'})}\n\n"
                scene.audio_url = _groq_tts(scene.narration_text, voice)
                print(f"[TTS] scene {scene.scene_id}: {'OK' if scene.audio_url else 'FAILED'}", flush=True)

            audio_count = sum(1 for s in script.scenes if s.audio_url)
            print(f"[TTS] done — {audio_count}/{n} scenes have audio", flush=True)
            yield f"data: {json.dumps({'stage': 'done', 'pct': 100, 'data': script.model_dump()})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'stage': 'error', 'msg': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache"},
    )


# GET /health
@app.get("/health")
async def health():
    return {"status": "ok"}

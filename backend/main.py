from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json, os, base64
from ingestion.github_client import fetch_repo_data
from analytics.analyzer import run_analytics
from agent.director import build_script


# ElevenLabs helpers

def _get_eleven_client():
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        return None
    from elevenlabs import ElevenLabs
    return ElevenLabs(api_key=api_key)


def _tts(text: str) -> str | None:
    """TTS for one scene narration. Returns base64 data URI or None."""
    client = _get_eleven_client()
    if not client or not text.strip():
        return None
    try:
        audio_iter = client.text_to_speech.convert(
            voice_id="pNInz6obpgDQGcFmaJgB",   # Adam — deep cinematic narrator
            text=text,
            model_id="eleven_turbo_v2_5",
        )
        b64 = base64.b64encode(b"".join(audio_iter)).decode()
        return f"data:audio/mpeg;base64,{b64}"
    except Exception as e:
        print(f"[ElevenLabs TTS error] {e}")
        return None


# music prompt per tone
_MUSIC_PROMPTS = {
    "epic":         "Epic dramatic orchestral cinematic score, powerful brass and strings, building intensity",
    "documentary":  "Calm ambient documentary background music, soft piano and gentle strings, thoughtful and measured",
    "casual":       "Light upbeat friendly background music, modern acoustic guitar, warm and optimistic",
}

def _generate_music(tone: str) -> str | None:
    """Generate background music via ElevenLabs sound generation. Returns data URI or None."""
    client = _get_eleven_client()
    if not client:
        return None
    prompt = _MUSIC_PROMPTS.get(tone, _MUSIC_PROMPTS["documentary"])
    try:
        audio_iter = client.text_to_sound_effects.convert(
            text=prompt,
            duration_seconds=20.0,
            prompt_influence=0.4,
        )
        b64 = base64.b64encode(b"".join(audio_iter)).decode()
        return f"data:audio/mpeg;base64,{b64}"
    except Exception as e:
        print(f"[ElevenLabs music error] {e}")
        return None


def _add_audio(script, tone: str) -> None:
    """Mutate script in-place: generate TTS per scene + background music."""
    for scene in script.scenes:
        scene.audio_url = _tts(scene.narration_text)
    script.music_url = _generate_music(tone)


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
    audio_url = _tts(req.text)
    if not audio_url:
        raise HTTPException(status_code=503, detail="ElevenLabs not configured or request failed")
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

    async def event_stream():
        try:
            yield f"data: {json.dumps({'stage': 'ingestion', 'pct': 5,  'msg': 'Fetching repo data…'})}\n\n"
            repo_data = fetch_repo_data(repo_url)

            yield f"data: {json.dumps({'stage': 'analytics', 'pct': 30, 'msg': 'Analysing commit history…'})}\n\n"
            analytics = run_analytics(repo_data)

            yield f"data: {json.dumps({'stage': 'agent',     'pct': 55, 'msg': 'Writing the script…'})}\n\n"
            script = build_script(analytics, tone)

            # ElevenLabs audio disabled (free tier blocked on cloud IPs)
            # yield f"data: {json.dumps({'stage': 'tts',   'pct': 75, 'msg': 'Recording voiceovers…'})}\n\n"
            # for scene in script.scenes:
            #     scene.audio_url = _tts(scene.narration_text)
            # yield f"data: {json.dumps({'stage': 'music', 'pct': 90, 'msg': 'Composing background music…'})}\n\n"
            # script.music_url = _generate_music(tone)

            yield f"data: {json.dumps({'stage': 'done',      'pct': 100, 'data': script.model_dump()})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'stage': 'error', 'msg': str(e)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# GET /health
@app.get("/health")
async def health():
    return {"status": "ok"}

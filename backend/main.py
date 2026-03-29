from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json, os, base64
from ingestion.github_client import fetch_repo_data
from analytics.analyzer import run_analytics
from agent.director import build_script


def _tts(text: str) -> str | None:
    """Generate a voiceover for one scene via ElevenLabs.
    Returns a base64 data URI (data:audio/mpeg;base64,...) or None if unavailable."""
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key or not text.strip():
        return None
    try:
        from elevenlabs import ElevenLabs
        client = ElevenLabs(api_key=api_key)
        # Adam voice — deep cinematic narrator
        audio_iter = client.text_to_speech.convert(
            voice_id="pNInz6obpgDQGcFmaJgB",
            text=text,
            model_id="eleven_turbo_v2_5",
        )
        audio_bytes = b"".join(audio_iter)
        b64 = base64.b64encode(audio_bytes).decode()
        return f"data:audio/mpeg;base64,{b64}"
    except Exception:
        return None


def _add_voiceovers(script) -> None:
    """Mutate script in-place: generate TTS for each scene's narration."""
    for scene in script.scenes:
        scene.audio_url = _tts(scene.narration_text)

# creating the FastAPI app
app=FastAPI(title="GitFlix API")

# CORS middleware, allows the frontend (running on a different port) to talk to the backend
# without this the browser will block all requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # allowing any origin for now
    allow_methods=["*"],
    allow_headers=["*"]
)

# request body shape for the /generate endpoint
class GenerateRequest(BaseModel):
    repo_url: str
    tone: str = "documentary"   # default tone is documentary
    
# The 3 endpointss

# POST /generate
# runs the full pipeline and returns ScriptJSON in one go
@app.post("/generate")
async def generate(req: GenerateRequest):
    try:
        # step 1, fetch raw data from GitHub
        repo_data = fetch_repo_data(req.repo_url)

        # step 2, turn raw data into story fuel
        analytics = run_analytics(repo_data)

        # step 3, agent writes the script
        script = build_script(analytics, req.tone)

        return script
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# GET /generate/stream
# same pipeline but streams progress updates to the frontend using SSE
# SSE = Server Sent Events — the server pushes updates to the browser in real time
@app.get("/generate/stream")
async def generate_stream(repo_url: str, tone: str = "documentary"):

    async def event_stream():
        try:
            # send progress update: stage 1
            yield f"data: {json.dumps({'stage': 'ingestion', 'pct': 5, 'msg': 'Fetching repo data...'})}\n\n"
            repo_data = fetch_repo_data(repo_url)

            # send progress update: stage 2
            yield f"data: {json.dumps({'stage': 'analytics', 'pct': 35, 'msg': 'Analysing commit history...'})}\n\n"
            analytics = run_analytics(repo_data)

            # send progress update: stage 3
            yield f"data: {json.dumps({'stage': 'agent', 'pct': 60, 'msg': 'Writing the script...'})}\n\n"
            script = build_script(analytics, tone)

            # send progress update: stage 4 — voiceovers via ElevenLabs (skipped if no key)
            yield f"data: {json.dumps({'stage': 'tts', 'pct': 85, 'msg': 'Recording voiceovers...'})}\n\n"
            _add_voiceovers(script)

            # send final result: pct 100 means done
            yield f"data: {json.dumps({'stage': 'done', 'pct': 100, 'data': script.model_dump()})}\n\n"

        except Exception as e:
            # if anything fails, send error event so frontend can show error screen
            yield f"data: {json.dumps({'stage': 'error', 'msg': str(e)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

# GET /health
# simple check to confirm the backend is running
@app.get("/health")
async def health():
    return {"status": "ok"}
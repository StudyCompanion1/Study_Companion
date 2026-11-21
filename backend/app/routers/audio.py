"""Audio generation API endpoints."""

from io import BytesIO

from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool
from starlette.responses import StreamingResponse

from app.services.polly_service import synthesize_speech

router = APIRouter(prefix="/api", tags=["Audio"])

class SpeechRequest(BaseModel):
    text: str = Field(min_length=1, max_length=3000)

@router.post("/tts")
async def text_to_speech(request: SpeechRequest):
    """Generate speech from submitted text."""

    if not request.text.strip():
        raise HTTPException(
            status_code=400,
            detail="Text cannot be empty."
        )

    try:
        audio = await run_in_threadpool(
            synthesize_speech,
            request.text
        )

        return StreamingResponse(
            BytesIO(audio),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": 'inline; filename="speech.mp3"',
                "Cache-Control": "no-store",
            },
        )

    except (BotoCoreError, ClientError) as exc:
        raise HTTPException(
            status_code=502,
            detail="Amazon Polly could not generate the audio."
        ) from exc
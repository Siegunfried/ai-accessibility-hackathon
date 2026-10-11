"""后端 1（感知层）FastAPI 服务入口。"""
from __future__ import annotations

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from schemas import AudioEventsResult, OCRResult, SceneResult, TranscribeResult
from services import audio as audio_service, ocr, vision

app = FastAPI(title="感知层（后端 1）", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/vision/analyze", response_model=SceneResult)
async def analyze_vision(image: UploadFile = File(...)) -> SceneResult:
    data = await image.read()
    return vision.analyze_image(data)


@app.post("/api/audio/transcribe", response_model=TranscribeResult)
async def transcribe_audio(audio: UploadFile = File(...)) -> TranscribeResult:
    data = await audio.read()
    return audio_service.transcribe(data)


@app.post("/api/audio/events", response_model=AudioEventsResult)
async def audio_events(audio: UploadFile = File(...)) -> AudioEventsResult:
    data = await audio.read()
    return audio_service.classify_events(data)


@app.post("/api/ocr/read", response_model=OCRResult)
async def read_text(image: UploadFile = File(...)) -> OCRResult:
    data = await image.read()
    return ocr.read_text(data)
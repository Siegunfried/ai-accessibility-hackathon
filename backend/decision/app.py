"""后端 2（决策/编排层）FastAPI 服务入口。"""
from __future__ import annotations

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from schemas import Reminder
from services import decision
from services.perception_client import PerceptionClient

app = FastAPI(title="决策层（后端 2）", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_client = PerceptionClient()


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/decide", response_model=Reminder)
async def decide(
    image: UploadFile = File(...),
    audio: UploadFile | None = File(None),
) -> Reminder:
    img = await image.read()
    aud = await audio.read() if audio else None
    scene, events, intent = _client.perceive(img, aud)
    return decision.decide(scene, events, intent)
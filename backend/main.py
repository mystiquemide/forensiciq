import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from forensiciq.config import settings
from forensiciq.api.routes import router

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.add_log_level,
        structlog.dev.ConsoleRenderer(),
    ]
)

app = FastAPI(
    title="ForensIQ API",
    description="Confidence-calibrated autonomous DFIR agent — SANS Find Evil! 2026",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

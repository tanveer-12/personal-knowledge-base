import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database import Base, engine, verify_connection
from app.embeddings import embedding_service
from app.routers import notes, search

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()


def _allowed_origins() -> list[str]:
    raw = os.environ.get("ALLOWED_ORIGINS", "")
    if raw:
        return [o.strip() for o in raw.split(",") if o.strip()]
    return ["http://localhost:3000"]


@asynccontextmanager
async def lifespan(_app: FastAPI):
    verify_connection()
    logger.info("DB connected")
    Base.metadata.create_all(bind=engine)
    logger.info("Tables ready")
    embedding_service._load_model()  # warm up — eliminates cold-start latency on first POST
    logger.info("Embedding model loaded")
    logger.info("Startup complete — env=%s", settings.app_env)
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(notes.router)
app.include_router(search.router)


# Starlette's CORSMiddleware wraps the response `send` callable, but
# ServerErrorMiddleware (outermost) catches unhandled exceptions and sends the
# 500 using the *original* send — bypassing the CORS wrapper entirely.
# Fix: catch all exceptions here and manually attach the CORS header so the
# browser can actually read the error response.
@app.exception_handler(Exception)
async def _unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled exception: %s", exc, exc_info=True)
    origin = request.headers.get("origin", "")
    headers: dict[str, str] = {}
    if origin in _allowed_origins():
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Vary"] = "Origin"
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
        headers=headers,
    )


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": "all-MiniLM-L6-v2",
        "dims": 384,
        "env": settings.app_env,
    }
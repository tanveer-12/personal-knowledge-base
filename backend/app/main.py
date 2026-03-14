import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import Base, engine, verify_connection
from app.routers import notes, search

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    verify_connection()
    logger.info("DB connected")
    Base.metadata.create_all(bind=engine)
    logger.info("Tables ready")
    logger.info("Startup complete")
    logger.info(f"CORS allowed origins: {allowed_origins}")
    yield


app = FastAPI(lifespan=lifespan)

_raw_origins = os.environ.get("ALLOWED_ORIGINS", "")
allowed_origins = (
    [o.strip() for o in _raw_origins.split(",") if o.strip()]
    if _raw_origins
    else ["http://localhost:3000"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(notes.router)
app.include_router(search.router)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": "all-MiniLM-L6-v2",
        "dims": 384,
        "env": settings.app_env,
    }

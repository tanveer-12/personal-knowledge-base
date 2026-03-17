from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=3,      # Neon free tier: max 10 connections total
    max_overflow=2,   # at most 5 connections under burst load
    pool_timeout=10,  # fail fast rather than queue indefinitely
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_connection() -> str:
    with engine.connect() as conn:
        result = conn.execute(text("SELECT version()"))
        return result.scalar()[:60]

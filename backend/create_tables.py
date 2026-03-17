"""
recreate_tables.py
------------------
Drop and recreate all tables from models.py against your Neon database.

Usage (inside the pkb-backend container):
    python recreate_tables.py

WARNING: This drops all data. For dev/reset only.
For production schema changes, use Alembic migrations instead.
"""

import sys

from sqlalchemy import text

# ── 1. Import engine and Base from your app ──────────────────────────────────
from app.database import Base, engine

# ── 2. Import all models so SQLAlchemy registers them with Base.metadata ─────
#    If you add new models later, import them here too.
from app.models import Note, NoteChunk, NoteTag  # noqa: F401


def recreate_tables() -> None:
    with engine.connect() as conn:
        # ── 3. Ensure the vector extension exists ────────────────────────────
        #    pgvector must be installed on the Neon DB before Vector() columns
        #    can be created. This is idempotent — safe to run every time.
        print("Ensuring pgvector extension exists...")
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        conn.commit()
        print("  ✓ vector extension ready")

        # ── 4. Drop all known tables in dependency order ─────────────────────
        #    sorted(reverse=True) respects FK constraints by dropping child
        #    tables (note_chunks, note_tags) before parent (notes).
        print("\nDropping existing tables (if any)...")
        Base.metadata.drop_all(bind=engine)
        print("  ✓ Tables dropped")

        # ── 5. Recreate all tables from current models.py ────────────────────
        print("\nCreating tables from models.py...")
        Base.metadata.create_all(bind=engine)
        print("  ✓ Tables created")

        # ── 6. Verify ────────────────────────────────────────────────────────
        print("\nVerifying tables in database...")
        result = conn.execute(
            text("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                ORDER BY table_name;
            """)
        )
        tables = [row[0] for row in result]
        if tables:
            for t in tables:
                print(f"  ✓ {t}")
        else:
            print("  ✗ No tables found — something went wrong")
            sys.exit(1)

        # ── 7. Verify columns on notes table match models.py ─────────────────
        print("\nVerifying columns on 'notes' table...")
        result = conn.execute(
            text("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'notes'
                ORDER BY ordinal_position;
            """)
        )
        for col_name, col_type in result:
            print(f"  · {col_name:<20} {col_type}")

    print("\nDone. Your Neon schema now matches models.py.\n")


if __name__ == "__main__":
    recreate_tables()
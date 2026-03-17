"""
search_queries.py

Core pgvector similarity search.  Shared by routers/notes.py and
routers/search.py — neither router imports from the other.

Query strategy (two-stage ANN):
  Stage 1 — pull :candidate_pool nearest chunks using the HNSW index
             (ORDER BY embedding <=> query LIMIT k  →  planner uses index).
  Stage 2 — deduplicate to one chunk per note (DISTINCT ON), filter by
             threshold, join tags via LEFT JOIN (no correlated subquery).

This structure allows pgvector to use the HNSW index for stage 1.
A plain WHERE threshold + DISTINCT ON + ORDER BY note_id would force
a full sequential scan.
"""

from typing import List

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.schemas import ChunkSearchResult

# ---------------------------------------------------------------------------
# SQL template
# ---------------------------------------------------------------------------
# :query_vec      — pgvector wire format string  "[0.1,0.2,...]"
# :candidate_pool — ANN candidate count (stage-1 LIMIT); drives recall
# :threshold      — minimum cosine similarity to include a result
# :limit          — final result cap
# {extra_where}   — optional extra WHERE clause added to the deduped CTE
#                   (internal use only — never interpolate user input)
# ---------------------------------------------------------------------------

_CHUNK_SEARCH_SQL = """
WITH candidates AS (
    SELECT
        nc.note_id,
        nc.chunk_text                                          AS snippet,
        1 - (nc.embedding <=> CAST(:query_vec AS vector))     AS similarity_score,
        n.auto_title,
        n.summary
    FROM  note_chunks nc
    JOIN  notes n ON n.id = nc.note_id
    ORDER BY nc.embedding <=> CAST(:query_vec AS vector)
    LIMIT :candidate_pool
),
deduped AS (
    SELECT DISTINCT ON (note_id)
        note_id, snippet, similarity_score, auto_title, summary
    FROM  candidates
    WHERE similarity_score > :threshold
    {extra_where}
    ORDER BY note_id, similarity_score DESC
)
SELECT
    d.note_id,
    d.snippet,
    d.similarity_score,
    d.auto_title,
    d.summary,
    COALESCE(string_agg(t.tag, ',' ORDER BY t.id), '') AS tags_csv
FROM   deduped d
LEFT   JOIN note_tags t ON t.note_id = d.note_id
GROUP  BY d.note_id, d.snippet, d.similarity_score, d.auto_title, d.summary
ORDER  BY d.similarity_score DESC
LIMIT  :limit
"""


def _pgvec(v: list[float]) -> str:
    """Serialise a Python float list to pgvector's documented wire format."""
    return "[" + ",".join(f"{x:.8f}" for x in v) + "]"


def _parse_tags(tags_csv: str) -> list[str]:
    return [t.strip() for t in tags_csv.split(",") if t.strip()]


def _row_to_result(row) -> ChunkSearchResult:
    return ChunkSearchResult(
        note_id=row.note_id,
        auto_title=row.auto_title,
        summary=row.summary,
        snippet=row.snippet,
        similarity_score=row.similarity_score,
        tags=_parse_tags(row.tags_csv),
    )


def chunk_similarity_search(
    db: Session,
    query_vec: list[float],
    threshold: float,
    limit: int,
    extra_where: str = "",
    extra_params: dict | None = None,
) -> List[ChunkSearchResult]:
    """
    Return up to *limit* notes whose most similar chunk scores above
    *threshold* against *query_vec*.

    Args:
        db:           Active SQLAlchemy session.
        query_vec:    384-dim normalised float vector.
        threshold:    Minimum cosine similarity (0–1).
        limit:        Maximum result rows.
        extra_where:  Optional SQL fragment appended to the deduped CTE's
                      WHERE clause, e.g. "AND note_id != :exclude_note_id".
                      Must reference only columns available in that CTE
                      (note_id, similarity_score, auto_title, summary, snippet).
                      NEVER pass user-supplied strings here.
        extra_params: Bind parameters referenced by *extra_where*.

    Returns:
        List of ChunkSearchResult, sorted by similarity_score descending.
    """
    candidate_pool = max(limit * 10, 100)
    params: dict = {
        "query_vec": _pgvec(query_vec),
        "candidate_pool": candidate_pool,
        "threshold": threshold,
        "limit": limit,
    }
    if extra_params:
        params.update(extra_params)

    rows = db.execute(
        text(_CHUNK_SEARCH_SQL.format(extra_where=extra_where)), params
    ).fetchall()

    return [_row_to_result(row) for row in rows]

"""
tagging_service.py

Statistical keyword extraction via YAKE (Yet Another Keyword Extractor).
Requires: yake==0.4.8 (no neural model, ~5 MB RAM, no GPU needed).
Importable independently of FastAPI and SQLAlchemy.
"""

import yake

# Module-level YAKE instance — stateless across calls, safe to reuse.
# RAM cost: ~5 MB.  Configured for English unigrams to produce clean tags.
_extractor = yake.KeywordExtractor(
    lan="en",
    n=1,         # unigrams only — single-word tags
    dedupLim=0.9,
    top=10,      # extract up to 10 candidates; trimmed below
    features=None,
)


def extract_tags(raw_content: str, max_tags: int = 5) -> list[str]:
    """
    Extract keyword tags from *raw_content* using YAKE.

    YAKE returns (keyword, score) pairs where a **lower score = higher
    relevance**.  The results are sorted ascending before trimming.

    Args:
        raw_content: Full note body.
        max_tags:    Maximum number of tags to return.

    Returns:
        List of lowercase keyword strings, sorted by relevance (most
        relevant first), e.g. ["transformer", "attention", "training"].
    """
    keywords = _extractor.extract_keywords(raw_content)
    keywords.sort(key=lambda pair: pair[1])  # ascending score = most relevant first
    return [kw.lower().strip() for kw, _ in keywords[:max_tags]]

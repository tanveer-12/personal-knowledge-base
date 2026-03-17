import type { Note, ChunkSearchResult } from "@/types";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function RelevanceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const [bg, text] =
    score >= 0.65
      ? ["var(--match-high-bg)", "var(--match-high-text)"]
      : score >= 0.4
        ? ["var(--match-mid-bg)", "var(--match-mid-text)"]
        : ["var(--match-low-bg)", "var(--match-low-text)"];
  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-semibold shrink-0"
      style={{ backgroundColor: bg, color: text }}
    >
      {pct}%
    </span>
  );
}

// ── NoteCard ───────────────────────────────────────────────────────────────

interface NoteCardProps {
  note: Note;
  similarityScore?: number;
  compact?: boolean;
  onClick: () => void;
}

export default function NoteCard({
  note,
  similarityScore,
  compact = false,
  onClick,
}: NoteCardProps) {
  const displayDate = note.updated_at
    ? formatDate(note.updated_at)
    : formatDate(note.created_at);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left group transition-all"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: compact ? "0.625rem 0.75rem" : "1rem",
        boxShadow: "var(--shadow-sm)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hover)";
        (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-sm)";
      }}
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <h3
          className={`font-semibold leading-snug ${compact ? "text-xs" : "text-sm"} line-clamp-1`}
          style={{ color: "var(--text)" }}
        >
          {note.auto_title}
        </h3>
        {similarityScore !== undefined && (
          <RelevanceBadge score={similarityScore} />
        )}
      </div>

      {/* Summary */}
      {!compact && note.summary && (
        <p
          className="mt-1 text-xs leading-relaxed line-clamp-2"
          style={{ color: "var(--text-secondary)" }}
        >
          {note.summary}
        </p>
      )}

      {/* Tags */}
      {note.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {note.tags.slice(0, compact ? 2 : 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full px-1.5 py-0.5 text-xs"
              style={{
                backgroundColor: "var(--tag-bg)",
                color: "var(--tag-text)",
                border: "1px solid var(--tag-border)",
              }}
            >
              {tag}
            </span>
          ))}
          {note.tags.length > (compact ? 2 : 4) && (
            <span
              className="rounded-full px-1.5 py-0.5 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              +{note.tags.length - (compact ? 2 : 4)}
            </span>
          )}
        </div>
      )}

      {/* Footer: date */}
      <p
        className={`mt-2 ${compact ? "text-xs" : "text-xs"}`}
        style={{ color: "var(--text-muted)" }}
      >
        {displayDate}
      </p>
    </button>
  );
}

// ── SearchResultCard — wraps ChunkSearchResult with snippet ───────────────

interface SearchResultCardProps {
  result: ChunkSearchResult;
  onClick: () => void;
}

export function SearchResultCard({ result, onClick }: SearchResultCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left transition-all"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "1rem",
        boxShadow: "var(--shadow-sm)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hover)";
        (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-sm)";
      }}
    >
      {/* Title + score */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold line-clamp-1" style={{ color: "var(--text)" }}>
          {result.auto_title}
        </h3>
        <RelevanceBadge score={result.similarity_score} />
      </div>

      {/* Snippet */}
      {result.snippet && (
        <p
          className="mt-1 text-xs leading-relaxed line-clamp-2 font-mono"
          style={{ color: "var(--text-secondary)" }}
        >
          &ldquo;{result.snippet}&rdquo;
        </p>
      )}

      {/* Summary */}
      {result.summary && (
        <p
          className="mt-1 text-xs leading-relaxed line-clamp-1"
          style={{ color: "var(--text-muted)" }}
        >
          {result.summary}
        </p>
      )}

      {/* Tags */}
      {result.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {result.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full px-1.5 py-0.5 text-xs"
              style={{
                backgroundColor: "var(--tag-bg)",
                color: "var(--tag-text)",
                border: "1px solid var(--tag-border)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

"use client";

import type { ChunkSearchResult } from "@/types";

interface SmartHighlightPanelProps {
  query: string;
  results: ChunkSearchResult[];
  isSearching: boolean;
  onClear: () => void;
  onNoteClick: (result: ChunkSearchResult) => void;
}

function SkeletonCard() {
  return (
    <div
      className="animate-pulse"
      style={{
        height: "58px",
        borderRadius: "var(--radius-sm)",
        backgroundColor: "color-mix(in srgb, var(--accent) 6%, var(--surface-hover))",
      }}
    />
  );
}

export default function SmartHighlightPanel({
  query,
  results,
  isSearching,
  onClear,
  onNoteClick,
}: SmartHighlightPanelProps) {
  return (
    <div
      style={{
        borderTop: "1px solid var(--border)",
        paddingTop: "1rem",
        position: "relative",
      }}
    >
      {/* Vertical thread — visual "connection" from content above */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: "1rem",
          width: "1px",
          height: "12px",
          background: "linear-gradient(to bottom, var(--accent), transparent)",
          opacity: 0.5,
          transform: "translateY(-12px)",
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* Pulsing node */}
          <span
            className={isSearching ? "animate-pulse" : ""}
            style={{
              display: "inline-block",
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              backgroundColor: "var(--accent)",
              boxShadow: "0 0 8px var(--accent)",
              flexShrink: 0,
            }}
          />
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--accent)" }}
          >
            Connected Thoughts
          </span>
        </div>
        <button
          onClick={onClear}
          className="text-xs leading-none p-1"
          style={{ color: "var(--text-muted)" }}
          title="Clear highlight"
        >
          ✕
        </button>
      </div>

      {/* The highlighted phrase */}
      <p
        className="text-xs italic mb-3 px-2 py-1.5 line-clamp-2"
        style={{
          backgroundColor: "color-mix(in srgb, var(--accent) 7%, transparent)",
          border: "1px dashed color-mix(in srgb, var(--accent) 28%, transparent)",
          borderRadius: "var(--radius-sm)",
          color: "var(--text-secondary)",
        }}
      >
        &ldquo;{query}&rdquo;
      </p>

      {/* Loading skeletons */}
      {isSearching && (
        <div className="flex flex-col gap-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Results */}
      {!isSearching && results.length > 0 && (
        <div className="flex flex-col gap-2">
          {results.map((r) => (
            <button
              key={`${r.note_id}-${r.snippet.slice(0, 12)}`}
              type="button"
              onClick={() => onNoteClick(r)}
              className="w-full text-left transition-all"
              style={{
                padding: "0.625rem 0.75rem",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                borderLeft: "3px solid var(--accent)",
                boxShadow: "var(--shadow-sm)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hover)";
                (e.currentTarget as HTMLElement).style.borderLeftColor = "var(--accent)";
                (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLElement).style.borderLeftColor = "var(--accent)";
                (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-sm)";
              }}
            >
              {/* Title + score */}
              <div className="flex items-start justify-between gap-2 mb-1">
                <p
                  className="text-xs font-semibold line-clamp-1 leading-snug"
                  style={{ color: "var(--text)" }}
                >
                  {r.auto_title}
                </p>
                <span
                  className="text-xs shrink-0 tabular-nums px-1.5 py-0.5 rounded-full font-semibold"
                  style={{
                    backgroundColor:
                      r.similarity_score >= 0.6
                        ? "var(--match-high-bg)"
                        : r.similarity_score >= 0.4
                          ? "var(--match-mid-bg)"
                          : "var(--match-low-bg)",
                    color:
                      r.similarity_score >= 0.6
                        ? "var(--match-high-text)"
                        : r.similarity_score >= 0.4
                          ? "var(--match-mid-text)"
                          : "var(--match-low-text)",
                  }}
                >
                  {Math.round(r.similarity_score * 100)}%
                </span>
              </div>
              {/* Snippet */}
              {r.snippet && (
                <p
                  className="text-xs line-clamp-2 leading-relaxed"
                  style={{ color: "var(--text-muted)" }}
                >
                  {r.snippet}
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isSearching && results.length === 0 && (
        <p
          className="text-xs text-center py-2"
          style={{ color: "var(--text-muted)" }}
        >
          No connected notes found for this phrase.
        </p>
      )}
    </div>
  );
}

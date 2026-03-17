"use client";

import { useMemo } from "react";
import type { Note } from "@/types";

interface TagCloudModalProps {
  notes: Note[];
  activeTag: string | null;
  onTagClick: (tag: string | null) => void;
  onClose: () => void;
}

function getTagData(notes: Note[]): { tag: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const note of notes) {
    for (const tag of note.tags) counts[tag] = (counts[tag] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

const TAG_COLORS = [
  { bg: "rgba(124, 58, 237, 0.12)", border: "rgba(124, 58, 237, 0.4)", text: "#a78bfa", glow: "rgba(124, 58, 237, 0.5)" },
  { bg: "rgba(0, 245, 212, 0.08)", border: "rgba(0, 245, 212, 0.35)", text: "#00f5d4", glow: "rgba(0, 245, 212, 0.4)" },
  { bg: "rgba(236, 72, 153, 0.08)", border: "rgba(236, 72, 153, 0.35)", text: "#f472b6", glow: "rgba(236, 72, 153, 0.4)" },
  { bg: "rgba(59, 130, 246, 0.1)", border: "rgba(59, 130, 246, 0.4)", text: "#60a5fa", glow: "rgba(59, 130, 246, 0.5)" },
  { bg: "rgba(34, 197, 94, 0.08)", border: "rgba(34, 197, 94, 0.35)", text: "#4ade80", glow: "rgba(34, 197, 94, 0.4)" },
  { bg: "rgba(251, 146, 60, 0.1)", border: "rgba(251, 146, 60, 0.35)", text: "#fb923c", glow: "rgba(251, 146, 60, 0.4)" },
  { bg: "rgba(244, 63, 94, 0.08)", border: "rgba(244, 63, 94, 0.35)", text: "#fb7185", glow: "rgba(244, 63, 94, 0.4)" },
  { bg: "rgba(250, 204, 21, 0.08)", border: "rgba(250, 204, 21, 0.35)", text: "#fbbf24", glow: "rgba(250, 204, 21, 0.4)" },
];

export default function TagCloudModal({ notes, activeTag, onTagClick, onClose }: TagCloudModalProps) {
  const tags = useMemo(() => getTagData(notes), [notes]);
  const maxCount = tags[0]?.count ?? 1;

  if (tags.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "var(--modal-overlay)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl mx-4 p-8"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
              Tag Universe
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {tags.length} tag{tags.length !== 1 ? "s" : ""} across {notes.length} note{notes.length !== 1 ? "s" : ""} — click any tag to filter
            </p>
          </div>
          <button onClick={onClose} className="p-1" style={{ color: "var(--text-muted)" }}>
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* Active filter chip */}
        {activeTag && (
          <button
            onClick={() => { onTagClick(null); onClose(); }}
            className="mb-5 flex items-center gap-1.5 text-xs px-3 py-1.5"
            style={{
              color: "var(--accent)",
              border: "1px solid var(--border-hover)",
              borderRadius: "9999px",
              backgroundColor: "var(--tag-bg)",
            }}
          >
            Showing: #{activeTag}
            <span style={{ opacity: 0.6 }}>✕ clear</span>
          </button>
        )}

        {/* Tag cloud */}
        <div className="flex flex-wrap gap-3 justify-center py-4">
          {tags.map(({ tag, count }, i) => {
            const ratio = count / maxCount;
            // Font size: 0.75rem (small) → 1.5rem (most frequent)
            const fontSize = 0.75 + ratio * 0.75;
            const color = TAG_COLORS[i % TAG_COLORS.length];
            const isActive = activeTag === tag;
            const floatDelay = `${(i * 0.4) % 3}s`;

            return (
              <button
                key={tag}
                onClick={() => { onTagClick(isActive ? null : tag); onClose(); }}
                className="tag-bubble transition-all"
                style={{
                  fontSize: `${fontSize}rem`,
                  padding: `0.3em 0.65em`,
                  borderRadius: "9999px",
                  backgroundColor: isActive ? color.border : color.bg,
                  border: `1px solid ${isActive ? color.glow : color.border}`,
                  color: isActive ? "var(--surface)" : color.text,
                  fontWeight: ratio > 0.5 ? 600 : 400,
                  boxShadow: isActive ? `0 0 16px ${color.glow}` : "none",
                  animationDelay: floatDelay,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 0 14px ${color.glow}`;
                    (e.currentTarget as HTMLElement).style.transform = "scale(1.08) translateY(-2px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                    (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                  }
                }}
              >
                #{tag}
                <span
                  style={{
                    marginLeft: "0.35em",
                    fontSize: "0.65em",
                    opacity: 0.55,
                    fontWeight: 400,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

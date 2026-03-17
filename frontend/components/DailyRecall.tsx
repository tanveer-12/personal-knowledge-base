"use client";

import type { Note } from "@/types";
import NoteCard from "@/components/NoteCard";

interface DailyRecallProps {
  notes: Note[];
  onNoteClick: (note: Note) => void;
}

const RECALL_AFTER_DAYS = 3;

/** Shuffle deterministically by today's date so the selection changes daily */
function pickRecallNotes(notes: Note[], max = 4): Note[] {
  const cutoff = Date.now() - RECALL_AFTER_DAYS * 86400000;
  const old = notes.filter((n) => new Date(n.created_at).getTime() < cutoff);
  if (old.length === 0) return [];

  // Stable daily shuffle — seed by date string
  const seed = new Date().toDateString();
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;

  const shuffled = [...old].sort((a, b) => {
    const ha = ((hash ^ a.id) * 2654435761) >>> 0;
    const hb = ((hash ^ b.id) * 2654435761) >>> 0;
    return ha - hb;
  });

  return shuffled.slice(0, max);
}

export default function DailyRecall({ notes, onNoteClick }: DailyRecallProps) {
  const recallNotes = pickRecallNotes(notes);

  if (recallNotes.length === 0) return null;

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <section
      className="rounded-[var(--radius-lg)] p-4 mb-6"
      style={{
        backgroundColor: "var(--recall-bg)",
        border: "1px solid var(--recall-border)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4"
            viewBox="0 0 20 20"
            fill="currentColor"
            style={{ color: "var(--recall-heading)" }}
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--recall-heading)" }}
            >
              Daily Recall
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {today}
            </p>
          </div>
        </div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {recallNotes.length} note{recallNotes.length !== 1 ? "s" : ""} to revisit
        </p>
      </div>

      {/* Horizontal scroll on small screens, grid on wider */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {recallNotes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            onClick={() => onNoteClick(note)}
          />
        ))}
      </div>
    </section>
  );
}

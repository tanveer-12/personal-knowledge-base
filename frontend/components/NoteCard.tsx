import type { Note } from "@/types";

interface NoteCardProps {
  note: Note;
  similarityScore?: number;
  onClick: () => void;
}

function similarityBadge(score: number) {
  const label = `${Math.round(score * 100)}% match`;
  if (score >= 0.7) {
    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
        {label}
      </span>
    );
  }
  if (score >= 0.4) {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
        {label}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
      {label}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function NoteCard({ note, similarityScore, onClick }: NoteCardProps) {
  const tags = note.tags
    ? note.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-200"
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900 leading-snug">
          {note.title}
        </h3>
        {similarityScore !== undefined && similarityBadge(similarityScore)}
      </div>

      {/* Body */}
      <p className="mt-1.5 text-sm text-gray-600 line-clamp-3">{note.body}</p>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Date */}
      <p className="mt-3 text-xs text-gray-400">{formatDate(note.created_at)}</p>
    </button>
  );
}

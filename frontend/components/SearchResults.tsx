import type { Note, SearchResponse } from "@/types";
import NoteCard from "./NoteCard";

interface SearchResultsProps {
  response: SearchResponse;
  onNoteClick: (note: Note) => void;
}

export default function SearchResults({ response, onNoteClick }: SearchResultsProps) {
  return (
    <div>
      <p className="mb-3 text-sm text-gray-500">
        <span className="font-medium text-gray-800">{response.total} result{response.total !== 1 ? "s" : ""}</span>
        {" "}for &ldquo;{response.query}&rdquo;
      </p>

      {response.total === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          No notes found. Try different wording &mdash; semantic search understands meaning, not just keywords.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {response.results.map(({ note, similarity_score }) => (
            <NoteCard
              key={note.id}
              note={note}
              similarityScore={similarity_score}
              onClick={() => onNoteClick(note)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

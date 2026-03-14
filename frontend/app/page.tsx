"use client";

import { useCallback, useEffect, useState } from "react";
import type { Note, SearchResponse } from "@/types";
import { deleteNote, getNotes, getRelatedNotes, searchNotes } from "@/lib/api";
import SearchBar from "@/components/SearchBar";
import NoteCard from "@/components/NoteCard";
import NoteEditor from "@/components/NoteEditor";
import SearchResults from "@/components/SearchResults";

export default function HomePage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [relatedNotes, setRelatedNotes] = useState<Note[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    getNotes(20).then(setNotes).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedNote) {
      setRelatedNotes([]);
      setEditingNote(null);
      return;
    }
    getRelatedNotes(selectedNote.id, 4)
      .then((results) => setRelatedNotes(results.map((r) => r.note)))
      .catch(console.error);
  }, [selectedNote]);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResponse(null);
      return;
    }
    setIsSearching(true);
    try {
      const response = await searchNotes(query);
      setSearchResponse(response);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  function handleNoteCreated(note: Note) {
    setNotes((prev) => [note, ...prev]);
    setShowEditor(false);
  }

  function handleNoteUpdated(note: Note) {
    setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
    setSelectedNote(note);
    setEditingNote(null);
  }

  async function handleDeleteSelected() {
    if (!selectedNote) return;
    if (!window.confirm("Delete this note? This cannot be undone.")) return;
    setIsDeleting(true);
    try {
      await deleteNote(selectedNote.id);
      setNotes((prev) => prev.filter((n) => n.id !== selectedNote.id));
      setSelectedNote(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧠</span>
            <span className="text-lg font-semibold text-gray-900">Knowledge Base</span>
          </div>
          <button
            onClick={() => { setShowEditor(true); setSelectedNote(null); }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition"
          >
            + New note
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* New note editor */}
        {showEditor && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-800">New note</h2>
            <NoteEditor
              onSuccess={handleNoteCreated}
              onCancel={() => setShowEditor(false)}
            />
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <SearchBar onSearch={handleSearch} isLoading={isSearching} />
        </div>

        <div className={`flex gap-6 ${selectedNote ? "flex-col lg:flex-row" : ""}`}>
          {/* Left column: search results or notes grid */}
          <div className="min-w-0 flex-1">
            {searchResponse !== null ? (
              <div>
                <div className="mb-3 flex items-center justify-end">
                  <button
                    onClick={() => setSearchResponse(null)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    ✕ Clear search
                  </button>
                </div>
                <SearchResults
                  response={searchResponse}
                  onNoteClick={(note) => { setSelectedNote(note); setEditingNote(null); }}
                />
              </div>
            ) : (
              <>
                {notes.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center">
                    <p className="text-sm text-gray-500">No notes yet. Create your first one above.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                    {notes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        onClick={() => { setSelectedNote(note); setEditingNote(null); }}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right panel: selected note */}
          {selectedNote && (
            <aside className="w-full shrink-0 lg:w-96">
              <div className="sticky top-20 rounded-xl border border-gray-200 bg-white shadow-md">
                {/* Panel header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Note</span>
                  <button
                    onClick={() => setSelectedNote(null)}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label="Close"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 8.586L6.707 5.293a1 1 0 00-1.414 1.414L8.586 10l-3.293 3.293a1 1 0 001.414 1.414L10 11.414l3.293 3.293a1 1 0 001.414-1.414L11.414 10l3.293-3.293a1 1 0 00-1.414-1.414L10 8.586z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>

                <div className="p-5">
                  {editingNote ? (
                    <NoteEditor
                      initialNote={editingNote}
                      onSuccess={handleNoteUpdated}
                      onCancel={() => setEditingNote(null)}
                    />
                  ) : (
                    <>
                      <h2 className="text-base font-semibold text-gray-900">{selectedNote.title}</h2>
                      <p className="mt-2 text-sm leading-relaxed text-gray-600 whitespace-pre-wrap">{selectedNote.body}</p>

                      {selectedNote.tags && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {selectedNote.tags.split(",").map((t) => t.trim()).filter(Boolean).map((tag) => (
                            <span key={tag} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="mt-3 text-xs text-gray-400">
                        {new Date(selectedNote.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                      </p>

                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => setEditingNote(selectedNote)}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={handleDeleteSelected}
                          disabled={isDeleting}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 transition"
                        >
                          {isDeleting ? "Deleting…" : "Delete"}
                        </button>
                      </div>

                      {relatedNotes.length > 0 && (
                        <div className="mt-6 border-t border-gray-100 pt-4">
                          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Related</p>
                          <div className="flex flex-col gap-2">
                            {relatedNotes.map((n) => (
                              <NoteCard
                                key={n.id}
                                note={n}
                                onClick={() => { setSelectedNote(n); setEditingNote(null); }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}

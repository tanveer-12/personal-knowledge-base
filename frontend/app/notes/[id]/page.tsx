"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import type { Note, SearchResult } from "@/types";
import { deleteNote, getNote, getRelatedNotes } from "@/lib/api";
import NoteCard from "@/components/NoteCard";
import NoteEditor from "@/components/NoteEditor";

export default function NoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [note, setNote] = useState<Note | null>(null);
  const [related, setRelated] = useState<SearchResult[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    getNote(id)
      .then((n) => {
        setNote(n);
        return getRelatedNotes(id, 4);
      })
      .then(setRelated)
      .catch(() => setNotFound(true));
  }, [id]);

  async function handleDelete() {
    if (!note) return;
    if (!window.confirm("Delete this note? This cannot be undone.")) return;
    setIsDeleting(true);
    try {
      await deleteNote(note.id);
      router.push("/");
    } catch (err) {
      console.error(err);
      setIsDeleting(false);
    }
  }

  function handleUpdated(updated: Note) {
    setNote(updated);
    setIsEditing(false);
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 text-center">
        <p className="text-2xl font-semibold text-gray-700">Note not found</p>
        <p className="text-sm text-gray-500">It may have been deleted or never existed.</p>
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Back to home
        </Link>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <svg className="h-6 w-6 animate-spin text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          <span className="text-xl">🧠</span>
          <span className="text-lg font-semibold text-gray-900">Knowledge Base</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to notes
        </Link>

        {/* Main note card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {isEditing ? (
            <>
              <h2 className="mb-4 text-base font-semibold text-gray-800">Edit note</h2>
              <NoteEditor
                initialNote={note}
                onSuccess={handleUpdated}
                onCancel={() => setIsEditing(false)}
              />
            </>
          ) : (
            <>
              <div className="mb-4 flex items-start justify-between gap-4">
                <h1 className="text-2xl font-semibold leading-snug text-gray-900">{note.title}</h1>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 transition"
                  >
                    {isDeleting ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">{note.body}</p>

              {note.tags && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {note.tags.split(",").map((t) => t.trim()).filter(Boolean).map((tag) => (
                    <span key={tag} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <p className="mt-5 text-xs text-gray-400">
                Created{" "}
                {new Date(note.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
                {note.updated_at && note.updated_at !== note.created_at && (
                  <> · Updated {new Date(note.updated_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</>
                )}
              </p>
            </>
          )}
        </div>

        {/* Related notes */}
        {related.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-400">Related notes</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {related.map(({ note: rel }) => (
                <NoteCard
                  key={rel.id}
                  note={rel}
                  onClick={() => router.push(`/notes/${rel.id}`)}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

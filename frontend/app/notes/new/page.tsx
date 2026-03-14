"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Note } from "@/types";
import NoteEditor from "@/components/NoteEditor";

export default function NewNotePage() {
  const router = useRouter();

  function handleSuccess(_note: Note) {
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
          <span className="text-xl">🧠</span>
          <span className="text-lg font-semibold text-gray-900">Knowledge Base</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to notes
        </Link>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="mb-6 text-xl font-semibold text-gray-900">New note</h1>
          <NoteEditor onSuccess={handleSuccess} onCancel={() => router.push("/")} />
        </div>
      </main>
    </div>
  );
}

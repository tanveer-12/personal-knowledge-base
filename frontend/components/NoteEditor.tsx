"use client";

import { useRef, useState } from "react";
import { createNote, updateNoteTitle, updateNoteContent } from "@/lib/api";
import type { Note, NoteIngestionResponse } from "@/types";

// ── Shared input styles ────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%",
  backgroundColor: "var(--input-bg)",
  color: "var(--text)",
  border: "1px solid var(--input-border)",
  borderRadius: "var(--radius-sm)",
  padding: "0.625rem 0.75rem",
  fontSize: "0.875rem",
  outline: "none",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
};

// ── Create Mode — body-only, backend handles the rest ────────────────────

interface CreateEditorProps {
  onSuccess: (note: Note | NoteIngestionResponse) => void;
  onCancel: () => void;
  autoFocus?: boolean;
}

export function CreateNoteEditor({ onSuccess, onCancel, autoFocus = true }: CreateEditorProps) {
  const [body, setBody] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit(e?: { preventDefault?: () => void }) {
    e?.preventDefault?.();
    if (!body.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const note = await createNote({ body: body.trim() });
      onSuccess(note);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      void handleSubmit();
    }
    if (e.key === "Escape") onCancel();
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }} className="flex flex-col gap-3">
      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Paste or write anything — title, tags, and summary are extracted automatically."
        rows={6}
        autoFocus={autoFocus}
        required
        style={inputStyle}
        onFocus={(e) => {
          e.target.style.borderColor = "var(--input-focus-ring)";
          e.target.style.boxShadow = `0 0 0 3px color-mix(in srgb, var(--input-focus-ring) 15%, transparent)`;
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "var(--input-border)";
          e.target.style.boxShadow = "none";
        }}
      />

      {error && (
        <p className="text-xs" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-3 py-1.5 text-xs font-medium transition-colors"
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-secondary)",
            backgroundColor: "transparent",
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading || !body.trim()}
          className="px-4 py-1.5 text-xs font-semibold transition-opacity disabled:opacity-50"
          style={{
            backgroundColor: "var(--accent)",
            color: "var(--accent-fg)",
            borderRadius: "var(--radius-sm)",
            border: "none",
          }}
        >
          {isLoading ? "Saving…" : "Save note"}
        </button>
      </div>
    </form>
  );
}

// ── Edit Mode — title-only, V2 backend only allows title updates ──────────

interface EditEditorProps {
  note: Note;
  onSuccess: (note: Note) => void;
  onCancel: () => void;
}

// ── Content edit mode — replaces raw_content, re-ingests summary/tags/chunks ──

interface EditContentEditorProps {
  note: Note;
  onSuccess: (note: Note) => void;
  onCancel: () => void;
}

export function EditNoteContentEditor({ note, onSuccess, onCancel }: EditContentEditorProps) {
  const [body, setBody] = useState(note.raw_content);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e?: { preventDefault?: () => void }) {
    e?.preventDefault?.();
    if (!body.trim() || body.trim() === note.raw_content) {
      onCancel();
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const updated = await updateNoteContent(note.id, body.trim());
      onSuccess(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") void handleSubmit();
    if (e.key === "Escape") onCancel();
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }} className="flex flex-col gap-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
        rows={10}
        style={{ ...inputStyle, resize: "vertical" }}
        onFocus={(e) => {
          e.target.style.borderColor = "var(--input-focus-ring)";
          e.target.style.boxShadow = `0 0 0 3px color-mix(in srgb, var(--input-focus-ring) 15%, transparent)`;
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "var(--input-border)";
          e.target.style.boxShadow = "none";
        }}
      />

      {/* Warning: re-ingestion side-effects */}
      <p className="text-xs px-1" style={{ color: "var(--text-muted)" }}>
        Saving will regenerate summary, tags, and semantic index. Your title is preserved.
      </p>

      {error && <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-3 py-1 text-xs transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading || !body.trim()}
          className="px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          style={{
            backgroundColor: "var(--accent)",
            color: "var(--accent-fg)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {isLoading ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

// ── Title edit mode ───────────────────────────────────────────────────────

export function EditNoteTitleEditor({ note, onSuccess, onCancel }: EditEditorProps) {
  const [title, setTitle] = useState(note.auto_title);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e?: { preventDefault?: () => void }) {
    e?.preventDefault?.();
    if (!title.trim() || title.trim() === note.auto_title) {
      onCancel();
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const updated = await updateNoteTitle(note.id, title.trim());
      onSuccess(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") void handleSubmit();
    if (e.key === "Escape") onCancel();
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }} className="flex flex-col gap-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
        required
        style={inputStyle}
        onFocus={(e) => {
          e.target.style.borderColor = "var(--input-focus-ring)";
          e.target.style.boxShadow = `0 0 0 3px color-mix(in srgb, var(--input-focus-ring) 15%, transparent)`;
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "var(--input-border)";
          e.target.style.boxShadow = "none";
        }}
      />
      {error && <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 text-xs transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-3 py-1 text-xs font-medium disabled:opacity-50"
          style={{
            backgroundColor: "var(--accent)",
            color: "var(--accent-fg)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {isLoading ? "Saving…" : "Rename"}
        </button>
      </div>
    </form>
  );
}

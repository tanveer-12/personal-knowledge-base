"use client";

import { useEffect, useRef, useState } from "react";
import { createNote } from "@/lib/api";
import type { NoteIngestionResponse } from "@/types";

interface QuickCaptureModalProps {
  onSuccess: (note: NoteIngestionResponse) => void;
  onClose: () => void;
}

export default function QuickCaptureModal({ onSuccess, onClose }: QuickCaptureModalProps) {
  const [body, setBody] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea on open
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleSubmit() {
    if (!body.trim() || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const note = await createNote({ body: body.trim() });
      setSaved(true);
      onSuccess(note);
      // Brief success flash, then close
      setTimeout(onClose, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      void handleSubmit();
    }
  }

  const charCount = body.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "var(--modal-overlay)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-xl flex flex-col"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" style={{ color: "var(--accent)" }}>
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              Quick Capture
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 transition-colors"
            style={{ color: "var(--text-muted)", borderRadius: "var(--radius-sm)" }}
            aria-label="Close"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {saved ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "var(--match-high-bg)" }}
              >
                <svg className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor" style={{ color: "var(--match-high-text)" }}>
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm font-medium" style={{ color: "var(--text)" }}>Saved!</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Title and tags extracted automatically.
              </p>
            </div>
          ) : (
            <>
              <p className="mb-3 text-xs" style={{ color: "var(--text-muted)" }}>
                Paste or write anything — we&apos;ll extract the title, summary, and tags.
              </p>
              <textarea
                ref={textareaRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What's on your mind?"
                rows={8}
                className="w-full resize-none text-sm leading-relaxed"
                style={{
                  backgroundColor: "var(--input-bg)",
                  color: "var(--text)",
                  border: "1px solid var(--input-border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "0.75rem",
                  outline: "none",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
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
                <p className="mt-2 text-xs" style={{ color: "#dc2626" }}>{error}</p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!saved && (
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {charCount > 0 && <span>{charCount} chars<span className="mx-1.5" style={{ opacity: 0.4 }}>·</span></span>}
          Ctrl+Enter to save
          <span className="mx-1.5" style={{ opacity: 0.4 }}>·</span>
          Esc to close
            </span>
            <button
              onClick={() => void handleSubmit()}
              disabled={isLoading || !body.trim()}
              className="px-4 py-1.5 text-sm font-semibold transition-opacity disabled:opacity-40"
              style={{
                backgroundColor: "var(--fab-bg)",
                color: "var(--fab-fg)",
                borderRadius: "var(--radius-sm)",
                border: "none",
              }}
            >
              {isLoading ? "Saving…" : "Capture"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Floating Action Button ─────────────────────────────────────────────────

interface FabProps {
  onClick: () => void;
}

export function CaptureButton({ onClick }: FabProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 text-sm font-semibold shadow-lg transition-all hover:scale-105 active:scale-95"
      style={{
        backgroundColor: "var(--fab-bg)",
        color: "var(--fab-fg)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--fab-shadow)",
        border: "none",
      }}
      title="Quick capture (⌘K)"
      aria-label="Quick capture"
    >
      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
      </svg>
      <span className="hidden sm:inline">Capture</span>
      <kbd
        className="hidden sm:inline px-1.5 py-0.5 text-xs rounded opacity-60"
        style={{
          backgroundColor: "color-mix(in srgb, var(--fab-fg) 15%, transparent)",
          fontFamily: "var(--font-geist-mono), monospace",
        }}
      >
        Ctrl+K
      </kbd>
    </button>
  );
}

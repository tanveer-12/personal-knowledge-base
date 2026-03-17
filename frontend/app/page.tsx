"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Note, ChunkSearchResult, SearchResponse, NoteIngestionResponse } from "@/types";
import { deleteNote, getNotes, getNote, getRelatedNotes, searchNotes } from "@/lib/api";

import NoteCard, { SearchResultCard } from "@/components/NoteCard";
import { EditNoteTitleEditor, EditNoteContentEditor } from "@/components/NoteEditor";
import SearchBar from "@/components/SearchBar";
import ThemeSelector from "@/components/ThemeSelector";
import Sidebar from "@/components/Sidebar";
import DailyRecall from "@/components/DailyRecall";
import QuickCaptureModal, { CaptureButton } from "@/components/QuickCaptureModal";
import TagCloudModal from "@/components/TagCloudModal";
import SmartHighlightPanel from "@/components/SmartHighlightPanel";
import { useSmartHighlight } from "@/hooks/useSmartHighlight";
import { useTheme } from "@/contexts/ThemeContext";

// ── Constants ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

// ── Helpers ────────────────────────────────────────────────────────────────

function formatFullDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ── Note list row (for list view) ─────────────────────────────────────────

function NoteListRow({
  note,
  similarityScore,
  onClick,
}: {
  note: Note;
  similarityScore?: number;
  onClick: () => void;
}) {
  const dateStr = new Date(note.updated_at ?? note.created_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex items-start gap-3 px-4 py-3 transition-colors"
      style={{
        backgroundColor: "var(--surface)",
        borderBottom: "1px solid var(--border)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = "var(--surface-hover)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = "var(--surface)";
      }}
    >
      {/* Note icon */}
      <svg
        className="w-4 h-4 mt-0.5 shrink-0"
        viewBox="0 0 20 20"
        fill="currentColor"
        style={{ color: "var(--text-muted)" }}
      >
        <path fillRule="evenodd" d="M4 3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H4Zm0 2h12v7H4V5Zm0 9v-1h12v1H4Z" clipRule="evenodd" />
      </svg>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
            {note.auto_title}
          </span>
          {similarityScore !== undefined && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full shrink-0"
              style={{
                backgroundColor:
                  similarityScore >= 0.65
                    ? "var(--match-high-bg)"
                    : similarityScore >= 0.4
                      ? "var(--match-mid-bg)"
                      : "var(--match-low-bg)",
                color:
                  similarityScore >= 0.65
                    ? "var(--match-high-text)"
                    : similarityScore >= 0.4
                      ? "var(--match-mid-text)"
                      : "var(--match-low-text)",
              }}
            >
              {Math.round(similarityScore * 100)}%
            </span>
          )}
        </div>
        {note.summary && (
          <p
            className="text-xs mt-0.5 line-clamp-1"
            style={{ color: "var(--text-secondary)" }}
          >
            {note.summary}
          </p>
        )}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          {note.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full px-1.5 py-0.5 text-xs"
              style={{
                backgroundColor: "var(--tag-bg)",
                color: "var(--tag-text)",
                border: "1px solid var(--tag-border)",
              }}
            >
              {tag}
            </span>
          ))}
          {note.tags.length > 4 && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              +{note.tags.length - 4}
            </span>
          )}
          <span className="ml-auto text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
            {dateStr}
          </span>
        </div>
      </div>
    </button>
  );
}

// ── Pagination controls ────────────────────────────────────────────────────

function Pagination({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3 pt-4 pb-2">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          color: "var(--text-secondary)",
          backgroundColor: "var(--surface)",
        }}
      >
        <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
        </svg>
        Prev
      </button>

      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
        Page <span style={{ color: "var(--text)", fontWeight: 600 }}>{page}</span> of {totalPages}
      </span>

      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          color: "var(--text-secondary)",
          backgroundColor: "var(--surface)",
        }}
      >
        Next
        <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
}

// ── Icon buttons ───────────────────────────────────────────────────────────

function IconBtn({
  onClick,
  title,
  active,
  children,
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 transition-colors"
      style={{
        borderRadius: "var(--radius-sm)",
        color: active ? "var(--accent)" : "var(--text-muted)",
        backgroundColor: active ? "var(--tag-bg)" : "transparent",
        border: "1px solid " + (active ? "var(--border-hover)" : "var(--border)"),
      }}
    >
      {children}
    </button>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { theme } = useTheme();

  const contentRef = useRef<HTMLParagraphElement | null>(null);

  const [notes, setNotes] = useState<Note[]>([]);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [relatedNotes, setRelatedNotes] = useState<ChunkSearchResult[]>([]);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [showTagCloud, setShowTagCloud] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);

  // Smart highlight — selection-driven semantic search within the open note
  const { query: hlQuery, results: hlResults, isSearching: hlSearching, clear: hlClear } =
    useSmartHighlight(contentRef, selectedNote?.id ?? null);

  // Load notes on mount
  useEffect(() => {
    getNotes(100).then(setNotes).catch(console.error);
  }, []);

  // Load related notes when a note is selected; clear highlight on note change
  useEffect(() => {
    hlClear();
    if (!selectedNote) { setRelatedNotes([]); return; }
    getRelatedNotes(selectedNote.id, 4).then(setRelatedNotes).catch(console.error);
  }, [selectedNote]);

  // Global Ctrl+K shortcut
  useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowCaptureModal(true);
      }
    }
    document.addEventListener("keydown", handleGlobalKey);
    return () => document.removeEventListener("keydown", handleGlobalKey);
  }, []);

  // Reset page when filter/search changes
  useEffect(() => { setPage(1); }, [activeTag, searchQuery]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) { setSearchResponse(null); return; }
    setIsSearching(true);
    try {
      setSearchResponse(await searchNotes(query));
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  function clearSearch() {
    setSearchResponse(null);
    setSearchQuery("");
  }

  function handleNoteCreated(ingested: Note | NoteIngestionResponse) {
    getNotes(100).then((fresh) => {
      setNotes(fresh);
      const created = fresh.find((n) => n.id === ingested.id);
      if (created) setSelectedNote(created);
    }).catch(console.error);
  }

  function handleTitleUpdated(updated: Note) {
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    setSelectedNote(updated);
    setIsEditingTitle(false);
  }

  function handleContentUpdated(updated: Note) {
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    setSelectedNote(updated);
    setIsEditingContent(false);
  }

  async function handleDeleteSelected() {
    if (!selectedNote) return;
    if (!window.confirm(`Delete "${selectedNote.auto_title}"? This cannot be undone.`)) return;
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

  async function handleSearchResultClick(result: ChunkSearchResult) {
    try {
      setSelectedNote(await getNote(result.note_id));
    } catch {
      setSelectedNote({
        id: result.note_id,
        auto_title: result.auto_title,
        raw_content: result.snippet,
        summary: result.summary,
        tags: result.tags,
        created_at: new Date().toISOString(),
        updated_at: null,
      });
    }
  }

  // ── Derived state ─────────────────────────────────────────────────────────

  const filteredNotes = activeTag
    ? notes.filter((n) => n.tags.includes(activeTag))
    : notes;

  const pagedNotes = filteredNotes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      {/* Space theme animated background */}
      {theme === "space" && (
        <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none" }} />
      )}
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30 flex items-center gap-3 px-4"
        style={{
          backgroundColor: "var(--header-bg)",
          borderBottom: "1px solid var(--border)",
          backdropFilter: "blur(8px)",
          height: "56px",
        }}
      >
        {/* Sidebar toggle */}
        <button
          onClick={() => setSidebarOpen((o) => !o)}
          className="p-1.5 shrink-0 transition-colors"
          style={{ color: "var(--text-muted)", borderRadius: "var(--radius-sm)" }}
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-label="Toggle sidebar"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" />
          </svg>
        </button>

        {/* Logo */}
        <div className="flex items-center gap-1.5 shrink-0">
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" style={{ color: "var(--accent)" }}>
            <path d="M10 1a6 6 0 0 0-3.815 10.631C7.237 12.5 8 13.443 8 14.456v.644a.75.75 0 0 0 .572.729 6.016 6.016 0 0 0 2.856 0A.75.75 0 0 0 12 15.1v-.644c0-1.013.762-1.957 1.815-2.825A6 6 0 0 0 10 1ZM8.863 17.414a.75.75 0 0 0-.226 1.483 9.066 9.066 0 0 0 2.726 0 .75.75 0 0 0-.226-1.483 7.553 7.553 0 0 1-2.274 0Z" />
          </svg>
          <span className="text-sm font-bold tracking-tight hidden sm:inline" style={{ color: "var(--text)" }}>
            Synapse
          </span>
        </div>

        {/* Search bar */}
        <div className="flex-1 max-w-xl mx-auto">
          <SearchBar onSearch={handleSearch} isLoading={isSearching} />
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
          <ThemeSelector />
          <button
            onClick={() => setShowCaptureModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all"
            style={{
              backgroundColor: "var(--accent)",
              color: "var(--accent-fg)",
              borderRadius: "var(--radius-sm)",
              border: "none",
            }}
            title="Quick capture (Ctrl+K)"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            <span className="hidden sm:inline">New</span>
          </button>
        </div>
      </header>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="flex" style={{ minHeight: "calc(100vh - 56px)" }}>
        {/* Sidebar */}
        <Sidebar
          notes={notes}
          activeTag={activeTag}
          collapsed={!sidebarOpen}
          onToggle={() => setSidebarOpen(false)}
          onTagClick={(tag) => { setActiveTag(tag); clearSearch(); }}
          onNoteClick={(note) => { setSelectedNote(note); setIsEditingTitle(false); }}
        />

        {/* Main content */}
        <main
          className="flex-1 min-w-0 overflow-y-auto"
          style={{ padding: "1.25rem 1.5rem", maxHeight: "calc(100vh - 56px)" }}
        >
          {/* Toolbar: breadcrumb + view toggle + clear */}
          <div className="flex items-center justify-between mb-4 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
                {searchResponse !== null
                  ? `"${searchQuery}"`
                  : activeTag
                    ? `#${activeTag}`
                    : "All Notes"}
              </p>
              <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                {searchResponse !== null
                  ? `${searchResponse.total} match${searchResponse.total !== 1 ? "es" : ""}`
                  : `${filteredNotes.length}`}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {(searchResponse !== null || activeTag) && (
                <button
                  onClick={() => { clearSearch(); setActiveTag(null); }}
                  className="text-xs transition-colors"
                  style={{ color: "var(--accent)" }}
                >
                  Clear ✕
                </button>
              )}
              {/* Tag Universe button */}
              {notes.length > 0 && (
                <button
                  onClick={() => setShowTagCloud(true)}
                  title="Tag Universe"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    color: activeTag ? "var(--accent)" : "var(--text-secondary)",
                    backgroundColor: activeTag ? "var(--tag-bg)" : "var(--surface)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hover)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                  }}
                >
                  {/* Sparkle icon */}
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 0 0 .951-.69l1.07-3.292Z" />
                  </svg>
                  <span className="hidden sm:inline">Tags</span>
                </button>
              )}
              {/* View toggle — only for notes grid */}
              {searchResponse === null && (
                <div className="flex items-center gap-1">
                  <IconBtn onClick={() => setViewMode("grid")} title="Grid view" active={viewMode === "grid"}>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 0 0 2 4.25v2.5A2.25 2.25 0 0 0 4.25 9h2.5A2.25 2.25 0 0 0 9 6.75v-2.5A2.25 2.25 0 0 0 6.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 2 13.25v2.5A2.25 2.25 0 0 0 4.25 18h2.5A2.25 2.25 0 0 0 9 15.75v-2.5A2.25 2.25 0 0 0 6.75 11h-2.5Zm6.5-9A2.25 2.25 0 0 0 8.5 4.25v2.5A2.25 2.25 0 0 0 10.75 9h2.5A2.25 2.25 0 0 0 15.5 6.75v-2.5A2.25 2.25 0 0 0 13.25 2h-2.5Zm0 9A2.25 2.25 0 0 0 8.5 13.25v2.5A2.25 2.25 0 0 0 10.75 18h2.5A2.25 2.25 0 0 0 15.5 15.75v-2.5A2.25 2.25 0 0 0 13.25 11h-2.5Z" clipRule="evenodd" />
                    </svg>
                  </IconBtn>
                  <IconBtn onClick={() => setViewMode("list")} title="List view" active={viewMode === "list"}>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
                    </svg>
                  </IconBtn>
                </div>
              )}
            </div>
          </div>

          {/* Daily Recall — only on home view */}
          {searchResponse === null && !activeTag && (
            <DailyRecall
              notes={notes}
              onNoteClick={(note) => { setSelectedNote(note); setIsEditingTitle(false); }}
            />
          )}

          {/* Search results */}
          {searchResponse !== null ? (
            searchResponse.results.length === 0 ? (
              <EmptyState
                icon="search"
                heading="No matches found"
                sub="Try different keywords or a broader phrase"
              />
            ) : (
              viewMode === "grid" ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {searchResponse.results.map((r) => (
                    <SearchResultCard
                      key={`${r.note_id}-${r.snippet.slice(0, 20)}`}
                      result={r}
                      onClick={() => void handleSearchResultClick(r)}
                    />
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    overflow: "hidden",
                  }}
                >
                  {searchResponse.results.map((r) => {
                    const note: Note = {
                      id: r.note_id,
                      auto_title: r.auto_title,
                      raw_content: r.snippet,
                      summary: r.summary,
                      tags: r.tags,
                      created_at: new Date().toISOString(),
                      updated_at: null,
                    };
                    return (
                      <NoteListRow
                        key={`${r.note_id}-${r.snippet.slice(0, 20)}`}
                        note={note}
                        similarityScore={r.similarity_score}
                        onClick={() => void handleSearchResultClick(r)}
                      />
                    );
                  })}
                </div>
              )
            )
          ) : (
            /* Notes */
            filteredNotes.length === 0 ? (
              <EmptyState
                icon="notes"
                heading={activeTag ? `No notes tagged "${activeTag}"` : "No notes yet"}
                cta={!activeTag ? { label: "Add your first note", onClick: () => setShowCaptureModal(true) } : undefined}
              />
            ) : viewMode === "grid" ? (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {pagedNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onClick={() => { setSelectedNote(note); setIsEditingTitle(false); }}
                    />
                  ))}
                </div>
                <Pagination
                  page={page}
                  total={filteredNotes.length}
                  pageSize={PAGE_SIZE}
                  onChange={setPage}
                />
              </>
            ) : (
              <>
                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    overflow: "hidden",
                  }}
                >
                  {pagedNotes.map((note) => (
                    <NoteListRow
                      key={note.id}
                      note={note}
                      onClick={() => { setSelectedNote(note); setIsEditingTitle(false); }}
                    />
                  ))}
                </div>
                <Pagination
                  page={page}
                  total={filteredNotes.length}
                  pageSize={PAGE_SIZE}
                  onChange={setPage}
                />
              </>
            )
          )}
        </main>

        {/* ── Detail panel ────────────────────────────────────────────────── */}
        {selectedNote && (
          <aside
            className="flex flex-col overflow-y-auto shrink-0"
            style={{
              width: "300px",
              minWidth: "300px",
              borderLeft: "1px solid var(--border)",
              backgroundColor: "var(--surface)",
              height: "calc(100vh - 56px)",
              position: "sticky",
              top: "56px",
            }}
          >
            {/* Panel header */}
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Note
              </span>
              <button
                onClick={() => { setSelectedNote(null); setIsEditingTitle(false); setIsEditingContent(false); }}
                style={{ color: "var(--text-muted)" }}
                aria-label="Close"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            {/* Note content */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

              {/* ── Title ── */}
              {isEditingTitle ? (
                <EditNoteTitleEditor
                  note={selectedNote}
                  onSuccess={handleTitleUpdated}
                  onCancel={() => setIsEditingTitle(false)}
                />
              ) : (
                <div>
                  <h2 className="text-sm font-bold leading-snug" style={{ color: "var(--text)" }}>
                    {selectedNote.auto_title}
                  </h2>
                  <button
                    onClick={() => { setIsEditingTitle(true); setIsEditingContent(false); }}
                    className="mt-1 flex items-center gap-1 text-xs"
                    style={{ color: "var(--accent)" }}
                  >
                    <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M5.433 13.917l1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                      <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                    </svg>
                    Rename title
                  </button>
                </div>
              )}

              {/* ── Raw content ── */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    Content
                  </p>
                  {!isEditingContent && (
                    <button
                      onClick={() => { setIsEditingContent(true); setIsEditingTitle(false); }}
                      className="flex items-center gap-1 text-xs"
                      style={{ color: "var(--accent)" }}
                    >
                      <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M5.433 13.917l1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                      </svg>
                      Edit
                    </button>
                  )}
                </div>

                {isEditingContent ? (
                  <EditNoteContentEditor
                    note={selectedNote}
                    onSuccess={handleContentUpdated}
                    onCancel={() => { setIsEditingContent(false); hlClear(); }}
                  />
                ) : (
                  <p
                    ref={contentRef}
                    className="text-sm leading-relaxed whitespace-pre-wrap select-text"
                    style={{ color: "var(--text-secondary)", cursor: "text" }}
                  >
                    {selectedNote.raw_content}
                  </p>
                )}
              </div>

              {/* ── Smart Highlight panel ── */}
              {!isEditingContent && hlQuery && (
                <SmartHighlightPanel
                  query={hlQuery}
                  results={hlResults}
                  isSearching={hlSearching}
                  onClear={hlClear}
                  onNoteClick={(r) => void handleSearchResultClick(r)}
                />
              )}

              {/* ── Tags ── */}
              {!isEditingContent && selectedNote.tags.length > 0 && (
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
                    Tags
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNote.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full px-2 py-0.5 text-xs"
                        style={{
                          backgroundColor: "var(--tag-bg)",
                          color: "var(--tag-text)",
                          border: "1px solid var(--tag-border)",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Dates + delete ── */}
              {!isEditingContent && (
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                  <div className="flex flex-col gap-0.5 mb-3">
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Created {formatFullDate(selectedNote.created_at)}
                    </p>
                    {selectedNote.updated_at && (
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        Updated {formatFullDate(selectedNote.updated_at)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleDeleteSelected}
                    disabled={isDeleting}
                    className="px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                    style={{
                      border: "1px solid #fca5a5",
                      color: "#dc2626",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "transparent",
                    }}
                  >
                    {isDeleting ? "Deleting…" : "Delete note"}
                  </button>
                </div>
              )}

              {/* ── Related notes ── */}
              {!isEditingContent && relatedNotes.length > 0 && (
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    Related
                  </p>
                  <div className="flex flex-col gap-2">
                    {relatedNotes.map((r) => (
                      <SearchResultCard
                        key={r.note_id}
                        result={r}
                        onClick={() => void handleSearchResultClick(r)}
                      />
                    ))}
                  </div>
                </div>
              )}

            </div>
          </aside>
        )}
      </div>

      {/* Quick Capture Modal */}
      {showCaptureModal && (
        <QuickCaptureModal
          onSuccess={(note) => { handleNoteCreated(note); }}
          onClose={() => setShowCaptureModal(false)}
        />
      )}

      {/* Tag Universe Modal */}
      {showTagCloud && (
        <TagCloudModal
          notes={notes}
          activeTag={activeTag}
          onTagClick={(tag) => { setActiveTag(tag); clearSearch(); }}
          onClose={() => setShowTagCloud(false)}
        />
      )}

      {/* FAB — always visible */}
      <CaptureButton onClick={() => setShowCaptureModal(true)} />
    </div>
  );
}

// ── Empty state helper ────────────────────────────────────────────────────

function EmptyState({
  icon,
  heading,
  sub,
  cta,
}: {
  icon: "search" | "notes";
  heading: string;
  sub?: string;
  cta?: { label: string; onClick: () => void };
}) {
  return (
    <div
      className="flex flex-col items-center gap-3 py-16 text-center"
      style={{ border: "2px dashed var(--border)", borderRadius: "var(--radius-lg)" }}
    >
      {icon === "search" ? (
        <svg className="w-8 h-8" viewBox="0 0 20 20" fill="currentColor" style={{ color: "var(--text-muted)" }}>
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-10 h-10" viewBox="0 0 20 20" fill="currentColor" style={{ color: "var(--text-muted)" }}>
          <path fillRule="evenodd" d="M4 3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H4Zm12 12H4l4-8 3 6 2-4 3 6Z" clipRule="evenodd" />
        </svg>
      )}
      <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>{heading}</p>
      {sub && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{sub}</p>}
      {cta && (
        <button
          onClick={cta.onClick}
          className="px-4 py-2 text-sm font-semibold mt-1"
          style={{ backgroundColor: "var(--accent)", color: "var(--accent-fg)", borderRadius: "var(--radius-sm)" }}
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}

"use client";

import type { Note } from "@/types";

interface SidebarProps {
  notes: Note[];
  activeTag: string | null;
  collapsed: boolean;
  onToggle: () => void;
  onTagClick: (tag: string | null) => void;
  onNoteClick: (note: Note) => void;
}

function getTagCounts(notes: Note[]): { tag: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const note of notes) {
    for (const tag of note.tags) counts[tag] = (counts[tag] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
}

function getSmartCollections(notes: Note[]): { tag: string; count: number }[] {
  return getTagCounts(notes).filter((t) => t.count >= 2).slice(0, 6);
}

function getRecentNotes(notes: Note[]): Note[] {
  return [...notes]
    .sort((a, b) => {
      const ta = new Date(a.updated_at ?? a.created_at).getTime();
      const tb = new Date(b.updated_at ?? b.created_at).getTime();
      return tb - ta;
    })
    .slice(0, 6);
}

function formatRelativeDate(iso: string) {
  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Shared section header
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="px-2 mb-1.5 text-xs font-semibold uppercase tracking-wider"
      style={{ color: "var(--text-muted)" }}
    >
      {children}
    </p>
  );
}

export default function Sidebar({
  notes,
  activeTag,
  collapsed,
  onToggle,
  onTagClick,
  onNoteClick,
}: SidebarProps) {
  const recent = getRecentNotes(notes);
  const collections = getSmartCollections(notes);

  return (
    <aside
      style={{
        width: collapsed ? "0" : "220px",
        minWidth: collapsed ? "0" : "220px",
        overflow: "hidden",
        transition: "width 0.2s ease, min-width 0.2s ease",
        backgroundColor: "var(--sidebar-bg)",
        borderRight: collapsed ? "none" : "1px solid var(--sidebar-border)",
        height: "calc(100vh - 56px)",
        position: "sticky",
        top: "56px",
        flexShrink: 0,
      }}
    >
      <div
        className="flex flex-col gap-5 overflow-y-auto h-full"
        style={{ width: "220px", padding: "1rem 0.75rem" }}
      >
        {/* Collapse button (within sidebar) */}
        <button
          onClick={onToggle}
          className="flex items-center gap-1.5 self-end text-xs transition-colors"
          style={{ color: "var(--text-muted)" }}
          title="Collapse sidebar"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
              clipRule="evenodd"
            />
          </svg>
          Hide
        </button>

        {/* All Notes */}
        <nav>
          <button
            onClick={() => onTagClick(null)}
            className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-left transition-colors"
            style={{
              borderRadius: "var(--radius-sm)",
              fontWeight: activeTag === null ? 600 : 400,
              color: activeTag === null ? "var(--accent)" : "var(--text-secondary)",
              backgroundColor: activeTag === null ? "var(--tag-bg)" : "transparent",
            }}
            onMouseEnter={(e) => {
              if (activeTag !== null)
                (e.currentTarget as HTMLElement).style.backgroundColor = "var(--surface-hover)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor =
                activeTag === null ? "var(--tag-bg)" : "transparent";
            }}
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" />
            </svg>
            All Notes
            <span className="ml-auto text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
              {notes.length}
            </span>
          </button>
        </nav>

        {/* Smart Collections */}
        {collections.length > 0 && (
          <section>
            <SectionLabel>Collections</SectionLabel>
            <div className="flex flex-col gap-0.5">
              {collections.map(({ tag, count }) => (
                <button
                  key={tag}
                  onClick={() => onTagClick(activeTag === tag ? null : tag)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-left transition-colors"
                  style={{
                    borderRadius: "var(--radius-sm)",
                    fontWeight: activeTag === tag ? 600 : 400,
                    color: activeTag === tag ? "var(--accent)" : "var(--text-secondary)",
                    backgroundColor: activeTag === tag ? "var(--tag-bg)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (activeTag !== tag)
                      (e.currentTarget as HTMLElement).style.backgroundColor = "var(--surface-hover)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      activeTag === tag ? "var(--tag-bg)" : "transparent";
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: "var(--accent)" }}
                  />
                  <span className="truncate">{tag}</span>
                  <span
                    className="ml-auto text-xs tabular-nums"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Recent — title only */}
        {recent.length > 0 && (
          <section>
            <SectionLabel>Recent</SectionLabel>
            <div className="flex flex-col gap-0.5">
              {recent.map((note) => (
                <button
                  key={note.id}
                  onClick={() => onNoteClick(note)}
                  className="flex items-start gap-2 w-full px-2 py-1.5 text-left transition-colors"
                  style={{
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "transparent",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "var(--surface-hover)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                  }}
                >
                  <svg
                    className="w-3 h-3 mt-0.5 shrink-0"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 5a.75.75 0 0 1 .75-.75h8a.75.75 0 0 1 0 1.5h-8A.75.75 0 0 1 2 9.75Zm0 5a.75.75 0 0 1 .75-.75h6a.75.75 0 0 1 0 1.5h-6A.75.75 0 0 1 2 14.75Z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs leading-snug truncate"
                      style={{ color: "var(--text)" }}
                    >
                      {note.auto_title}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {formatRelativeDate(note.updated_at ?? note.created_at)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {notes.length === 0 && (
          <p className="px-2 text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>
            No notes yet.
          </p>
        )}
      </div>
    </aside>
  );
}

import type {
  Note,
  NoteCreate,
  NoteTitleUpdate,
  NoteIngestionResponse,
  ChunkSearchResult,
  SearchResponse,
} from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const defaultHeaders: HeadersInit = { "ngrok-skip-browser-warning": "true" };
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...defaultHeaders, ...init?.headers },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** List notes, newest first */
export function getNotes(limit = 20, skip = 0): Promise<Note[]> {
  return request<Note[]>(`/notes/?skip=${skip}&limit=${limit}`);
}

/** Single note by ID */
export function getNote(id: number): Promise<Note> {
  return request<Note>(`/notes/${id}`);
}

/** Ingest raw text — backend auto-generates title, summary, tags */
export function createNote(data: NoteCreate): Promise<NoteIngestionResponse> {
  return request<NoteIngestionResponse>("/notes/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

/** Update only the title of a note */
export function updateNoteTitle(id: number, title: string): Promise<Note> {
  const data: NoteTitleUpdate = { title };
  return request<Note>(`/notes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

/** Replace raw body — re-ingests (summary/tags/chunks regenerated), title preserved */
export function updateNoteContent(id: number, body: string): Promise<Note> {
  return request<Note>(`/notes/${id}/content`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
}

/** Delete a note (cascades to chunks + tags) */
export function deleteNote(id: number): Promise<void> {
  return request<void>(`/notes/${id}`, { method: "DELETE" });
}

/** Semantic search — calls GET /notes/search */
export function searchNotes(
  query: string,
  limit = 10,
  threshold = 0.25
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    threshold: String(threshold),
  });
  return request<SearchResponse>(`/notes/search?${params}`);
}

/** Find notes semantically related to a given note */
export function getRelatedNotes(
  noteId: number,
  limit = 5
): Promise<ChunkSearchResult[]> {
  return request<ChunkSearchResult[]>(
    `/search/related/${noteId}?limit=${limit}`
  );
}

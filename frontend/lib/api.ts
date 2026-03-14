import type { Note, NoteCreate, NoteUpdate, SearchResponse, SearchResult } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const defaultHeaders: HeadersInit = { "ngrok-skip-browser-warning": "true" };
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...defaultHeaders, ...init?.headers },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }
  return res.json() as Promise<T>;
}

export function getNotes(limit?: number): Promise<Note[]> {
  const params = limit !== undefined ? `?limit=${limit}` : "";
  return request<Note[]>(`/notes/${params}`);
}

export function getNote(id: number): Promise<Note> {
  return request<Note>(`/notes/${id}`);
}

export function createNote(data: NoteCreate): Promise<Note> {
  return request<Note>("/notes/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function updateNote(id: number, data: NoteUpdate): Promise<Note> {
  return request<Note>(`/notes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function deleteNote(id: number): Promise<void> {
  return request<void>(`/notes/${id}`, { method: "DELETE" });
}

export function searchNotes(
  query: string,
  limit?: number,
  threshold?: number
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query });
  if (limit !== undefined) params.set("limit", String(limit));
  if (threshold !== undefined) params.set("threshold", String(threshold));
  return request<SearchResponse>(`/search/?${params}`);
}

export function getRelatedNotes(
  noteId: number,
  limit?: number
): Promise<SearchResult[]> {
  const params = limit !== undefined ? `?limit=${limit}` : "";
  return request<SearchResult[]>(`/search/related/${noteId}${params}`);
}

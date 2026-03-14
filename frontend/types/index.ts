export interface Note {
  id: number;
  title: string;
  body: string;
  tags: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface NoteCreate {
  title: string;
  body: string;
  tags?: string;
}

export interface NoteUpdate {
  title?: string;
  body?: string;
  tags?: string;
}

export interface SearchResult {
  note: Note;
  similarity_score: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  total: number;
}

// V2 Backend types — matches FastAPI schemas exactly

/** Returned by GET /notes, GET /notes/{id}, PATCH /notes/{id}, PUT /notes/{id}/content */
export interface Note {
  id: number;
  auto_title: string;
  raw_content: string;
  summary: string | null;
  tags: string[];
  created_at: string;
  updated_at: string | null;
}

/** Returned by POST /notes */
export interface NoteIngestionResponse {
  id: number;
  auto_title: string;
  summary: string | null;
  tags: string[];
  chunk_count: number;
  created_at: string;
}

/** A single search hit — returned by GET /notes/search and GET /search/related/{id} */
export interface ChunkSearchResult {
  note_id: number;
  auto_title: string;
  summary: string | null;
  snippet: string;
  similarity_score: number;
  tags: string[];
}

/** Wrapper for search endpoint response */
export interface SearchResponse {
  query: string;
  results: ChunkSearchResult[];
  total: number;
}

/** POST /notes body — backend auto-generates title/tags/summary */
export interface NoteCreate {
  body: string;
}

/** PATCH /notes/{id} body — only title is editable after creation */
export interface NoteTitleUpdate {
  title: string;
}

/** PUT /notes/{id}/content body — triggers full re-ingestion */
export interface NoteContentUpdate {
  body: string;
}

export type ThemeName = "minimalist" | "fluid" | "high-contrast" | "neon" | "pastel" | "space";

export interface ThemeOption {
  id: ThemeName;
  label: string;
  description: string;
  preview: string; // hex accent color for preview swatch
}

export const THEMES: ThemeOption[] = [
  { id: "minimalist", label: "Minimalist", description: "Clean white space", preview: "#1f2937" },
  { id: "fluid", label: "Fluid", description: "Indigo gradients", preview: "#7c3aed" },
  { id: "high-contrast", label: "High Contrast", description: "Bold black & white", preview: "#ffffff" },
  { id: "neon", label: "Neon", description: "Synthwave dark", preview: "#00f5d4" },
  { id: "pastel", label: "Pastel", description: "Soft & warm pinks", preview: "#ec4899" },
  { id: "space", label: "Space", description: "Neon aurora cosmos", preview: "#a78bfa" },
];

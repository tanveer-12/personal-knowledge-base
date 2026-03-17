"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChunkSearchResult } from "@/types";
import { searchNotes } from "@/lib/api";

interface SmartHighlightState {
  query: string | null;
  results: ChunkSearchResult[];
  isSearching: boolean;
}

export function useSmartHighlight(
  containerRef: React.RefObject<HTMLElement | null>,
  excludeNoteId: number | null
) {
  const [state, setState] = useState<SmartHighlightState>({
    query: null,
    results: [],
    isSearching: false,
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setState({ query: null, results: [], isSearching: false });
  }, []);

  useEffect(() => {
    function handleMouseUp() {
      const sel = window.getSelection();
      const text = sel?.toString().trim() ?? "";

      // Need at least 3 words for a meaningful semantic search
      if (text.split(/\s+/).filter(Boolean).length < 3) return;

      // Must originate within the watched container
      const range = sel?.getRangeAt(0);
      if (!range || !containerRef.current?.contains(range.commonAncestorContainer)) return;

      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(async () => {
        setState({ query: text, results: [], isSearching: true });

        try {
          const response = await searchNotes(text, 5, 0.28);
          const filtered = response.results.filter((r) => r.note_id !== excludeNoteId);
          setState({ query: text, results: filtered.slice(0, 3), isSearching: false });
        } catch {
          setState((prev) => ({ ...prev, isSearching: false }));
        }
      }, 380);
    }

    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [containerRef, excludeNoteId]);

  return { ...state, clear };
}

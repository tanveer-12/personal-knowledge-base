"use client";

import { useEffect, useRef, useState } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

export default function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { onSearch(value); }, 300);
    return () => clearTimeout(timer);
  }, [value, onSearch]);

  return (
    <div className="relative w-full">
      {/* Search icon */}
      <div
        className="absolute inset-y-0 left-3 flex items-center pointer-events-none"
        style={{ color: "var(--text-muted)" }}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
        </svg>
      </div>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search by meaning, not keywords…"
        style={{
          width: "100%",
          backgroundColor: "var(--input-bg)",
          color: "var(--text)",
          border: "1px solid var(--input-border)",
          borderRadius: "var(--radius-sm)",
          padding: "0.5rem 2.25rem 0.5rem 2rem",
          fontSize: "0.8125rem",
          outline: "none",
          transition: "border-color 0.15s ease, box-shadow 0.15s ease",
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

      {/* Right icon: spinner or clear */}
      <div className="absolute inset-y-0 right-3 flex items-center">
        {isLoading ? (
          <svg
            className="h-3.5 w-3.5 animate-spin"
            style={{ color: "var(--text-muted)" }}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        ) : value ? (
          <button
            type="button"
            onClick={() => setValue("")}
            aria-label="Clear search"
            style={{ color: "var(--text-muted)" }}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}

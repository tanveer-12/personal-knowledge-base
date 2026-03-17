"use client";

import { useRef, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { THEMES } from "@/types";

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors"
        title="Change theme"
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          color: "var(--text-secondary)",
          backgroundColor: "var(--surface)",
        }}
      >
        {/* Color swatch */}
        <span
          className="inline-block w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: current.preview, border: "1px solid var(--border)" }}
        />
        <span className="hidden sm:inline">{current.label}</span>
        <svg
          className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          {/* Dropdown */}
          <div
            className="absolute right-0 top-full mt-1.5 z-50 w-48 overflow-hidden"
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <p
              className="px-3 py-2 text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}
            >
              Theme
            </p>
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTheme(t.id); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors"
                style={{
                  backgroundColor: theme === t.id ? "var(--tag-bg)" : "transparent",
                  color: "var(--text)",
                }}
                onMouseEnter={(e) => {
                  if (theme !== t.id)
                    (e.currentTarget as HTMLElement).style.backgroundColor = "var(--surface-hover)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    theme === t.id ? "var(--tag-bg)" : "transparent";
                }}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: t.preview,
                    border: "2px solid var(--border)",
                    outline: theme === t.id ? `2px solid ${t.preview}` : "none",
                    outlineOffset: "1px",
                  }}
                />
                <span className="flex flex-col">
                  <span className="text-xs font-medium" style={{ color: "var(--text)" }}>
                    {t.label}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {t.description}
                  </span>
                </span>
                {theme === t.id && (
                  <svg
                    className="ml-auto w-3 h-3 shrink-0"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    style={{ color: "var(--accent)" }}
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

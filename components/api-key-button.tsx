"use client";

import type { CSSProperties } from "react";

interface ApiKeyButtonProps {
  showRequiredBadge: boolean;
  onClick: () => void;
}

export default function ApiKeyButton({
  showRequiredBadge,
  onClick,
}: ApiKeyButtonProps) {
  const label = showRequiredBadge
    ? "OpenAI API key (API key required)"
    : "OpenAI API key";

  const pillStyle: CSSProperties = {
    background: "var(--md-sys-color-surface-container)",
    borderRadius: "var(--md-sys-shape-corner-large)",
    boxShadow: "var(--md-sys-elevation-level-1)",
  };

  return (
    <div className="relative p-1" style={pillStyle}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        title={showRequiredBadge ? "API key required" : "OpenAI API key"}
        className="size-10 rounded-full flex items-center justify-center transition-colors hover:bg-[color:var(--md-sys-color-on-surface)]/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--md-sys-color-primary)]"
        style={{ color: "var(--md-sys-color-on-surface-variant)" }}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          key
        </span>
      </button>
      {showRequiredBadge && (
        <span
          aria-hidden="true"
          className="absolute top-1 right-1 size-2.5 rounded-full"
          style={{
            background: "var(--md-sys-color-error)",
            boxShadow: "0 0 0 2px var(--md-sys-color-surface-container)",
          }}
        />
      )}
    </div>
  );
}

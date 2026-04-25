"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  clearStoredKey,
  maskKey,
  setStoredKey,
  useStoredKey,
} from "@/lib/api-key";

export type DialogReason = "manual" | "no_key" | "invalid_key";

interface ApiKeyDialogProps {
  open: boolean;
  reason: DialogReason;
  onClose: () => void;
}

const KEYS_URL = "https://platform.openai.com/api-keys";

const REASON_BANNER: Record<DialogReason, string | null> = {
  manual: null,
  no_key: "Add your OpenAI API key to start a session.",
  invalid_key: "OpenAI rejected this key — check it and try again.",
};

export default function ApiKeyDialog({
  open,
  reason,
  onClose,
}: ApiKeyDialogProps) {
  const savedKey = useStoredKey();
  const [draft, setDraft] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setDraft("");
    if (reason === "invalid_key") {
      setInlineError(REASON_BANNER.invalid_key);
    } else {
      setInlineError(null);
    }
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open, reason]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleTrap = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const node = dialogRef.current;
    if (!node) return;
    const focusables = node.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  if (!open) return null;

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    const result = setStoredKey(draft);
    if (!result.ok) {
      if (result.reason === "wrong_prefix") {
        setInlineError(
          "This doesn't look like an OpenAI API key — they start with sk-.",
        );
      } else {
        setInlineError("That key looks too short to be valid.");
      }
      return;
    }
    setInlineError(null);
    onClose();
  };

  const handleClear = () => {
    clearStoredKey();
    setDraft("");
    setInlineError(null);
  };

  const banner = REASON_BANNER[reason];
  const showBanner = banner !== null && (reason !== "invalid_key" || !inlineError);

  const surfaceStyle: CSSProperties = {
    background: "var(--md-sys-color-surface-container-high)",
    color: "var(--md-sys-color-on-surface)",
    borderRadius: "var(--md-sys-shape-corner-large)",
    boxShadow: "var(--md-sys-elevation-level-3)",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        style={{
          background:
            "color-mix(in srgb, var(--md-sys-color-scrim) 40%, transparent)",
        }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-key-dialog-title"
        onKeyDown={handleTrap}
        className="relative w-full max-w-md p-6 flex flex-col gap-4"
        style={surfaceStyle}
      >
        <h2
          id="api-key-dialog-title"
          style={{
            font: "var(--md-sys-typescale-headline-small-font)",
            color: "var(--md-sys-color-on-surface)",
          }}
        >
          OpenAI API Key
        </h2>

        {showBanner && (
          <div
            className="px-3 py-2 flex items-start gap-2"
            style={{
              background:
                reason === "invalid_key"
                  ? "var(--md-sys-color-error-container)"
                  : "var(--md-sys-color-secondary-container)",
              color:
                reason === "invalid_key"
                  ? "var(--md-sys-color-on-error-container)"
                  : "var(--md-sys-color-on-secondary-container)",
              borderRadius: "var(--md-sys-shape-corner-medium)",
              font: "var(--md-sys-typescale-body-medium-font)",
            }}
          >
            <span
              className="material-symbols-outlined"
              aria-hidden="true"
              style={{ fontSize: 20, marginTop: 2 }}
            >
              {reason === "invalid_key" ? "error" : "key"}
            </span>
            <span>{banner}</span>
          </div>
        )}

        {savedKey && (
          <div
            className="px-3 py-2 flex items-center justify-between"
            style={{
              background: "var(--md-sys-color-surface-container)",
              color: "var(--md-sys-color-on-surface-variant)",
              borderRadius: "var(--md-sys-shape-corner-medium)",
              font: "var(--md-sys-typescale-body-small-font)",
            }}
          >
            <span>
              Saved key:{" "}
              <span style={{ color: "var(--md-sys-color-on-surface)" }}>
                {maskKey(savedKey)}
              </span>
            </span>
          </div>
        )}

        <form onSubmit={handleSave} className="flex flex-col gap-2">
          <label
            htmlFor="api-key-input"
            style={{
              font: "var(--md-sys-typescale-label-medium-font)",
              color: "var(--md-sys-color-on-surface-variant)",
            }}
          >
            {savedKey ? "Replace key" : "Enter key"}
          </label>
          <input
            ref={inputRef}
            id="api-key-input"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (inlineError) setInlineError(null);
            }}
            placeholder="sk-..."
            className="px-3 py-2 outline-none focus-visible:ring-2"
            style={
              {
                background: "var(--md-sys-color-surface-container-highest)",
                color: "var(--md-sys-color-on-surface)",
                borderRadius: "var(--md-sys-shape-corner-small)",
                border: "1px solid var(--md-sys-color-outline-variant)",
                font: "var(--md-sys-typescale-body-medium-font)",
                "--tw-ring-color": "var(--md-sys-color-primary)",
              } as CSSProperties
            }
          />
          {inlineError && (
            <span
              role="alert"
              style={{
                font: "var(--md-sys-typescale-body-small-font)",
                color: "var(--md-sys-color-error)",
              }}
            >
              {inlineError}
            </span>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            {savedKey && (
              <md-text-button type="button" onClick={handleClear}>
                Clear
              </md-text-button>
            )}
            <md-text-button type="button" onClick={onClose}>
              Cancel
            </md-text-button>
            <md-filled-tonal-button type="submit">Save</md-filled-tonal-button>
          </div>
        </form>

        <p
          style={{
            font: "var(--md-sys-typescale-body-small-font)",
            color: "var(--md-sys-color-on-surface-variant)",
          }}
        >
          Your key is stored only in this browser and sent directly to OpenAI to
          issue a short-lived client secret when you start a session.{" "}
          <a
            href={KEYS_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "var(--md-sys-color-primary)",
              textDecoration: "underline",
            }}
          >
            Get an API key
          </a>
          .
        </p>
      </div>
    </div>
  );
}

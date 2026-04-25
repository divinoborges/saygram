"use client";

import { useEffect, useState } from "react";
import { toast, Toast, ToastKind } from "@/lib/toast";

const SHORT_MS = 4000;
const LONG_THRESHOLD_CHARS = 50;
const LONG_MS = 7000;

const TOKENS: Record<ToastKind, { container: string; on: string }> = {
  info: {
    container: "var(--md-sys-color-inverse-surface)",
    on: "var(--md-sys-color-inverse-on-surface)",
  },
  warning: {
    container: "var(--md-sys-color-secondary-container)",
    on: "var(--md-sys-color-on-secondary-container)",
  },
  error: {
    container: "var(--md-sys-color-error-container)",
    on: "var(--md-sys-color-on-error-container)",
  },
};

export default function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    return toast.subscribe((t) => {
      setToasts((prev) => [...prev, t]);
      const dismissMs =
        t.message.length > LONG_THRESHOLD_CHARS ? LONG_MS : SHORT_MS;
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, dismissMs);
    });
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end pointer-events-none"
    >
      {toasts.map((t) => {
        const tokens = TOKENS[t.kind];
        return (
          <div
            key={t.id}
            className="px-4 py-3 max-w-sm pointer-events-auto"
            style={{
              background: tokens.container,
              color: tokens.on,
              borderRadius: "var(--md-sys-shape-corner-extra-small)",
              boxShadow: "var(--md-sys-elevation-level-3)",
              font: "var(--md-sys-typescale-body-medium-font)",
              minHeight: "48px",
              display: "flex",
              alignItems: "center",
            }}
          >
            {t.message}
          </div>
        );
      })}
    </div>
  );
}

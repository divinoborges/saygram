"use client";

export type ToastKind = "info" | "warning" | "error";

export interface Toast {
  id: string;
  message: string;
  kind: ToastKind;
}

type Listener = (toast: Toast) => void;

const listeners = new Set<Listener>();

export const toast = {
  emit(message: string, kind: ToastKind = "info"): void {
    const t: Toast = { id: crypto.randomUUID(), message, kind };
    listeners.forEach((l) => l(t));
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

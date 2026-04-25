"use client";

import { useSyncExternalStore } from "react";
import { toast } from "@/lib/toast";

const STORAGE_KEY = "mermaid:last";

type Listener = () => void;

let currentCode: string = "";
const listeners = new Set<Listener>();
let hydrated = false;

function safeGetItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemoveItem(key: string): boolean {
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function notify() {
  listeners.forEach((l) => l());
}

export const diagramStore = {
  hydrate(): void {
    if (hydrated || typeof window === "undefined") return;
    const stored = safeGetItem(STORAGE_KEY);
    if (stored) {
      currentCode = stored;
    }
    hydrated = true;
    notify();
  },

  getCurrent(): string {
    return currentCode;
  },

  commit(newCode: string): { persisted: boolean } {
    currentCode = newCode;
    let persisted = true;
    if (typeof window !== "undefined") {
      if (newCode === "") {
        persisted = safeRemoveItem(STORAGE_KEY);
      } else {
        persisted = safeSetItem(STORAGE_KEY, newCode);
      }
      if (!persisted) {
        toast.emit(
          "Couldn't save the diagram to local storage — it'll stay in this session only.",
          "warning",
        );
      }
    }
    notify();
    return { persisted };
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

function getServerSnapshot(): string {
  return "";
}

export function useDiagramCode(): string {
  return useSyncExternalStore(
    diagramStore.subscribe,
    diagramStore.getCurrent,
    getServerSnapshot,
  );
}

"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "openai:apiKey";
const MIN_LEN = 20;
const MAX_LEN = 200;
const REQUIRED_PREFIX = "sk-";

type Listener = () => void;

let currentKey: string | null = null;
let hydrated = false;
const listeners = new Set<Listener>();

export type SetKeyResult =
  | { ok: true }
  | { ok: false; reason: "wrong_prefix" | "too_short" };

function safeGet(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
function safeSet(value: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
}
function safeRemove(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function notify(): void {
  listeners.forEach((l) => l());
}

export const apiKeyStore = {
  hydrate(): void {
    if (hydrated || typeof window === "undefined") return;
    currentKey = safeGet();
    hydrated = true;
    notify();
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot(): string | null {
    return currentKey;
  },
};

export function getStoredKey(): string | null {
  return currentKey;
}

export function setStoredKey(value: string): SetKeyResult {
  const trimmed = value.trim();
  if (!trimmed.startsWith(REQUIRED_PREFIX)) {
    return { ok: false, reason: "wrong_prefix" };
  }
  if (trimmed.length < MIN_LEN || trimmed.length > MAX_LEN) {
    return { ok: false, reason: "too_short" };
  }
  currentKey = trimmed;
  if (typeof window !== "undefined") safeSet(trimmed);
  notify();
  return { ok: true };
}

export function clearStoredKey(): void {
  currentKey = null;
  if (typeof window !== "undefined") safeRemove();
  notify();
}

export function maskKey(value: string): string {
  if (!value) return "";
  const last4 = value.slice(-4);
  return `sk-…${last4}`;
}

function getServerSnapshot(): string | null {
  return null;
}

export function useStoredKey(): string | null {
  return useSyncExternalStore(
    apiKeyStore.subscribe,
    apiKeyStore.getSnapshot,
    getServerSnapshot,
  );
}

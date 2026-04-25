"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "ui:codePanel";
const WIDTH_STORAGE_KEY = "ui:codePanel:width";

export const PANEL_COLLAPSED_WIDTH = 40;
export const PANEL_DEFAULT_WIDTH = 384;
export const PANEL_MIN_WIDTH = 280;
export const PANEL_MAX_WIDTH = 800;

export type PanelState = "expanded" | "collapsed";
const DEFAULT: PanelState = "expanded";

type Listener = () => void;
const listeners = new Set<Listener>();

let current: PanelState = DEFAULT;
let hydrated = false;

function safeGet(): PanelState | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "collapsed" || v === "expanded") return v;
    return null;
  } catch {
    return null;
  }
}

function safeSet(value: PanelState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* swallow — non-critical */
  }
}

function notify() {
  listeners.forEach((l) => l());
}

export const panelState = {
  hydrate(): void {
    if (hydrated || typeof window === "undefined") return;
    const stored = safeGet();
    if (stored) current = stored;
    hydrated = true;
    notify();
  },
  get(): PanelState {
    return current;
  },
  toggle(): void {
    current = current === "expanded" ? "collapsed" : "expanded";
    if (typeof window !== "undefined") safeSet(current);
    notify();
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

function getServerSnapshot(): PanelState {
  return DEFAULT;
}

export function usePanelState(): PanelState {
  return useSyncExternalStore(
    panelState.subscribe,
    panelState.get,
    getServerSnapshot,
  );
}

const widthListeners = new Set<Listener>();
let currentWidth: number = PANEL_DEFAULT_WIDTH;
let widthHydrated = false;
let resizing = false;

function clampWidth(n: number): number {
  if (!Number.isFinite(n)) return PANEL_DEFAULT_WIDTH;
  return Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, Math.round(n)));
}

function safeGetWidth(): number | null {
  try {
    const v = window.localStorage.getItem(WIDTH_STORAGE_KEY);
    if (v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? clampWidth(n) : null;
  } catch {
    return null;
  }
}

function safeSetWidth(n: number): void {
  try {
    window.localStorage.setItem(WIDTH_STORAGE_KEY, String(n));
  } catch {
    /* swallow — non-critical */
  }
}

function notifyWidth() {
  widthListeners.forEach((l) => l());
}

export const panelWidthState = {
  hydrate(): void {
    if (widthHydrated || typeof window === "undefined") return;
    const stored = safeGetWidth();
    if (stored !== null) currentWidth = stored;
    widthHydrated = true;
    notifyWidth();
  },
  get(): number {
    return currentWidth;
  },
  set(n: number): void {
    const next = clampWidth(n);
    if (next === currentWidth) return;
    currentWidth = next;
    if (typeof window !== "undefined") safeSetWidth(next);
    notifyWidth();
  },
  setResizing(b: boolean): void {
    if (resizing === b) return;
    resizing = b;
    notifyWidth();
  },
  isResizing(): boolean {
    return resizing;
  },
  subscribe(listener: Listener): () => void {
    widthListeners.add(listener);
    return () => {
      widthListeners.delete(listener);
    };
  },
};

function getWidthServerSnapshot(): number {
  return PANEL_DEFAULT_WIDTH;
}

function getResizingServerSnapshot(): boolean {
  return false;
}

export function usePanelWidth(): number {
  return useSyncExternalStore(
    panelWidthState.subscribe,
    panelWidthState.get,
    getWidthServerSnapshot,
  );
}

export function usePanelResizing(): boolean {
  return useSyncExternalStore(
    panelWidthState.subscribe,
    panelWidthState.isResizing,
    getResizingServerSnapshot,
  );
}

"use client";

export type Scheme = "light" | "dark";

export function resolveScheme(): Scheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * Inline script body emitted in <head> before first paint. Reads the OS color
 * scheme and sets data-theme on <html> so the M3 token CSS variables resolve
 * to the correct scheme on the very first frame.
 */
export const themeInitScript = `
(function () {
  try {
    var scheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = scheme;
  } catch (e) {
    document.documentElement.dataset.theme = "dark";
  }
})();
`.trim();

"use client";

import mermaid from "mermaid";

let initialized = false;

function ensureInitialized() {
  if (initialized) return;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme: "default",
  });
  initialized = true;
}

export type ParseResult =
  | { ok: true }
  | { ok: false; error: string };

export type RenderResult =
  | { ok: true; svg: string }
  | { ok: false; error: string };

export async function parseMermaid(code: string): Promise<ParseResult> {
  ensureInitialized();
  try {
    await mermaid.parse(code);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function renderMermaid(
  id: string,
  code: string,
): Promise<RenderResult> {
  ensureInitialized();
  try {
    const { svg } = await mermaid.render(id, code);
    return { ok: true, svg };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown Mermaid error";
  }
}

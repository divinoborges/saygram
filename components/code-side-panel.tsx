"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "@/lib/toast";
import {
  PANEL_COLLAPSED_WIDTH,
  panelWidthState,
  usePanelResizing,
  usePanelWidth,
} from "@/lib/panel-state";

interface CodeSidePanelProps {
  code: string;
  collapsed: boolean;
  onToggle: () => void;
  onChange?: (value: string) => void;
}

const COPIED_FLASH_MS = 2000;

export default function CodeSidePanel({
  code,
  collapsed,
  onToggle,
  onChange,
}: CodeSidePanelProps) {
  const [copied, setCopied] = useState(false);
  const panelWidth = usePanelWidth();
  const isResizing = usePanelResizing();
  const gutterRef = useRef<HTMLDivElement | null>(null);

  const lineCount = code.length === 0 ? 1 : code.split("\n").length;
  const lineNumbers = useMemo(
    () =>
      Array.from({ length: lineCount }, (_, i) => String(i + 1)).join("\n"),
    [lineCount],
  );
  const gutterDigits = String(lineCount).length;

  async function handleCopy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_FLASH_MS);
    } catch {
      toast.emit(
        "Couldn't access the clipboard. Select the code and press Cmd/Ctrl+C to copy.",
        "warning",
      );
    }
  }

  function handleResizePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    const target = e.currentTarget;
    const startX = e.clientX;
    const startWidth = panelWidthState.get();
    target.setPointerCapture(e.pointerId);
    panelWidthState.setResizing(true);

    const onMove = (ev: PointerEvent) => {
      panelWidthState.set(startWidth - (ev.clientX - startX));
    };
    const stop = (ev: PointerEvent) => {
      try {
        target.releasePointerCapture(ev.pointerId);
      } catch {
        /* already released */
      }
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", stop);
      target.removeEventListener("pointercancel", stop);
      panelWidthState.setResizing(false);
    };

    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", stop);
    target.addEventListener("pointercancel", stop);
  }

  return (
    <aside
      className={`absolute top-0 right-0 h-full flex z-20 ${
        isResizing ? "" : "transition-[width] duration-200 ease-out"
      }`}
      style={{
        width: collapsed ? PANEL_COLLAPSED_WIDTH : panelWidth,
        background: "var(--md-sys-color-surface-container)",
        borderLeft: "1px solid var(--md-sys-color-outline-variant)",
      }}
    >
      {!collapsed && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize code panel"
          onPointerDown={handleResizePointerDown}
          className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize z-30"
          style={{ touchAction: "none" }}
        />
      )}

      <div className="w-10 h-10 flex items-center justify-center shrink-0">
        <md-icon-button
          onClick={onToggle}
          aria-label={collapsed ? "Expand code panel" : "Collapse code panel"}
        >
          <span className="material-symbols-outlined">
            {collapsed ? "chevron_left" : "chevron_right"}
          </span>
        </md-icon-button>
      </div>

      {!collapsed && (
        <div className="flex flex-col flex-1 min-w-0">
          <div
            className="flex items-center justify-between px-3 py-2"
            style={{
              borderBottom: "1px solid var(--md-sys-color-outline-variant)",
            }}
          >
            <span
              style={{
                font: "var(--md-sys-typescale-label-large-font)",
                color: "var(--md-sys-color-on-surface-variant)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Mermaid
            </span>
            <md-filled-tonal-button
              onClick={handleCopy}
              disabled={!code}
              aria-label={copied ? "Copied!" : "Copy code"}
            >
              <span slot="icon" className="material-symbols-outlined">
                {copied ? "check" : "content_copy"}
              </span>
              {copied ? "Copied!" : "Copy code"}
            </md-filled-tonal-button>
          </div>

          <div className="flex flex-1 min-h-0">
            <div
              ref={gutterRef}
              aria-hidden
              className="overflow-hidden select-none py-3 pl-2 pr-2 text-right shrink-0"
              style={{
                font: "var(--md-sys-typescale-body-medium-font)",
                fontFamily: "var(--md-ref-typeface-mono)",
                color: "var(--md-sys-color-on-surface-variant)",
                borderRight:
                  "1px solid var(--md-sys-color-outline-variant)",
                minWidth: `${gutterDigits + 1}ch`,
              }}
            >
              <pre className="m-0 whitespace-pre">{lineNumbers}</pre>
            </div>
            <textarea
              value={code}
              onChange={(e) => onChange?.(e.target.value)}
              onScroll={(e) => {
                if (gutterRef.current) {
                  gutterRef.current.scrollTop = e.currentTarget.scrollTop;
                }
              }}
              placeholder="No diagram yet — speak or start typing Mermaid…"
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              data-gramm="false"
              className="flex-1 overflow-auto p-3 bg-transparent border-0 outline-none resize-none whitespace-pre"
              style={{
                font: "var(--md-sys-typescale-body-medium-font)",
                fontFamily: "var(--md-ref-typeface-mono)",
                color: "var(--md-sys-color-on-surface)",
              }}
            />
          </div>
        </div>
      )}
    </aside>
  );
}

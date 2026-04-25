"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parseMermaid, renderMermaid } from "@/lib/mermaid";
import DiagramViewport from "@/components/diagram-viewport";
import ViewportControls from "@/components/viewport-controls";
import ExportControls from "@/components/export-controls";
import type { ReactZoomPanPinchRef } from "react-zoom-pan-pinch";

interface DiagramCanvasProps {
  code: string;
  parseError?: string | null;
}

const DEBOUNCE_MS = 50;
const SPINNER_DELAY_MS = 200;
const FIT_PADDING_PX = 32;
const MIN_SCALE = 0.2;
const MAX_SCALE = 8;

function fitToView(ref: ReactZoomPanPinchRef | null) {
  if (!ref) return;
  const wrapper = ref.instance.wrapperComponent;
  const content = ref.instance.contentComponent;
  if (!wrapper || !content) return;

  const intrinsicW = content.offsetWidth;
  const intrinsicH = content.offsetHeight;
  if (!intrinsicW || !intrinsicH) {
    ref.resetTransform(0);
    return;
  }

  const wRect = wrapper.getBoundingClientRect();
  const availW = Math.max(wRect.width - FIT_PADDING_PX * 2, 0);
  const availH = Math.max(wRect.height - FIT_PADDING_PX * 2, 0);

  const fitScale = Math.min(availW / intrinsicW, availH / intrinsicH);
  const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, fitScale));

  const x = (wRect.width - intrinsicW * scale) / 2;
  const y = (wRect.height - intrinsicH * scale) / 2;

  ref.setTransform(x, y, scale, 200);
}

export default function DiagramCanvas({ code, parseError }: DiagramCanvasProps) {
  const [svg, setSvg] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const renderIdRef = useRef(0);
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  const lastFittedSourceRef = useRef<string>("");
  const svgWrapperRef = useRef<HTMLDivElement>(null);

  const getSvgElement = useCallback(
    () => svgWrapperRef.current?.querySelector("svg") ?? null,
    [],
  );

  useEffect(() => {
    if (!code) {
      setSvg("");
      setRenderError(null);
      setLoading(false);
      return;
    }

    const myRenderId = ++renderIdRef.current;
    let cancelled = false;
    let spinnerTimer: ReturnType<typeof setTimeout> | null = null;

    const debounceTimer = setTimeout(async () => {
      spinnerTimer = setTimeout(() => {
        if (!cancelled && renderIdRef.current === myRenderId) {
          setLoading(true);
        }
      }, SPINNER_DELAY_MS);

      const parsed = await parseMermaid(code);
      if (cancelled || renderIdRef.current !== myRenderId) return;

      if (!parsed.ok) {
        setRenderError(parsed.error);
        if (spinnerTimer) clearTimeout(spinnerTimer);
        setLoading(false);
        return;
      }

      const id = `mermaid-${myRenderId}`;
      const rendered = await renderMermaid(id, code);
      if (cancelled || renderIdRef.current !== myRenderId) return;

      if (spinnerTimer) clearTimeout(spinnerTimer);
      setLoading(false);

      if (rendered.ok) {
        setSvg(rendered.svg);
        setRenderError(null);
      } else {
        setRenderError(rendered.error);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(debounceTimer);
      if (spinnerTimer) clearTimeout(spinnerTimer);
    };
  }, [code]);

  // Auto-fit when the rendered source changes from one valid value to another.
  useEffect(() => {
    if (!svg) return;
    if (lastFittedSourceRef.current === code) return;

    const handle = requestAnimationFrame(() => {
      fitToView(transformRef.current);
      lastFittedSourceRef.current = code;
    });
    return () => cancelAnimationFrame(handle);
  }, [svg, code]);

  const handleFit = useCallback(() => {
    fitToView(transformRef.current);
  }, []);

  const showError = parseError ?? renderError;
  const isEmpty = !code;

  return (
    <div className="size-full relative">
      {isEmpty ? (
        <div className="size-full flex flex-col items-center justify-center p-8 gap-4">
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 48,
              color: "var(--md-sys-color-on-surface-variant)",
            }}
            aria-hidden="true"
          >
            auto_awesome
          </span>
          <p
            className="text-center max-w-md"
            style={{
              font: "var(--md-sys-typescale-body-large-font)",
              color: "var(--md-sys-color-on-surface-variant)",
            }}
          >
            Start speaking — describe a diagram or a system you want to visualize.
          </p>
        </div>
      ) : (
        <>
          <DiagramViewport transformRef={transformRef}>
            <div
              ref={svgWrapperRef}
              className="[&_svg]:block"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </DiagramViewport>
          <div className="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-3">
            <ExportControls
              getSvgElement={getSvgElement}
              hasValidRender={!!svg}
            />
            <ViewportControls transformRef={transformRef} onFit={handleFit} />
          </div>
        </>
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="p-4"
            style={{
              background:
                "color-mix(in srgb, var(--md-sys-color-surface-container) 60%, transparent)",
              backdropFilter: "blur(4px)",
              borderRadius: "var(--md-sys-shape-corner-full)",
            }}
          >
            <md-circular-progress indeterminate aria-label="Rendering diagram" />
          </div>
        </div>
      )}

      {showError && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 max-w-xl flex items-center gap-2"
          style={{
            background: "var(--md-sys-color-error-container)",
            color: "var(--md-sys-color-on-error-container)",
            borderRadius: "var(--md-sys-shape-corner-medium)",
            font: "var(--md-sys-typescale-body-medium-font)",
            boxShadow: "var(--md-sys-elevation-level-2)",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            error
          </span>
          Invalid diagram syntax — asking the model to retry
        </div>
      )}
    </div>
  );
}

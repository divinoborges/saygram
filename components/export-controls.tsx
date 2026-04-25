"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import {
  buildExportFilename,
  exportPdf,
  exportPng,
  exportSvg,
  type ExportFormat,
} from "@/lib/diagram-export";
import { toast } from "@/lib/toast";

interface ExportControlsProps {
  getSvgElement: () => SVGSVGElement | null;
  hasValidRender: boolean;
}

interface FormatOption {
  format: ExportFormat;
  label: string;
  icon: string;
}

const FORMATS: ReadonlyArray<FormatOption> = [
  { format: "svg", label: "SVG", icon: "image" },
  { format: "png", label: "PNG", icon: "photo" },
  { format: "pdf", label: "PDF", icon: "picture_as_pdf" },
];

const PDF_TOAST_DELAY_MS = 200;

const FORMAT_LABEL: Record<ExportFormat, string> = {
  svg: "SVG",
  png: "PNG",
  pdf: "PDF",
};

export default function ExportControls({
  getSvgElement,
  hasValidRender,
}: ExportControlsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const itemsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const closeMenu = useCallback((restoreFocus = true) => {
    setMenuOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      const node = containerRef.current;
      if (node && e.target instanceof Node && !node.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const handleKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeMenu(true);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen, closeMenu]);

  useEffect(() => {
    if (!menuOpen) return;
    const id = requestAnimationFrame(() => itemsRef.current[0]?.focus());
    return () => cancelAnimationFrame(id);
  }, [menuOpen]);

  useEffect(() => {
    if (!hasValidRender && menuOpen) setMenuOpen(false);
  }, [hasValidRender, menuOpen]);

  const handleTriggerClick = () => {
    if (!hasValidRender) return;
    setMenuOpen((open) => !open);
  };

  const handleItemKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = (index + 1) % FORMATS.length;
      itemsRef.current[next]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = (index - 1 + FORMATS.length) % FORMATS.length;
      itemsRef.current[prev]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      itemsRef.current[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      itemsRef.current[FORMATS.length - 1]?.focus();
    } else if (e.key === "Tab") {
      setMenuOpen(false);
    }
  };

  const handleFormatActivate = async (format: ExportFormat) => {
    setMenuOpen(false);
    const svg = getSvgElement();
    if (!svg) {
      toast.emit("Render a diagram first.", "warning");
      return;
    }

    const filename = buildExportFilename(format);

    let pdfToastTimer: ReturnType<typeof setTimeout> | null = null;
    if (format === "pdf") {
      pdfToastTimer = setTimeout(() => {
        toast.emit("Preparing PDF…", "info");
      }, PDF_TOAST_DELAY_MS);
    }

    try {
      if (format === "svg") {
        await exportSvg(svg, filename);
      } else if (format === "png") {
        await exportPng(svg, filename);
      } else {
        await exportPdf(svg, filename);
      }
    } catch (err) {
      console.error(`${FORMAT_LABEL[format]} export failed`, err);
      toast.emit(`${FORMAT_LABEL[format]} export failed — try again.`, "error");
    } finally {
      if (pdfToastTimer) clearTimeout(pdfToastTimer);
    }
  };

  const disabled = !hasValidRender;

  const pillStyle: CSSProperties = {
    background: "var(--md-sys-color-surface-container)",
    borderRadius: "var(--md-sys-shape-corner-large)",
    boxShadow: "var(--md-sys-elevation-level-1)",
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-col p-1 gap-1" style={pillStyle}>
        <button
          ref={triggerRef}
          type="button"
          onClick={handleTriggerClick}
          disabled={disabled}
          aria-disabled={disabled}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="Download diagram"
          title={disabled ? "Render a diagram first" : "Download diagram"}
          className="size-10 rounded-full flex items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-40 hover:bg-[color:var(--md-sys-color-on-surface)]/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--md-sys-color-primary)]"
          style={{ color: "var(--md-sys-color-on-surface-variant)" }}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            download
          </span>
        </button>
      </div>

      {menuOpen && (
        <div
          role="menu"
          aria-label="Export format"
          className="absolute right-0 bottom-full mb-2 min-w-[10rem] py-1 flex flex-col"
          style={{
            background: "var(--md-sys-color-surface-container-high)",
            borderRadius: "var(--md-sys-shape-corner-medium)",
            boxShadow: "var(--md-sys-elevation-level-3)",
          }}
        >
          {FORMATS.map((opt, index) => (
            <button
              key={opt.format}
              ref={(el) => {
                itemsRef.current[index] = el;
              }}
              type="button"
              role="menuitem"
              onClick={() => void handleFormatActivate(opt.format)}
              onKeyDown={(e) => handleItemKey(e, index)}
              className="flex items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-[color:var(--md-sys-color-on-surface)]/8 focus-visible:outline-none focus-visible:bg-[color:var(--md-sys-color-on-surface)]/12"
              style={{
                color: "var(--md-sys-color-on-surface)",
                font: "var(--md-sys-typescale-body-medium-font)",
              }}
            >
              <span
                className="material-symbols-outlined"
                aria-hidden="true"
                style={{
                  fontSize: 20,
                  color: "var(--md-sys-color-on-surface-variant)",
                }}
              >
                {opt.icon}
              </span>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

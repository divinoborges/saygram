"use client";

export type ExportFormat = "svg" | "png" | "pdf";

const PNG_DEFAULT_SCALE = 2;
const PNG_MAX_SIDE_PX = 8192;

export function buildExportFilename(
  format: ExportFormat,
  now: Date = new Date(),
): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `diagram-${stamp}.${format}`;
}

export async function exportSvg(
  svg: SVGSVGElement,
  filename: string,
): Promise<void> {
  const clone = cloneSvgForExport(svg);
  const serialized = serializeSvg(clone);
  const blob = new Blob([serialized], {
    type: "image/svg+xml;charset=utf-8",
  });
  triggerDownload(blob, filename);
}

export async function exportPng(
  svg: SVGSVGElement,
  filename: string,
  scale: number = PNG_DEFAULT_SCALE,
): Promise<void> {
  const clone = cloneSvgForExport(svg);
  const { width, height } = readSvgSize(clone);
  const effectiveScale = clampScaleToMaxSide(width, height, scale);
  const targetW = Math.max(1, Math.round(width * effectiveScale));
  const targetH = Math.max(1, Math.round(height * effectiveScale));

  const serialized = serializeSvg(clone);
  const dataUrl =
    "data:image/svg+xml;charset=utf-8," + encodeURIComponent(serialized);

  const image = await loadImage(dataUrl);

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not acquire 2D canvas context for PNG export");
  ctx.drawImage(image, 0, 0, targetW, targetH);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("canvas.toBlob returned null for PNG export");

  triggerDownload(blob, filename);
}

export async function exportPdf(
  svg: SVGSVGElement,
  filename: string,
): Promise<void> {
  const [{ jsPDF }, svg2pdfMod] = await Promise.all([
    import("jspdf"),
    import("svg2pdf.js"),
  ]);
  const svg2pdf =
    (svg2pdfMod as { svg2pdf?: unknown; default?: unknown }).svg2pdf ??
    (svg2pdfMod as { default?: unknown }).default;
  if (typeof svg2pdf !== "function") {
    throw new Error("svg2pdf.js did not export a callable function");
  }

  const clone = cloneSvgForExport(svg);
  const { width, height } = readSvgSize(clone);

  const doc = new jsPDF({
    orientation: width >= height ? "landscape" : "portrait",
    unit: "pt",
    format: [width, height],
    compress: true,
  });

  await (svg2pdf as (
    svg: Element,
    pdf: unknown,
    options?: { width?: number; height?: number; x?: number; y?: number },
  ) => Promise<unknown>)(clone, doc, { width, height, x: 0, y: 0 });

  doc.save(filename);
}

function cloneSvgForExport(svg: SVGSVGElement): SVGSVGElement {
  const clone = svg.cloneNode(true) as SVGSVGElement;

  const { width, height, viewBoxValue } = computeSvgGeometry(svg);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  clone.setAttribute("viewBox", viewBoxValue);
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));

  inlineTextStyles(svg, clone);
  return clone;
}

function computeSvgGeometry(svg: SVGSVGElement): {
  width: number;
  height: number;
  viewBoxValue: string;
} {
  const vb = svg.viewBox?.baseVal;
  if (vb && vb.width > 0 && vb.height > 0) {
    return {
      width: vb.width,
      height: vb.height,
      viewBoxValue: `${vb.x} ${vb.y} ${vb.width} ${vb.height}`,
    };
  }
  let width = 0;
  let height = 0;
  try {
    const bbox = svg.getBBox();
    width = bbox.width;
    height = bbox.height;
  } catch {
    // getBBox can throw if the SVG is detached; fall through.
  }
  if (!width || !height) {
    const rect = svg.getBoundingClientRect();
    width = rect.width || 1;
    height = rect.height || 1;
  }
  return {
    width,
    height,
    viewBoxValue: `0 0 ${width} ${height}`,
  };
}

function readSvgSize(svg: SVGSVGElement): { width: number; height: number } {
  const w = parseFloat(svg.getAttribute("width") ?? "");
  const h = parseFloat(svg.getAttribute("height") ?? "");
  if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
    return { width: w, height: h };
  }
  const vb = svg.viewBox?.baseVal;
  if (vb && vb.width > 0 && vb.height > 0) {
    return { width: vb.width, height: vb.height };
  }
  return { width: 1, height: 1 };
}

function inlineTextStyles(source: SVGSVGElement, target: SVGSVGElement): void {
  const sourceTexts = source.querySelectorAll<SVGElement>("text, tspan");
  const targetTexts = target.querySelectorAll<SVGElement>("text, tspan");
  const props = ["font-family", "font-size", "font-weight", "fill"] as const;

  for (let i = 0; i < sourceTexts.length && i < targetTexts.length; i++) {
    const computed = window.getComputedStyle(sourceTexts[i]);
    const node = targetTexts[i];
    for (const prop of props) {
      const value = computed.getPropertyValue(prop);
      if (value) {
        node.style.setProperty(prop, value);
      }
    }
  }
}

function serializeSvg(svg: SVGSVGElement): string {
  const xml = new XMLSerializer().serializeToString(svg);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
}

function clampScaleToMaxSide(
  width: number,
  height: number,
  scale: number,
): number {
  const longer = Math.max(width, height);
  if (longer * scale <= PNG_MAX_SIDE_PX) return scale;
  return PNG_MAX_SIDE_PX / longer;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error("Failed to load SVG image for rasterization"));
    img.src = src;
  });
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

"use client";

import { type Ref } from "react";
import type { ReactZoomPanPinchRef } from "react-zoom-pan-pinch";

interface ViewportControlsProps {
  transformRef: Ref<ReactZoomPanPinchRef>;
  onFit: () => void;
}

export default function ViewportControls({
  transformRef,
  onFit,
}: ViewportControlsProps) {
  const getRef = () =>
    (transformRef as { current: ReactZoomPanPinchRef | null })?.current ?? null;

  return (
    <div
      className="flex flex-col p-1 gap-1"
      style={{
        background: "var(--md-sys-color-surface-container)",
        borderRadius: "var(--md-sys-shape-corner-large)",
        boxShadow: "var(--md-sys-elevation-level-1)",
      }}
    >
      <md-icon-button
        onClick={() => getRef()?.zoomIn()}
        aria-label="Zoom in"
        title="Zoom in"
      >
        <span className="material-symbols-outlined">add</span>
      </md-icon-button>
      <md-icon-button
        onClick={() => getRef()?.zoomOut()}
        aria-label="Zoom out"
        title="Zoom out"
      >
        <span className="material-symbols-outlined">remove</span>
      </md-icon-button>
      <md-icon-button
        onClick={onFit}
        aria-label="Fit to screen"
        title="Fit to screen"
      >
        <span className="material-symbols-outlined">fit_screen</span>
      </md-icon-button>
    </div>
  );
}

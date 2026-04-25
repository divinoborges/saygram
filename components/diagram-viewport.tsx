"use client";

import {
  TransformWrapper,
  TransformComponent,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";
import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";

const ARROW_PAN_PX = 40;

interface DiagramViewportProps {
  children: ReactNode;
  transformRef: Ref<ReactZoomPanPinchRef>;
}

export default function DiagramViewport({
  children,
  transformRef,
}: DiagramViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.shiftKey) return;
      const ref = (transformRef as { current: ReactZoomPanPinchRef | null })
        ?.current;
      if (!ref) return;

      const { positionX, positionY, scale } = ref.state;
      const raw = e.deltaX !== 0 ? e.deltaX : e.deltaY;
      const dx = -raw;
      ref.setTransform(positionX + dx, positionY, scale, 0);
      e.preventDefault();
      e.stopPropagation();
    };

    node.addEventListener("wheel", handleWheel, {
      passive: false,
      capture: true,
    });
    return () => {
      node.removeEventListener("wheel", handleWheel, { capture: true });
    };
  }, [transformRef]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const ref = (transformRef as { current: ReactZoomPanPinchRef | null })
      ?.current;
    if (!ref) return;

    switch (e.key) {
      case "+":
      case "=":
        ref.zoomIn();
        e.preventDefault();
        break;
      case "-":
      case "_":
        ref.zoomOut();
        e.preventDefault();
        break;
      case "0":
        ref.resetTransform();
        ref.centerView();
        e.preventDefault();
        break;
      case "ArrowLeft":
      case "ArrowRight":
      case "ArrowUp":
      case "ArrowDown": {
        const { positionX, positionY, scale } = ref.state;
        const dx =
          e.key === "ArrowLeft"
            ? ARROW_PAN_PX
            : e.key === "ArrowRight"
              ? -ARROW_PAN_PX
              : 0;
        const dy =
          e.key === "ArrowUp"
            ? ARROW_PAN_PX
            : e.key === "ArrowDown"
              ? -ARROW_PAN_PX
              : 0;
        ref.setTransform(positionX + dx, positionY + dy, scale, 0);
        e.preventDefault();
        break;
      }
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="size-full outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-slate-500"
    >
      <TransformWrapper
        ref={transformRef}
        minScale={0.2}
        maxScale={8}
        initialScale={1}
        centerOnInit
        limitToBounds={false}
        smooth
        wheel={{ step: 0.05 }}
        panning={{ allowLeftClickPan: true, velocityDisabled: false }}
        pinch={{ step: 5 }}
        doubleClick={{ disabled: true }}
      >
        <TransformComponent
          wrapperStyle={{ width: "100%", height: "100%" }}
          wrapperClass="cursor-grab active:cursor-grabbing"
        >
          {children}
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { LabelTemplate } from "@/lib/label/types";
import { LabelPage } from "@/components/preview/LabelRenderer";
import { useDragResize, type DragPatch } from "@/hooks/useDragResize";
import { cn } from "@/lib/utils";

const CORNERS = ["nw", "ne", "sw", "se"] as const;

/** CSS-mm entspricht 96/25.4 Pixel bei Zoom 1. */
const PX_PER_MM = 96 / 25.4;
/** Maximale Vorschauhöhe relativ zur Fensterhöhe, damit hohe Etiketten nicht überlaufen. */
const MAX_HEIGHT_RATIO = 0.7;

function cornerStyle(corner: (typeof CORNERS)[number]): CSSProperties {
  const size = 9;
  const base: CSSProperties = {
    position: "absolute",
    width: size,
    height: size,
    background: "#2563eb",
    border: "1px solid white",
    borderRadius: 2,
  };
  if (corner.includes("n")) base.top = -size / 2;
  else base.bottom = -size / 2;
  if (corner.includes("w")) base.left = -size / 2;
  else base.right = -size / 2;
  base.cursor = corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize";
  return base;
}

export function DesignCanvas({
  template,
  row,
  selectedId,
  onSelect,
  onGestureStart,
  onChange,
}: {
  template: LabelTemplate;
  row: Record<string, string>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Wird beim Anfassen eines Elements oder Griffs aufgerufen, bevor Ziehen/Skalieren beginnt. */
  onGestureStart?: () => void;
  onChange: (id: string, patch: DragPatch) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(3);

  const { widthMm, heightMm } = template;

  // Zoom automatisch so wählen, dass das Etikett die verfügbare Breite füllt
  // (begrenzt durch die Fensterhöhe) - kein Scrollen im Vorschaubereich nötig.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const fit = () => {
      const availW = box.clientWidth - 16; // abzüglich p-2
      const availH = window.innerHeight * MAX_HEIGHT_RATIO;
      const zoomByWidth = availW / (widthMm * PX_PER_MM);
      const zoomByHeight = availH / (heightMm * PX_PER_MM);
      setZoom(Math.max(0.3, Math.min(zoomByWidth, zoomByHeight)));
    };
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    window.addEventListener("resize", fit);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [widthMm, heightMm]);

  const { startMove, startResize } = useDragResize({
    canvasRef,
    widthMm,
    heightMm,
    onChange,
  });

  return (
    // overflow-hidden + min-w-0: die feste Canvas-Breite darf das Seitenlayout nicht aufweiten,
    // sonst könnte der Zoom nie wieder kleiner werden. p-2 lässt Platz für die Resize-Griffe.
    <div ref={boxRef} className="flex w-full min-w-0 justify-center overflow-hidden p-2">
      {/* Layout-Box in der skalierten Größe, damit die Seite nicht durch den transform ungenau umbricht */}
      <div
        style={{
          width: widthMm * PX_PER_MM * zoom,
          height: heightMm * PX_PER_MM * zoom,
        }}
      >
        <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
          <div
            ref={canvasRef}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) onSelect(null);
            }}
            className="shadow-[0_0_0_1px_var(--border),0_2px_12px_rgba(0,0,0,0.12)]"
            style={{
              position: "relative",
              width: `${widthMm}mm`,
              height: `${heightMm}mm`,
            }}
          >
            <LabelPage template={template} row={row} />

            {template.elements.map((el) => (
              <div
                key={el.id}
                onMouseDown={(e) => {
                  onGestureStart?.();
                  onSelect(el.id);
                  startMove(e, el.id, el.xMm, el.yMm, el.widthMm, el.heightMm);
                }}
                className={cn(
                  "absolute cursor-move",
                  // Feste Farben statt Theme-Variablen: das Etikett ist immer weiß, auch im Dark-Mode.
                  selectedId === el.id
                    ? "outline outline-blue-600"
                    : "outline outline-transparent hover:outline-dashed hover:outline-neutral-400"
                )}
                style={{
                  left: `${el.xMm}mm`,
                  top: `${el.yMm}mm`,
                  width: `${el.widthMm}mm`,
                  height: `${el.heightMm}mm`,
                  outlineOffset: -1,
                }}
              >
                {selectedId === el.id &&
                  CORNERS.map((corner) => (
                    <div
                      key={corner}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        onGestureStart?.();
                        onSelect(el.id);
                        startResize(e, el.id, corner, el.xMm, el.yMm, el.widthMm, el.heightMm);
                      }}
                      style={cornerStyle(corner)}
                    />
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useRef, type CSSProperties } from "react";
import type { LabelTemplate } from "@/lib/label/types";
import { LabelPage } from "@/components/preview/LabelRenderer";
import { useDragResize, type DragPatch } from "@/hooks/useDragResize";
import { cn } from "@/lib/utils";

const CORNERS = ["nw", "ne", "sw", "se"] as const;

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
  zoom,
  selectedId,
  onSelect,
  onChange,
}: {
  template: LabelTemplate;
  row: Record<string, string>;
  zoom: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (id: string, patch: DragPatch) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const { startMove, startResize } = useDragResize({
    canvasRef,
    widthMm: template.widthMm,
    heightMm: template.heightMm,
    onChange,
  });

  return (
    <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
      <div
        ref={canvasRef}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onSelect(null);
        }}
        className="shadow-[0_0_0_1px_var(--border)]"
        style={{
          position: "relative",
          width: `${template.widthMm}mm`,
          height: `${template.heightMm}mm`,
        }}
      >
        <LabelPage template={template} row={row} />

        {template.elements.map((el) => (
          <div
            key={el.id}
            onMouseDown={(e) => {
              onSelect(el.id);
              startMove(e, el.id, el.xMm, el.yMm, el.widthMm, el.heightMm);
            }}
            className={cn(
              "absolute cursor-move",
              selectedId === el.id ? "outline outline-primary" : "outline outline-transparent hover:outline-dashed hover:outline-muted-foreground/40"
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
  );
}

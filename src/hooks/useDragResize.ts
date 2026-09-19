import { useCallback, type RefObject } from "react";

type Corner = "nw" | "ne" | "sw" | "se";

interface DragParams {
  elementId: string;
  mode: "move" | "resize";
  corner?: Corner;
  startXMm: number;
  startYMm: number;
  startWidthMm: number;
  startHeightMm: number;
}

export interface DragPatch {
  xMm?: number;
  yMm?: number;
  widthMm?: number;
  heightMm?: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/**
 * Handgebaute Drag/Resize-Logik für den mm-basierten Etiketten-Canvas.
 * Rechnet Maus-Deltas über die tatsächliche gerenderte Canvas-Breite (px) in mm um,
 * damit ein äußerer CSS-Zoom (transform: scale) die Umrechnung nicht verfälscht.
 * Jede Drag-Session bekommt ein frisches Paar von move/up-Handlern, die sich beim
 * mouseup wieder selbst abmelden - kein geteilter Ref-Zustand zwischen Sessions nötig.
 */
export function useDragResize({
  canvasRef,
  widthMm,
  heightMm,
  minSizeMm = 2,
  onChange,
}: {
  canvasRef: RefObject<HTMLDivElement | null>;
  widthMm: number;
  heightMm: number;
  minSizeMm?: number;
  onChange: (id: string, patch: DragPatch) => void;
}) {
  const beginDrag = useCallback(
    (e: React.MouseEvent, params: DragParams) => {
      e.preventDefault();
      e.stopPropagation();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const pxPerMm = rect.width / widthMm;
      const startClientX = e.clientX;
      const startClientY = e.clientY;

      function handleMove(ev: MouseEvent) {
        const dxMm = (ev.clientX - startClientX) / pxPerMm;
        const dyMm = (ev.clientY - startClientY) / pxPerMm;

        if (params.mode === "move") {
          const xMm = clamp(params.startXMm + dxMm, 0, widthMm - params.startWidthMm);
          const yMm = clamp(params.startYMm + dyMm, 0, heightMm - params.startHeightMm);
          onChange(params.elementId, { xMm, yMm });
          return;
        }

        const corner = params.corner!;
        let x = params.startXMm;
        let y = params.startYMm;
        let w = params.startWidthMm;
        let h = params.startHeightMm;

        if (corner.includes("e")) {
          w = clamp(params.startWidthMm + dxMm, minSizeMm, widthMm - params.startXMm);
        }
        if (corner.includes("s")) {
          h = clamp(params.startHeightMm + dyMm, minSizeMm, heightMm - params.startYMm);
        }
        if (corner.includes("w")) {
          const newW = clamp(
            params.startWidthMm - dxMm,
            minSizeMm,
            params.startXMm + params.startWidthMm
          );
          x = params.startXMm + params.startWidthMm - newW;
          w = newW;
        }
        if (corner.includes("n")) {
          const newH = clamp(
            params.startHeightMm - dyMm,
            minSizeMm,
            params.startYMm + params.startHeightMm
          );
          y = params.startYMm + params.startHeightMm - newH;
          h = newH;
        }
        onChange(params.elementId, { xMm: x, yMm: y, widthMm: w, heightMm: h });
      }

      function handleUp() {
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
      }

      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
    },
    [canvasRef, widthMm, heightMm, minSizeMm, onChange]
  );

  const startMove = useCallback(
    (e: React.MouseEvent, elementId: string, xMm: number, yMm: number, wMm: number, hMm: number) =>
      beginDrag(e, {
        elementId,
        mode: "move",
        startXMm: xMm,
        startYMm: yMm,
        startWidthMm: wMm,
        startHeightMm: hMm,
      }),
    [beginDrag]
  );

  const startResize = useCallback(
    (
      e: React.MouseEvent,
      elementId: string,
      corner: Corner,
      xMm: number,
      yMm: number,
      wMm: number,
      hMm: number
    ) =>
      beginDrag(e, {
        elementId,
        mode: "resize",
        corner,
        startXMm: xMm,
        startYMm: yMm,
        startWidthMm: wMm,
        startHeightMm: hMm,
      }),
    [beginDrag]
  );

  return { startMove, startResize };
}

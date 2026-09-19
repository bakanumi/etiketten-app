"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type {
  HorizontalAlign,
  LabelElement,
  LabelTemplate,
  QrErrorCorrection,
  VerticalAlign,
} from "@/lib/label/types";
import { resolveTemplate } from "@/lib/label/template";
import { FONT_REGISTRY } from "@/lib/label/fonts";
import { qrDataUri } from "@/lib/label/qr";

function hAlignToJustify(align: HorizontalAlign): CSSProperties["justifyContent"] {
  if (align === "left") return "flex-start";
  if (align === "right") return "flex-end";
  return "center";
}

function vAlignToItems(align: VerticalAlign): CSSProperties["alignItems"] {
  if (align === "top") return "flex-start";
  if (align === "bottom") return "flex-end";
  return "center";
}

/** Rendert ein einzelnes Etikett (Design-Canvas-Hintergrund, Druck-View und Live-Vorschau nutzen alle diese Komponente). */
export function LabelPage({
  template,
  row,
  className,
}: {
  template: LabelTemplate;
  row: Record<string, string>;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: `${template.widthMm}mm`,
        height: `${template.heightMm}mm`,
        background: "#fff",
        overflow: "hidden",
      }}
    >
      {template.elements.map((el) => (
        <LabelElementView key={el.id} element={el} row={row} />
      ))}
    </div>
  );
}

function LabelElementView({ element, row }: { element: LabelElement; row: Record<string, string> }) {
  const padding = element.paddingMm ?? 0;
  const boxStyle: CSSProperties = {
    position: "absolute",
    left: `${element.xMm}mm`,
    top: `${element.yMm}mm`,
    width: `${element.widthMm}mm`,
    height: `${element.heightMm}mm`,
    padding: `${padding}mm`,
    boxSizing: "border-box",
    display: "flex",
  };

  if (element.type === "text") {
    const text = resolveTemplate(element.template, row);
    const font = FONT_REGISTRY[element.fontFamily];
    return (
      <div
        style={{
          ...boxStyle,
          justifyContent: hAlignToJustify(element.align),
          alignItems: vAlignToItems(element.verticalAlign),
        }}
      >
        <div
          style={{
            fontFamily: font.cssFamily,
            fontSize: `${element.fontSizePt}pt`,
            fontWeight: element.bold ? 700 : 400,
            lineHeight: element.lineHeight ?? 1.15,
            whiteSpace: "pre-wrap",
            textAlign: element.align,
            color: "#000",
            width: "100%",
          }}
        >
          {text}
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...boxStyle, justifyContent: "center", alignItems: "center" }}>
      <QrImage
        value={resolveTemplate(element.template, row)}
        errorCorrectionLevel={element.errorCorrectionLevel}
      />
    </div>
  );
}

function QrImage({
  value,
  errorCorrectionLevel,
}: {
  value: string;
  errorCorrectionLevel?: QrErrorCorrection;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    qrDataUri(value, errorCorrectionLevel).then((uri) => {
      if (active) setSrc(uri);
    });
    return () => {
      active = false;
    };
  }, [value, errorCorrectionLevel]);

  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- data: URI, next/image bringt hier keinen Vorteil
    <img
      src={src}
      alt=""
      style={{ width: "100%", height: "100%", objectFit: "contain" }}
    />
  );
}

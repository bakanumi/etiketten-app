import { Document, Page, View, Text, Svg, Path } from "@react-pdf/renderer";
import type {
  HorizontalAlign,
  LabelTemplate,
  ParsedData,
  VerticalAlign,
} from "@/lib/label/types";
import { mm2pt } from "@/lib/label/units";
import { resolveTemplate } from "@/lib/label/template";
import { FONT_REGISTRY } from "@/lib/label/fonts";
import { qrVector } from "@/lib/label/qr";

function hAlignToJustify(align: HorizontalAlign) {
  if (align === "left") return "flex-start";
  if (align === "right") return "flex-end";
  return "center";
}

function vAlignToItems(align: VerticalAlign) {
  if (align === "top") return "flex-start";
  if (align === "bottom") return "flex-end";
  return "center";
}

export function LabelPdfDocument({
  template,
  rows,
}: {
  template: LabelTemplate;
  rows: ParsedData["rows"];
}) {
  return (
    <Document>
      {rows.map((row, ri) => (
        // wrap={false}: jedes Etikett ist genau eine Seite. Ohne das bricht react-pdf Elemente, die nicht
        // (ganz) auf die Seite passen, auf Folgeseiten um - bei absolut positionierten Elementen außerhalb
        // des Etiketts endet das in einer Endlosschleife (100 % CPU, dann Speicher voll), bei Elementen am
        // Rand entstehen zusätzliche Seiten.
        // Nebenwirkung von wrap={false}: die Seitenhöhe richtet sich dann nach dem Inhalt im normalen Fluss
        // statt nach `size` - bei rein absolut positionierten Elementen wäre sie 0 (Viewer zeigen dann A4).
        // Der unsichtbare Platzhalter unten hält die Seite auf der Etikettengröße.
        <Page
          key={ri}
          size={[mm2pt(template.widthMm), mm2pt(template.heightMm)]}
          style={{ padding: 0 }}
          wrap={false}
        >
          <View
            wrap={false}
            style={{ width: mm2pt(template.widthMm), height: mm2pt(template.heightMm) }}
          />
          {template.elements.map((el) => {
            const padding = mm2pt(el.paddingMm ?? 0);
            const boxStyle = {
              position: "absolute" as const,
              left: mm2pt(el.xMm),
              top: mm2pt(el.yMm),
              width: mm2pt(el.widthMm),
              height: mm2pt(el.heightMm),
              padding,
              display: "flex" as const,
            };

            if (el.type === "text") {
              const font = FONT_REGISTRY[el.fontFamily];
              return (
                <View
                  key={el.id}
                  wrap={false}
                  style={{
                    ...boxStyle,
                    justifyContent: hAlignToJustify(el.align),
                    alignItems: vAlignToItems(el.verticalAlign),
                  }}
                >
                  <Text
                    wrap={false}
                    style={{
                      fontFamily: font.pdfFamily,
                      fontWeight: el.bold ? "bold" : "normal",
                      fontSize: el.fontSizePt,
                      lineHeight: el.lineHeight ?? 1.15,
                      textAlign: el.align,
                      width: "100%",
                    }}
                  >
                    {resolveTemplate(el.template, row)}
                  </Text>
                </View>
              );
            }

            // Vektor-QR: gleiche Module wie in Vorschau/Druck, aber ohne Bitmap (schnell, klein, scharf).
            const qr = qrVector(resolveTemplate(el.template, row), el.errorCorrectionLevel);
            // QR-Code bleibt quadratisch: größte Seitenlänge, die in die Box (abzüglich Rand) passt, zentriert.
            const qrSidePt = mm2pt(
              Math.max(0, Math.min(el.widthMm, el.heightMm) - 2 * (el.paddingMm ?? 0))
            );
            return (
              <View
                key={el.id}
                wrap={false}
                style={{ ...boxStyle, justifyContent: "center", alignItems: "center" }}
              >
                {qr && (
                  <Svg viewBox={`0 0 ${qr.size} ${qr.size}`} width={qrSidePt} height={qrSidePt}>
                    <Path d={qr.path} fill="#000000" />
                  </Svg>
                )}
              </View>
            );
          })}
        </Page>
      ))}
    </Document>
  );
}

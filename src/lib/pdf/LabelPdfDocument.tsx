import { Document, Page, View, Text, Svg, Path } from "@react-pdf/renderer";
import type { LabelTemplate, ParsedData, VerticalAlign } from "@/lib/label/types";
import { mm2pt } from "@/lib/label/units";
import { resolveTemplate } from "@/lib/label/template";
import { FONT_REGISTRY } from "@/lib/label/fonts";
import { qrVector } from "@/lib/label/qr";

/**
 * Höhe des unsichtbaren Text-Containers in pt (ca. 2 m). react-pdf zeichnet Text nur, wenn er in die Höhe
 * seines Containers passt - ist der Text höher als die Box (z. B. 20 pt in einer 5 mm hohen Box), wird er
 * sonst komplett weggelassen, während die Vorschau ihn überstehen lässt. Der Container ist deshalb viel
 * höher als jeder sinnvolle Text und wird so an der Box ausgerichtet, dass sich dieselbe vertikale
 * Ausrichtung ergibt wie im Browser.
 */
const TEXT_CONTAINER_PT = 6000;

function verticalJustify(align: VerticalAlign) {
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

            if (el.type === "text") {
              const font = FONT_REGISTRY[el.fontFamily];
              // Inhaltsfläche der Box (abzüglich Rand) - wie der gepolsterte Innenbereich in der Vorschau.
              const contentLeft = mm2pt(el.xMm) + padding;
              const contentWidth = Math.max(0, mm2pt(el.widthMm) - 2 * padding);
              const contentTop = mm2pt(el.yMm) + padding;
              const contentHeight = Math.max(0, mm2pt(el.heightMm) - 2 * padding);
              const top =
                el.verticalAlign === "top"
                  ? contentTop
                  : el.verticalAlign === "bottom"
                    ? contentTop + contentHeight - TEXT_CONTAINER_PT
                    : contentTop + contentHeight / 2 - TEXT_CONTAINER_PT / 2;
              return (
                <View
                  key={el.id}
                  wrap={false}
                  style={{
                    position: "absolute",
                    left: contentLeft,
                    top,
                    width: contentWidth,
                    height: TEXT_CONTAINER_PT,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: verticalJustify(el.verticalAlign),
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
                style={{
                  position: "absolute",
                  left: mm2pt(el.xMm),
                  top: mm2pt(el.yMm),
                  width: mm2pt(el.widthMm),
                  height: mm2pt(el.heightMm),
                  padding,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
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

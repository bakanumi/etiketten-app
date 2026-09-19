import { Document, Page, View, Text, Image } from "@react-pdf/renderer";
import type {
  HorizontalAlign,
  LabelTemplate,
  ParsedData,
  VerticalAlign,
} from "@/lib/label/types";
import { mm2pt } from "@/lib/label/units";
import { resolveTemplate } from "@/lib/label/template";
import { FONT_REGISTRY } from "@/lib/label/fonts";

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

/** qrDataUris-Key für Zeile+Element: `${rowIndex}-${elementId}`. */
export function LabelPdfDocument({
  template,
  rows,
  qrDataUris,
}: {
  template: LabelTemplate;
  rows: ParsedData["rows"];
  qrDataUris: Record<string, string>;
}) {
  return (
    <Document>
      {rows.map((row, ri) => (
        <Page
          key={ri}
          size={[mm2pt(template.widthMm), mm2pt(template.heightMm)]}
          style={{ padding: 0 }}
        >
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
                  style={{
                    ...boxStyle,
                    justifyContent: hAlignToJustify(el.align),
                    alignItems: vAlignToItems(el.verticalAlign),
                  }}
                >
                  <Text
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

            const src = qrDataUris[`${ri}-${el.id}`];
            return (
              <View
                key={el.id}
                style={{ ...boxStyle, justifyContent: "center", alignItems: "center" }}
              >
                {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, kein DOM-<img> */}
                {src && <Image src={src} style={{ width: "100%", height: "100%" }} />}
              </View>
            );
          })}
        </Page>
      ))}
    </Document>
  );
}

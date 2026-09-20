import { renderToBuffer } from "@react-pdf/renderer";
import { LabelPdfDocument } from "@/lib/pdf/LabelPdfDocument";
import { registerLabelFonts } from "@/lib/pdf/registerFonts";
import type { LabelTemplate, ParsedData } from "@/lib/label/types";

/** Unter dem nginx-Timeout bleiben, damit der Browser eine klare Meldung statt "504" bekommt. */
export const RENDER_TIMEOUT_MS = 50_000;

export class PdfTimeoutError extends Error {
  constructor() {
    super("PDF-Erstellung hat das Zeitlimit überschritten");
  }
}

/** Erzeugt das Etiketten-PDF mit Zeitlimit und protokolliert die Dauer (sichtbar via journalctl). */
export async function renderLabelPdf(
  template: LabelTemplate,
  rows: ParsedData["rows"]
): Promise<Buffer> {
  registerLabelFonts();

  const started = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const buffer = await Promise.race([
      // Als Funktion aufgerufen (wie beim Rechnungs-PDF im Werkstatt Manager): liefert direkt das Document-Element.
      renderToBuffer(LabelPdfDocument({ template, rows })),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new PdfTimeoutError()), RENDER_TIMEOUT_MS);
      }),
    ]);
    console.log(`PDF: ${rows.length} Etiketten in ${Date.now() - started} ms (${buffer.length} Bytes)`);
    return buffer;
  } finally {
    clearTimeout(timer);
  }
}

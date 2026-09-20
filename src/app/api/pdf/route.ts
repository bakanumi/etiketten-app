import { NextResponse } from "next/server";
import { PdfTimeoutError, renderLabelPdf } from "@/lib/pdf/renderLabelPdf";
import { sampleRow } from "@/lib/label/template";
import type { LabelTemplate, ParsedData } from "@/lib/label/types";

export const runtime = "nodejs";

/** Obergrenze pro Export, damit ein einzelner Request den Server nicht dauerhaft auslastet. */
const MAX_LABELS = 2000;

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  let body: { template?: LabelTemplate; data?: ParsedData };
  try {
    body = await req.json();
  } catch {
    return error("Ungültige Anfrage", 400);
  }

  const { template, data } = body;
  if (
    !template ||
    !Array.isArray(template.elements) ||
    !(template.widthMm > 0) ||
    !(template.heightMm > 0) ||
    !data ||
    !Array.isArray(data.rows) ||
    !Array.isArray(data.columns)
  ) {
    return error("Ungültige Etikettendaten", 400);
  }

  const rows = data.rows.length > 0 ? data.rows : [sampleRow(data.columns)];
  if (rows.length > MAX_LABELS) {
    return error(`Zu viele Etiketten (${rows.length}). Maximal ${MAX_LABELS} pro PDF.`, 413);
  }

  try {
    const buffer = await renderLabelPdf(template, rows);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="etiketten.pdf"',
      },
    });
  } catch (err) {
    if (err instanceof PdfTimeoutError) {
      console.error(`PDF-Erstellung abgebrochen (Zeitlimit, ${rows.length} Etiketten)`);
      return error(
        "Die PDF-Erstellung dauert zu lange. Bitte weniger Etiketten auf einmal erzeugen.",
        504
      );
    }
    console.error("PDF-Erstellung fehlgeschlagen", err);
    return error("PDF konnte nicht erstellt werden", 500);
  }
}

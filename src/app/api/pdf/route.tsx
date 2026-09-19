import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { registerLabelFonts } from "@/lib/pdf/registerFonts";
import { LabelPdfDocument } from "@/lib/pdf/LabelPdfDocument";
import { qrDataUri } from "@/lib/label/qr";
import { resolveTemplate, sampleRow } from "@/lib/label/template";
import type { LabelTemplate, ParsedData } from "@/lib/label/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json()) as { template: LabelTemplate; data: ParsedData };
  const { template, data } = body;

  if (!template || template.widthMm <= 0 || template.heightMm <= 0) {
    return NextResponse.json({ error: "Ungültige Etikettengröße" }, { status: 400 });
  }

  registerLabelFonts();

  const rows = data.rows.length > 0 ? data.rows : [sampleRow(data.columns)];

  const qrDataUris: Record<string, string> = {};
  for (let ri = 0; ri < rows.length; ri++) {
    for (const el of template.elements) {
      if (el.type !== "qr") continue;
      const value = resolveTemplate(el.template, rows[ri]);
      qrDataUris[`${ri}-${el.id}`] = await qrDataUri(value, el.errorCorrectionLevel);
    }
  }

  const buffer = await renderToBuffer(
    <LabelPdfDocument template={template} rows={rows} qrDataUris={qrDataUris} />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="etiketten.pdf"',
    },
  });
}

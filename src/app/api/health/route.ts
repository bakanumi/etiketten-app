import { promises as fs, constants } from "fs";
import os from "os";
import path from "path";
import { NextResponse } from "next/server";
import { FONT_REGISTRY } from "@/lib/label/fonts";
import { DATA_DIR } from "@/lib/server/templateStore";
import { renderLabelPdf } from "@/lib/pdf/renderLabelPdf";
import type { LabelTemplate } from "@/lib/label/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MB = 1024 * 1024;

const SAMPLE_TEMPLATE: LabelTemplate = {
  widthMm: 40,
  heightMm: 22,
  elements: [
    {
      id: "t",
      type: "text",
      xMm: 1,
      yMm: 1,
      widthMm: 25,
      heightMm: 10,
      paddingMm: 1,
      template: "{{Spalte 1}}",
      fontFamily: "arial",
      fontSizePt: 12,
      align: "left",
      verticalAlign: "top",
    },
    {
      id: "q",
      type: "qr",
      xMm: 26,
      yMm: 5,
      widthMm: 12,
      heightMm: 12,
      paddingMm: 0,
      template: "{{Spalte 1}}",
    },
  ],
};

async function isWritable(target: string): Promise<boolean> {
  try {
    await fs.access(target, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/** Diagnose für den Server-Betrieb: Umgebung, Schriften, Speicherordner und ein Test-PDF mit Zeitmessung. */
export async function GET() {
  const fontFiles = [
    ...new Set(
      Object.values(FONT_REGISTRY).flatMap((f) => [f.regular, f.bold]).filter((f): f is string => !!f)
    ),
  ];
  const missingFonts: string[] = [];
  for (const file of fontFiles) {
    try {
      await fs.access(path.join(process.cwd(), "public", file), constants.R_OK);
    } catch {
      missingFonts.push(file);
    }
  }

  const dataDirExists = await fs.stat(DATA_DIR).then(() => true, () => false);
  const dataDirWritable = await isWritable(dataDirExists ? DATA_DIR : path.dirname(DATA_DIR));

  let pdfTest: { ok: boolean; ms: number; bytes?: number; error?: string };
  const started = Date.now();
  try {
    const buffer = await renderLabelPdf(SAMPLE_TEMPLATE, [{ "Spalte 1": "Testetikett" }]);
    pdfTest = { ok: true, ms: Date.now() - started, bytes: buffer.length };
  } catch (err) {
    pdfTest = { ok: false, ms: Date.now() - started, error: err instanceof Error ? err.message : String(err) };
  }

  return NextResponse.json(
    {
      node: process.version,
      platform: `${process.platform}/${process.arch}`,
      cpuCount: os.cpus().length,
      loadAverage: os.loadavg().map((n) => Math.round(n * 100) / 100),
      memoryMB: {
        total: Math.round(os.totalmem() / MB),
        free: Math.round(os.freemem() / MB),
        appRss: Math.round(process.memoryUsage().rss / MB),
      },
      appUptimeSeconds: Math.round(process.uptime()),
      workingDirectory: process.cwd(),
      fonts: { checked: fontFiles.length, missing: missingFonts },
      dataDir: { path: DATA_DIR, exists: dataDirExists, writable: dataDirWritable },
      pdfTest,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

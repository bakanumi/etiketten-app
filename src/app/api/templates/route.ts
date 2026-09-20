import { NextResponse } from "next/server";
import { deleteTemplate, listTemplates, saveTemplate } from "@/lib/server/templateStore";
import type { LabelTemplate } from "@/lib/label/types";
import type { ParseOptions } from "@/lib/parse/parseInput";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_NAME_LENGTH = 80;
const MAX_ELEMENTS = 200;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isValidTemplate(v: unknown): v is LabelTemplate {
  if (!isObject(v)) return false;
  const { widthMm, heightMm, elements } = v;
  return (
    typeof widthMm === "number" &&
    typeof heightMm === "number" &&
    Number.isFinite(widthMm) &&
    Number.isFinite(heightMm) &&
    widthMm > 0 &&
    heightMm > 0 &&
    Array.isArray(elements) &&
    elements.length <= MAX_ELEMENTS &&
    elements.every(
      (el) => isObject(el) && typeof el.id === "string" && (el.type === "text" || el.type === "qr")
    )
  );
}

function isValidOptions(v: unknown): v is ParseOptions {
  return (
    isObject(v) &&
    typeof v.hasHeader === "boolean" &&
    (v.mode === "perRow" || v.mode === "single") &&
    ["auto", ",", ";", "\t", "none"].includes(v.delimiter as string)
  );
}

export async function GET() {
  try {
    return NextResponse.json(await listTemplates());
  } catch (err) {
    console.error("Vorlagen konnten nicht gelesen werden", err);
    return NextResponse.json({ error: "Vorlagen konnten nicht gelesen werden" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  if (!isObject(body)) return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > MAX_NAME_LENGTH) {
    return NextResponse.json(
      { error: `Name erforderlich (max. ${MAX_NAME_LENGTH} Zeichen)` },
      { status: 400 }
    );
  }
  if (!isValidTemplate(body.template) || !isValidOptions(body.options)) {
    return NextResponse.json({ error: "Ungültige Vorlage" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : undefined;

  try {
    return NextResponse.json(
      await saveTemplate({ id, name, template: body.template, options: body.options })
    );
  } catch (err) {
    console.error("Vorlage konnte nicht gespeichert werden", err);
    return NextResponse.json({ error: "Vorlage konnte nicht gespeichert werden" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });

  try {
    const removed = await deleteTemplate(id);
    return removed
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "Vorlage nicht gefunden" }, { status: 404 });
  } catch (err) {
    console.error("Vorlage konnte nicht gelöscht werden", err);
    return NextResponse.json({ error: "Vorlage konnte nicht gelöscht werden" }, { status: 500 });
  }
}

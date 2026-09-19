import Papa from "papaparse";
import type { ParsedData } from "@/lib/label/types";

/**
 * Parst CSV oder einfache Textlisten. Eine reine Textliste (eine Zeile = ein Eintrag)
 * ist der Sonderfall "1 Spalte" und braucht keinen eigenen Code-Pfad, da PapaParse ohne
 * konsistenten Trenner automatisch pro Zeile ein einzelnes Feld liefert.
 */
export function parseInput(raw: string, hasHeader: boolean): ParsedData {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { columns: [], rows: [] };
  }

  const result = Papa.parse<string[]>(trimmed, {
    delimitersToGuess: [",", ";", "\t", "|"],
    skipEmptyLines: true,
  });

  const allRows = result.data.filter((r) => r.length > 0);
  if (allRows.length === 0) {
    return { columns: [], rows: [] };
  }

  const columnCount = Math.max(...allRows.map((r) => r.length));
  const columns = hasHeader
    ? padColumns(allRows[0], columnCount)
    : Array.from({ length: columnCount }, (_, i) => `Spalte ${i + 1}`);

  const dataRows = hasHeader ? allRows.slice(1) : allRows;

  return {
    columns,
    rows: dataRows.map((r) => Object.fromEntries(columns.map((c, i) => [c, r[i] ?? ""]))),
  };
}

function padColumns(row: string[], count: number): string[] {
  const padded = [...row];
  for (let i = padded.length; i < count; i++) {
    padded.push(`Spalte ${i + 1}`);
  }
  return padded.map((c, i) => c.trim() || `Spalte ${i + 1}`);
}

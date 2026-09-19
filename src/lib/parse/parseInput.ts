import Papa from "papaparse";
import type { ParsedData } from "@/lib/label/types";

/** Wie die Eingabe in Etiketten übersetzt wird. */
export type LabelMode =
  /** Jede Eingabezeile ergibt ein eigenes Etikett. */
  | "perRow"
  /** Die gesamte Eingabe ergibt genau ein Etikett. */
  | "single";

export type DelimiterSetting = "auto" | "," | ";" | "\t" | "none";

export interface ParseOptions {
  /** Erste Zeile enthält Spaltennamen (nur im Modus "perRow"). */
  hasHeader: boolean;
  delimiter: DelimiterSetting;
  mode: LabelMode;
}

export const DEFAULT_PARSE_OPTIONS: ParseOptions = {
  hasHeader: false,
  delimiter: "auto",
  mode: "perRow",
};

/**
 * Parst CSV oder einfache Textlisten.
 *
 * - Modus "perRow": jede Zeile = ein Etikett, getrennte Werte einer Zeile = Spalten
 *   (auf dem Etikett z. B. als einzelne Textzeilen über den Platzhalter {{*}}).
 * - Modus "single": alle Werte der Eingabe landen auf einem Etikett, benannt "Zeile 1", "Zeile 2", ...
 */
export function parseInput(raw: string, options: ParseOptions = DEFAULT_PARSE_OPTIONS): ParsedData {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { columns: [], rows: [] };
  }

  const allRows = splitRows(trimmed, options.delimiter);
  if (allRows.length === 0) {
    return { columns: [], rows: [] };
  }

  if (options.mode === "single") {
    const cells = allRows.flat().map((c) => c.trim()).filter((c) => c !== "");
    if (cells.length === 0) return { columns: [], rows: [] };
    const columns = cells.map((_, i) => `Zeile ${i + 1}`);
    return { columns, rows: [Object.fromEntries(columns.map((c, i) => [c, cells[i]]))] };
  }

  const columnCount = Math.max(...allRows.map((r) => r.length));
  const columns = options.hasHeader
    ? padColumns(allRows[0], columnCount)
    : Array.from({ length: columnCount }, (_, i) => `Spalte ${i + 1}`);

  const dataRows = options.hasHeader ? allRows.slice(1) : allRows;

  return {
    columns,
    rows: dataRows.map((r) => Object.fromEntries(columns.map((c, i) => [c, r[i]?.trim() ?? ""]))),
  };
}

function splitRows(text: string, delimiter: DelimiterSetting): string[][] {
  if (delimiter === "none") {
    return text
      .split(/\r?\n/)
      .filter((line) => line.trim() !== "")
      .map((line) => [line]);
  }

  const result = Papa.parse<string[]>(text, {
    ...(delimiter === "auto" ? { delimitersToGuess: [",", ";", "\t", "|"] } : { delimiter }),
    skipEmptyLines: true,
  });
  return result.data.filter((r) => r.length > 0);
}

function padColumns(row: string[], count: number): string[] {
  const padded = [...row];
  for (let i = padded.length; i < count; i++) {
    padded.push(`Spalte ${i + 1}`);
  }
  return padded.map((c, i) => c.trim() || `Spalte ${i + 1}`);
}

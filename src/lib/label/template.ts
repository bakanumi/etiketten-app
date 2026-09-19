/** Ersetzt "{{Spaltenname}}"-Platzhalter in einer Vorlage mit den Werten einer Datenzeile. */
export function resolveTemplate(template: string, row: Record<string, string>): string {
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, key: string) => row[key] ?? "");
}

/** Beispielzeile für die Vorschau, solange keine echten Daten importiert wurden. */
export function sampleRow(columns: string[]): Record<string, string> {
  if (columns.length === 0) {
    return { "Spalte 1": "Beispieltext" };
  }
  return Object.fromEntries(columns.map((c, i) => [c, `Wert ${i + 1}`]));
}

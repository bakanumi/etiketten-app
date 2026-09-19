/** Spezialplatzhalter: alle Spalten der Datenzeile, je Wert eine Zeile. */
export const ALL_COLUMNS_TOKEN = "{{*}}";

/**
 * Ersetzt "{{Spaltenname}}"-Platzhalter in einer Vorlage mit den Werten einer Datenzeile.
 * "{{*}}" wird durch alle nicht-leeren Werte der Zeile ersetzt, jeweils in einer eigenen Zeile.
 */
export function resolveTemplate(template: string, row: Record<string, string>): string {
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, key: string) => {
    if (key === "*") {
      return Object.values(row)
        .filter((v) => v !== "")
        .join("\n");
    }
    return row[key] ?? "";
  });
}

/** Platzhalter einer Vorlage, die in den Daten keine passende Spalte haben. */
export function unknownPlaceholders(template: string, columns: string[]): string[] {
  const unknown = new Set<string>();
  for (const match of template.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)) {
    const key = match[1];
    if (key !== "*" && !columns.includes(key)) unknown.add(key);
  }
  return [...unknown];
}

/** Beispielzeile für die Vorschau, solange keine echten Daten importiert wurden. */
export function sampleRow(columns: string[]): Record<string, string> {
  if (columns.length === 0) {
    return { "Spalte 1": "Beispieltext" };
  }
  return Object.fromEntries(columns.map((c, i) => [c, `Wert ${i + 1}`]));
}

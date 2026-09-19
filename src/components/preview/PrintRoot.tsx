"use client";

import type { LabelTemplate, ParsedData } from "@/lib/label/types";
import { sampleRow } from "@/lib/label/template";
import { LabelPage } from "./LabelRenderer";

/**
 * Rendert alle Datenzeilen als eigene Druckseiten, dauerhaft gemountet und nur über
 * print.css sichtbar gemacht - so gibt es keine Render-Race mit dem Öffnen des
 * Druckdialogs. Ohne importierte Daten wird eine Beispielzeile gedruckt (Testdruck).
 */
export function PrintRoot({ template, data }: { template: LabelTemplate; data: ParsedData }) {
  const rows = data.rows.length > 0 ? data.rows : [sampleRow(data.columns)];

  return (
    <div id="print-root" aria-hidden>
      <style>{`@page { size: ${template.widthMm}mm ${template.heightMm}mm; margin: 0; }`}</style>
      {rows.map((row, i) => (
        <LabelPage key={i} template={template} row={row} className="label-page" />
      ))}
    </div>
  );
}

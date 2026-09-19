/** Umrechnung mm -> PDF-Punkte (1 Punkt = 1/72 Zoll, 1 Zoll = 25.4 mm). */
export function mm2pt(mm: number): number {
  return mm * (72 / 25.4);
}

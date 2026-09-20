import QRCode from "qrcode";
import type { QrErrorCorrection } from "./types";

/** QR-Code als Vektorgrafik: quadratische Modulzahl plus SVG-Pfad (1 Einheit = 1 Modul). */
export interface QrVector {
  size: number;
  path: string;
}

/**
 * Berechnet den QR-Code als SVG-Pfad. Läuft identisch im Browser (Vorschau/Druck) und in Node
 * (PDF-Export). Vektor statt Bitmap: gestochen scharf bei jeder Druckauflösung, winzige PDFs und
 * kein aufwendiges Dekodieren von Bildern pro Etikett. Liefert null, wenn der Inhalt nicht in
 * einen QR-Code passt (zu lang).
 */
export function qrVector(text: string, errorCorrectionLevel: QrErrorCorrection = "M"): QrVector | null {
  try {
    const { modules } = QRCode.create(text || " ", { errorCorrectionLevel });
    const size = modules.size;
    let path = "";
    for (let y = 0; y < size; y++) {
      let x = 0;
      while (x < size) {
        if (!modules.get(y, x)) {
          x++;
          continue;
        }
        // Waagerechte Folge dunkler Module zu einem Rechteck zusammenfassen.
        const start = x;
        while (x < size && modules.get(y, x)) x++;
        path += `M${start} ${y}h${x - start}v1h-${x - start}z`;
      }
    }
    return { size, path };
  } catch {
    return null;
  }
}

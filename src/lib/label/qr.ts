import QRCode from "qrcode";
import type { QrErrorCorrection } from "./types";

/** Erzeugt eine QR-Code-PNG-Data-URI. Läuft identisch im Browser und in Node (PDF-Route). */
export function qrDataUri(text: string, errorCorrectionLevel: QrErrorCorrection = "M"): Promise<string> {
  return QRCode.toDataURL(text || " ", {
    margin: 0,
    errorCorrectionLevel,
    type: "image/png",
    // Hohe Auflösung, damit die Module beim Drucken/PDF scharf bleiben (sonst 1 px pro Modul, hochskaliert).
    width: 800,
  });
}

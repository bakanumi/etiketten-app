import { Font } from "@react-pdf/renderer";
import path from "path";
import { FONT_REGISTRY } from "@/lib/label/fonts";

let registered = false;

/** Registriert alle Etiketten-Fonts bei react-pdf. Nur serverseitig (Node-Runtime) ausführen. */
export function registerLabelFonts() {
  if (registered) return;
  registered = true;
  for (const font of Object.values(FONT_REGISTRY)) {
    if (!font.regular || !font.bold) continue; // eingebaute Standardschrift (z.B. Helvetica)
    Font.register({
      family: font.pdfFamily,
      fonts: [
        { src: path.join(process.cwd(), "public", font.regular), fontWeight: "normal" },
        { src: path.join(process.cwd(), "public", font.bold), fontWeight: "bold" },
      ],
    });
  }
}

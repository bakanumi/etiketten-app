import { Font } from "@react-pdf/renderer";
import path from "path";
import { FONT_REGISTRY } from "@/lib/label/fonts";

let registered = false;

/** Registriert alle Etiketten-Fonts bei react-pdf. Nur serverseitig (Node-Runtime) ausführen. */
export function registerLabelFonts() {
  if (registered) return;
  registered = true;
  for (const font of Object.values(FONT_REGISTRY)) {
    Font.register({
      family: font.cssFamily,
      fonts: [
        { src: path.join(process.cwd(), "public", font.regular), fontWeight: "normal" },
        { src: path.join(process.cwd(), "public", font.bold), fontWeight: "bold" },
      ],
    });
  }
}

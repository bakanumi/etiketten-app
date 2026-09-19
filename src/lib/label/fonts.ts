import type { FontId } from "./types";

export interface FontDefinition {
  label: string;
  /** CSS font-family für Browser-Vorschau und Druck. */
  cssFamily: string;
  /** Font-Family im PDF (react-pdf): registrierter Name oder eingebaute Standardschrift. */
  pdfFamily: string;
  /** Pfade relativ zu /public, ohne führenden Slash. Fehlt bei eingebauten Schriften. */
  regular?: string;
  bold?: string;
}

export const FONT_REGISTRY: Record<FontId, FontDefinition> = {
  // Arial im Browser (Windows-Druck-PC), Helvetica im PDF - beide haben identische Zeichenbreiten.
  arial: {
    label: "Arial (Standard)",
    cssFamily: 'Arial, "Liberation Sans", Helvetica, sans-serif',
    pdfFamily: "Helvetica",
  },
  "fira-sans": {
    label: "Fira Sans (klar, universell)",
    cssFamily: "FiraSansLabel",
    pdfFamily: "FiraSansLabel",
    regular: "fonts/FiraSans-Regular.ttf",
    bold: "fonts/FiraSans-Bold.ttf",
  },
  "ibm-plex-sans-condensed": {
    label: "IBM Plex Sans Condensed (schmal)",
    cssFamily: "IBMPlexSansCondensedLabel",
    pdfFamily: "IBMPlexSansCondensedLabel",
    regular: "fonts/IBMPlexSansCondensed-Regular.ttf",
    bold: "fonts/IBMPlexSansCondensed-Bold.ttf",
  },
  "ibm-plex-mono": {
    label: "IBM Plex Mono (Codes/Seriennummern)",
    cssFamily: "IBMPlexMonoLabel",
    pdfFamily: "IBMPlexMonoLabel",
    regular: "fonts/IBMPlexMono-Regular.ttf",
    bold: "fonts/IBMPlexMono-Bold.ttf",
  },
  "barlow-condensed": {
    label: "Barlow Condensed (alternativ schmal)",
    cssFamily: "BarlowCondensedLabel",
    pdfFamily: "BarlowCondensedLabel",
    regular: "fonts/BarlowCondensed-Regular.ttf",
    bold: "fonts/BarlowCondensed-Bold.ttf",
  },
};

export const FONT_OPTIONS: { id: FontId; label: string }[] = (
  Object.entries(FONT_REGISTRY) as [FontId, FontDefinition][]
).map(([id, def]) => ({ id, label: def.label }));

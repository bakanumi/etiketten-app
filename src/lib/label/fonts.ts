import type { FontId } from "./types";

export interface FontDefinition {
  label: string;
  /** Gemeinsamer Family-Name, verwendet in @font-face (Browser) UND Font.register (PDF). */
  cssFamily: string;
  /** Pfade relativ zu /public, ohne führenden Slash. */
  regular: string;
  bold: string;
}

export const FONT_REGISTRY: Record<FontId, FontDefinition> = {
  "fira-sans": {
    label: "Fira Sans (klar, universell)",
    cssFamily: "FiraSansLabel",
    regular: "fonts/FiraSans-Regular.ttf",
    bold: "fonts/FiraSans-Bold.ttf",
  },
  "ibm-plex-sans-condensed": {
    label: "IBM Plex Sans Condensed (schmal)",
    cssFamily: "IBMPlexSansCondensedLabel",
    regular: "fonts/IBMPlexSansCondensed-Regular.ttf",
    bold: "fonts/IBMPlexSansCondensed-Bold.ttf",
  },
  "ibm-plex-mono": {
    label: "IBM Plex Mono (Codes/Seriennummern)",
    cssFamily: "IBMPlexMonoLabel",
    regular: "fonts/IBMPlexMono-Regular.ttf",
    bold: "fonts/IBMPlexMono-Bold.ttf",
  },
  "barlow-condensed": {
    label: "Barlow Condensed (alternativ schmal)",
    cssFamily: "BarlowCondensedLabel",
    regular: "fonts/BarlowCondensed-Regular.ttf",
    bold: "fonts/BarlowCondensed-Bold.ttf",
  },
};

export const FONT_OPTIONS: { id: FontId; label: string }[] = (
  Object.entries(FONT_REGISTRY) as [FontId, FontDefinition][]
).map(([id, def]) => ({ id, label: def.label }));

export interface LabelSizePreset {
  label: string;
  widthMm: number;
  heightMm: number;
}

/** Gängige Zebra-Etikettenformate, orientiert an verbreiteten Rollengrößen. */
export const LABEL_SIZE_PRESETS: LabelSizePreset[] = [
  { label: "25 × 15 mm", widthMm: 25, heightMm: 15 },
  { label: "32 × 25 mm", widthMm: 32, heightMm: 25 },
  { label: "51 × 25 mm", widthMm: 51, heightMm: 25 },
  { label: "57 × 32 mm", widthMm: 57, heightMm: 32 },
  { label: "76 × 25 mm", widthMm: 76, heightMm: 25 },
  { label: "89 × 36 mm", widthMm: 89, heightMm: 36 },
  { label: "102 × 150 mm", widthMm: 102, heightMm: 150 },
];

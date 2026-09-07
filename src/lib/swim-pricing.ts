// AQA Swim Pricing Table (sourced directly from tarifs.astro)
// Standard Western Arabic numerals only. No emojis.

export type SwimCategory = "homme" | "femme" | "enfants" | "apnea";
export type SwimFrequency = "1x" | "2x" | "3x";
export type SwimDuration = "1m" | "3m" | "6m" | "9m";

export const SWIM_PRICING_TABLE: Record<
  string,
  Record<string, Record<string, Record<string, number>>>
> = {
  adults: {
    "1x": {
      G10:     { "1m": 7800,  "3m": 21900,  "6m": 43500,  "9m": 65200  },
      MAX5:    { "1m": 9900,  "3m": 28500,  "6m": 56100,  "9m": 84400  },
      INDIVID: { "1m": 19900, "3m": 58800,  "6m": 115000, "9m": 170000 },
    },
    "2x": {
      "2G10":    { "1m": 14500, "3m": 41600,  "6m": 82500,  "9m": 124500 },
      "2MAX5":   { "1m": 17900, "3m": 51200,  "6m": 102000, "9m": 149000 },
      "G10MAX5": { "1m": 16200, "3m": 46400,  "6m": 82900,  "9m": 139000 },
      "G10+IND": { "1m": 25200, "3m": 73000,  "6m": 141500, "9m": 210500 },
      "MAX+IND": { "1m": 26900, "3m": 77900,  "6m": 151200, "9m": 223700 },
      "2INDIVID":{ "1m": 35900, "3m": 105000, "6m": 199000, "9m": 295000 },
    },
    "3x": {
      "3G10":        { "1m": 19700, "3m": 57500,  "6m": 105000, "9m": 153000 },
      "3MAX5":       { "1m": 25500, "3m": 74400,  "6m": 135000, "9m": 199000 },
      "2G10MAX":     { "1m": 21900, "3m": 61200,  "6m": 115000, "9m": 173000 },
      "G10/2MAX":    { "1m": 23900, "3m": 67500,  "6m": 130500, "9m": 196000 },
      "2G10+IND":    { "1m": 30700, "3m": 83400,  "6m": 159600, "9m": 239700 },
      "G10/MAX/IND": { "1m": 32900, "3m": 84500,  "6m": 162000, "9m": 245000 },
      "2MAX+IND":    { "1m": 35100, "3m": 95400,  "6m": 182500, "9m": 274100 },
      "2IND/G10":    { "1m": 42100, "3m": 125000, "6m": 245000, "9m": 365000 },
      "2IND/MAX":    { "1m": 44300, "3m": 135000, "6m": 265000, "9m": 395000 },
      "3INDIVID":    { "1m": 52000, "3m": 149000, "6m": 297000, "9m": 449000 },
    },
  },
};

export const KIDS_PRICING: Record<string, { priceDA: number; label: string; duration: string }> = {
  Decouverte: { priceDA: 28700, label: "Decouverte (Trimestre - 3 Mois)", duration: "3m" },
  Recommande: { priceDA: 46500, label: "Recommande (Semestre - 6 Mois)", duration: "6m" },
  Economique: { priceDA: 65800, label: "Economique (Annuel - 9 Mois)", duration: "9m" },
};

export const APNEA_PRICING: Record<string, { priceDA: number; label: string }> = {
  Initiale:       { priceDA: 10500, label: "Formation Initiale (avec palmes)" },
  Renouvellement: { priceDA: 7300,  label: "Renouvellement (sans equipement)" },
};

export function calculateSwimPrice(
  category: SwimCategory,
  formula: string,
  duration: SwimDuration = "3m",
  frequency: SwimFrequency = "1x"
): number {
  if (category === "enfants") {
    return KIDS_PRICING[formula]?.priceDA ?? 28700;
  }
  if (category === "apnea") {
    return APNEA_PRICING[formula]?.priceDA ?? 10500;
  }
  const freqTable = SWIM_PRICING_TABLE.adults[frequency];
  if (freqTable && freqTable[formula] && freqTable[formula][duration]) {
    return freqTable[formula][duration];
  }
  return 0;
}

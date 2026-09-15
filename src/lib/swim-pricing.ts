// AQA Swim Official Pricing & Card Model (2026/2027 Season)
// Strictly Western Arabic numerals (0-9). No emojis.
// Direct port of official pricing matrices from aqasports.pro (tarifs.astro & pricing-data.ts)

export type AdultCategory = "homme" | "femme";
export type SwimCategory = AdultCategory | "enfants" | "apnea" | string;
export type DurationCode = "1m" | "3m" | "6m" | "9m";
export type FrequencyCode = 1 | 2 | 3;
export type SwimDuration = "1m" | "3m" | "6m" | "9m" | string;
export type SwimFrequency = "1x" | "2x" | "3x" | 1 | 2 | 3 | string;

// ─── Official Price Matrices ──────────────────────────────────────────────────

export const ADULT_PRICES: Record<
  FrequencyCode,
  Record<string, Partial<Record<DurationCode, number>>>
> = {
  1: {
    G10: {
      "1m": 7800,
      "3m": 21900,
      "6m": 43500,
      "9m": 65200,
    },
    MAX5: {
      "1m": 9900,
      "3m": 28500,
      "6m": 56100,
      "9m": 84400,
    },
    INDIVID: {
      "1m": 19900,
      "3m": 58800,
      "6m": 115000,
      "9m": 170000,
    },
  },
  2: {
    "2x G10": {
      "1m": 14500,
      "3m": 41600,
      "6m": 82500,
      "9m": 124500,
    },
    "2x MAX5": {
      "1m": 17900,
      "3m": 51200,
      "6m": 102000,
      "9m": 149000,
    },
    "G10 + MAX5": {
      "1m": 16200,
      "3m": 46400,
      "6m": 82900,
      "9m": 139000,
    },
    "G10 + INDIVID": {
      "1m": 25200,
      "3m": 73000,
      "6m": 141500,
      "9m": 210500,
    },
    "MAX5 + INDIVID": {
      "1m": 26900,
      "3m": 77900,
      "6m": 151200,
      "9m": 223700,
    },
    "2x INDIVID": {
      "1m": 35900,
      "3m": 105000,
      "6m": 199000,
      "9m": 295000,
    },
  },
  3: {
    "3x G10": {
      "1m": 19700,
      "3m": 57500,
      "6m": 105000,
      "9m": 153000,
    },
    "3x MAX5": {
      "1m": 25500,
      "3m": 74400,
      "6m": 135000,
      "9m": 199000,
    },
    "2x G10 + MAX5": {
      "1m": 21900,
      "3m": 61200,
      "6m": 115000,
      "9m": 173000,
    },
    "G10 + 2x MAX5": {
      "1m": 23900,
      "3m": 67500,
      "6m": 130500,
      "9m": 196000,
    },
    "2x G10 + INDIVID": {
      "1m": 30700,
      "3m": 83400,
      "6m": 159600,
      "9m": 239700,
    },
    "G10 + MAX5 + INDIVID": {
      "1m": 32900,
      "3m": 84500,
      "6m": 162000,
      "9m": 245000,
    },
    "2x MAX5 + INDIVID": {
      "1m": 35100,
      "3m": 95400,
      "6m": 182500,
      "9m": 274100,
    },
    "2x INDIVID + G10": {
      "1m": 42100,
      "3m": 125000,
      "6m": 245000,
      "9m": 365000,
    },
    "2x INDIVID + MAX5": {
      "1m": 44300,
      "3m": 135000,
      "6m": 265000,
      "9m": 395000,
    },
    "3x INDIVID": {
      "1m": 52000,
      "3m": 149000,
      "6m": 297000,
      "9m": 449000,
    },
  },
};

export const KIDS_PRICES: Record<string, number> = {
  decouverte: 28700, // 3m
  recommande: 46500, // 6m
  economique: 65800, // 9m
};

export const APNEA_PRICES: Record<string, number> = {
  initiale: 10500,
  renouvellement: 7300,
};

// ─── Price Calculator ─────────────────────────────────────────────────────────

export interface CalculatePriceParams {
  category: string;
  groupType?: string | null;
  duration?: string | null;
  frequency?: number | string | null;
}

export function calculateSwimPrice(params: CalculatePriceParams): number;
export function calculateSwimPrice(
  category: string,
  groupType?: string | null,
  duration?: string | null,
  frequency?: number | string | null
): number;
export function calculateSwimPrice(
  paramOrCategory: CalculatePriceParams | string,
  groupTypeParam?: string | null,
  durationParam?: string | null,
  frequencyParam?: number | string | null
): number {
  let category: string;
  let groupType: string | null | undefined;
  let duration: string | null | undefined;
  let frequency: number | string | null | undefined = 1;

  if (typeof paramOrCategory === "object" && paramOrCategory !== null) {
    category = paramOrCategory.category;
    groupType = paramOrCategory.groupType;
    duration = paramOrCategory.duration;
    frequency = paramOrCategory.frequency;
  } else {
    category = paramOrCategory;
    groupType = groupTypeParam;
    duration = durationParam;
    frequency = frequencyParam;
  }

  let parsedFreq: number = 1;
  if (typeof frequency === "number") {
    parsedFreq = frequency;
  } else if (typeof frequency === "string") {
    parsedFreq = parseInt(frequency.replace(/[^0-9]/g, ""), 10) || 1;
  }

  const normCat = (category || "homme").toLowerCase().trim();
  const normDur = (duration || "3m").toLowerCase().trim() as DurationCode;
  const normFreq = (parsedFreq === 2 || parsedFreq === 3 ? parsedFreq : 1) as FrequencyCode;
  const normType = (groupType || "G10").trim();

  // Kids category
  if (normCat === "enfants") {
    if (normDur === "9m" || normType.toLowerCase().includes("econom")) {
      return KIDS_PRICES.economique;
    }
    if (normDur === "6m" || normType.toLowerCase().includes("recommand")) {
      return KIDS_PRICES.recommande;
    }
    return KIDS_PRICES.decouverte;
  }

  // Apnea category
  if (normCat === "apnea" || normCat === "apnee") {
    if (normType.toLowerCase().includes("renouv")) {
      return APNEA_PRICES.renouvellement;
    }
    return APNEA_PRICES.initiale;
  }

  // Adult categories (Homme / Femme)
  let typeKey = "G10";
  if (/max\s*5/i.test(normType) || normType === "M" || normType === "MAX5") {
    typeKey = "MAX5";
  } else if (/indiv/i.test(normType) || normType === "I") {
    typeKey = "INDIVID";
  }

  // Frequency 1
  if (normFreq === 1) {
    const table = ADULT_PRICES[1][typeKey];
    if (table && table[normDur] !== undefined) {
      return table[normDur]!;
    }
    return table?.["3m"] ?? 21900;
  }

  // Frequency 2
  if (normFreq === 2) {
    const tableKey = typeKey === "MAX5" ? "2x MAX5" : typeKey === "INDIVID" ? "2x INDIVID" : "2x G10";
    const table = ADULT_PRICES[2][tableKey];
    if (table && table[normDur] !== undefined) {
      return table[normDur]!;
    }
    return table?.["3m"] ?? 41600;
  }

  // Frequency 3
  if (normFreq === 3) {
    const tableKey = typeKey === "MAX5" ? "3x MAX5" : typeKey === "INDIVID" ? "3x INDIVID" : "3x G10";
    const table = ADULT_PRICES[3][tableKey];
    if (table && table[normDur] !== undefined) {
      return table[normDur]!;
    }
    return table?.["3m"] ?? 57500;
  }

  return 21900;
}

// ─── Card Tier Resolution ─────────────────────────────────────────────────────

export interface CardTierInfo {
  tierId: "starter" | "silver" | "gold" | "diamond" | "emerald";
  title: string;
  badge: string;
  frontImage: string;
  backImage: string;
  accentColor: string;
}

/**
 * Returns the card tier and official real image asset based on swimmer duration / formula.
 */
export function getCardTier(
  formula?: string | null,
  duration?: string | null
): CardTierInfo {
  const normFormula = (formula || "").toLowerCase().trim();
  const normDuration = (duration || "3m").toLowerCase().trim();

  // Emerald / VIP special check
  if (normFormula.includes("emerald") || normFormula.includes("vip")) {
    return {
      tierId: "emerald",
      title: "VIP Emerald Pass",
      badge: "VIP SPECIAL",
      frontImage: "/image/card_emerald.png",
      backImage: "/image/back.png",
      accentColor: "#10b981",
    };
  }

  // 1 month -> Starter
  if (normDuration === "1m" || normFormula.includes("starter")) {
    return {
      tierId: "starter",
      title: "Starter Pass",
      badge: "STARTER",
      frontImage: "/image/card_starter.png",
      backImage: "/image/back.png",
      accentColor: "#0ea5e9",
    };
  }

  // 6 months -> Gold
  if (normDuration === "6m" || normFormula.includes("gold") || normFormula.includes("recommand")) {
    return {
      tierId: "gold",
      title: "Gold Pass",
      badge: "GOLD",
      frontImage: "/image/card_gold.png",
      backImage: "/image/back.png",
      accentColor: "#f59e0b",
    };
  }

  // 9 months -> Diamond
  if (normDuration === "9m" || normFormula.includes("diamond") || normFormula.includes("econom")) {
    return {
      tierId: "diamond",
      title: "Diamond Pass",
      badge: "DIAMOND",
      frontImage: "/image/card_diamond.png",
      backImage: "/image/back.png",
      accentColor: "#a855f7",
    };
  }

  // Default: 3 months -> Silver
  return {
    tierId: "silver",
    title: "Silver Pass",
    badge: "SILVER",
    frontImage: "/image/card_silver.png",
    backImage: "/image/back.png",
    accentColor: "#94a3b8",
  };
}

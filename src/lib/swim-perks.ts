/**
 * AQA Swim Premium Formulas & Perks Management Library
 *
 * Manages extra features / deliverables for the three premium formulas:
 * 1. Silver Pass (3m / 3 Mois / Découverte)
 * 2. Gold Pass (6m / 6 Mois / Recommandé)
 * 3. Diamond Pass (9m / 9 Mois / Économique)
 *
 * Starter formula (1m / 1 Mois) is the standard entry formula with month-boundary rules.
 *
 * Strictly Western Arabic numerals (0-9). No emojis anywhere.
 */

export type PremiumTierId = "silver" | "gold" | "diamond";
export type SwimTierId = "starter" | PremiumTierId;

export type PerkDeliveryStatus = "pending" | "in_progress" | "delivered" | "cancelled";

export interface PerkItem {
  id: string;
  title: string;
  description: string;
  status: PerkDeliveryStatus;
  deliveredAt?: string | null; // ISO string
  deliveredBy?: string | null;
  notes?: string | null;
  isCustom?: boolean;
}

export interface PerkProgress {
  total: number;
  delivered: number;
  pending: number;
  inProgress: number;
  cancelled: number;
  percent: number;
  isFullyDelivered: boolean;
}

// ─── Default Perks Catalog ──────────────────────────────────────────────────

export const SILVER_DEFAULT_PERKS: Omit<PerkItem, "status">[] = [
  {
    id: "video_analysis",
    title: "Analyse Vidéo Personnalisée",
    description: "Analyse technique détaillée de votre nage en bassin d'élite.",
  },
];

export const GOLD_DEFAULT_PERKS: Omit<PerkItem, "status">[] = [
  {
    id: "video_analysis",
    title: "Analyse Vidéo Personnalisée",
    description: "Analyse technique détaillée de votre nage en bassin d'élite.",
  },
  {
    id: "arena_pack",
    title: "Pack Équipement Arena Offert",
    description: "Sac, bonnet, serviette et équipement officiel Arena.",
  },
  {
    id: "mobile_app",
    title: "Accès Application Mobile AQA Sports",
    description: "Accès premium à l'application AQA Sports et suivi technique.",
  },
];

export const DIAMOND_DEFAULT_PERKS: Omit<PerkItem, "status">[] = [
  {
    id: "video_analysis",
    title: "Analyse Vidéo Personnalisée",
    description: "Analyse technique détaillée de votre nage en bassin d'élite.",
  },
  {
    id: "arena_pack",
    title: "Pack Équipement Arena Offert",
    description: "Sac, bonnet, serviette et équipement officiel Arena.",
  },
  {
    id: "mobile_app",
    title: "Accès Application Mobile AQA Sports",
    description: "Accès premium à l'application AQA Sports et suivi technique.",
  },
  {
    id: "apnea_month",
    title: "1 Mois d'Initiation à l'Apnée Offert",
    description: "Stage d'initiation et immersion apnée avec nos instructeurs certifiés.",
  },
  {
    id: "guest_passes",
    title: "2 Séances Test pour des Proches",
    description: "2 séances découvertes offertes pour faire tester le bassin à des proches.",
  },
];

// ─── Formula & Tier Resolvers ────────────────────────────────────────────────

/**
 * Returns true if the duration/formula represents the Starter formula (1 month).
 */
export function isStarterTier(
  duration?: string | null,
  formula?: string | null
): boolean {
  const d = (duration || "").toLowerCase().trim();
  const f = (formula || "").toLowerCase().trim();
  return d === "1m" || d.includes("starter") || f.includes("starter");
}

/**
 * Resolves the canonical tier for a swimmer: "starter", "silver", "gold", or "diamond".
 */
export function resolveFormulaTier(
  duration?: string | null,
  formula?: string | null
): SwimTierId {
  const d = (duration || "").toLowerCase().trim();
  const f = (formula || "").toLowerCase().trim();

  if (d === "1m" || d.includes("starter") || f.includes("starter")) {
    return "starter";
  }
  if (d === "9m" || f.includes("diamond") || f.includes("econom")) {
    return "diamond";
  }
  if (d === "6m" || f.includes("gold") || f.includes("recommand")) {
    return "gold";
  }
  return "silver";
}

/**
 * Returns true if the member is in one of the three premium formulas (Silver, Gold, Diamond).
 */
export function isPremiumFormula(
  duration?: string | null,
  formula?: string | null
): boolean {
  const tier = resolveFormulaTier(duration, formula);
  return tier === "silver" || tier === "gold" || tier === "diamond";
}

/**
 * Returns the default template perks for a given tier.
 */
export function getDefaultPerksForTier(tier: SwimTierId): PerkItem[] {
  if (tier === "diamond") {
    return DIAMOND_DEFAULT_PERKS.map((p) => ({ ...p, status: "pending" as const }));
  }
  if (tier === "gold") {
    return GOLD_DEFAULT_PERKS.map((p) => ({ ...p, status: "pending" as const }));
  }
  if (tier === "silver") {
    return SILVER_DEFAULT_PERKS.map((p) => ({ ...p, status: "pending" as const }));
  }
  return [];
}

// ─── Notes Tag Parsing & Encoding ───────────────────────────────────────────

const PERKS_TAG_REGEX = /\[PERKS:([A-Za-z0-9+/=_-]+)\]/;
const PERKS_TAG_GLOBAL_REGEX = /\[PERKS:[A-Za-z0-9+/=_-]+\]/g;

/**
 * Parses perks stored in member notes. Merges with default perks for the member's tier,
 * preserving any custom perks and updated delivery states.
 */
export function parsePerksFromNotes(
  notes?: string | null,
  member?: { duration?: string | null; formula?: string | null }
): PerkItem[] {
  const tier = resolveFormulaTier(member?.duration, member?.formula);
  const defaultPerks = getDefaultPerksForTier(tier);

  if (!notes || !notes.includes("[PERKS:")) {
    return defaultPerks;
  }

  const match = notes.match(PERKS_TAG_REGEX);
  if (!match || !match[1]) {
    return defaultPerks;
  }

  try {
    const rawJson = Buffer.from(match[1], "base64").toString("utf8");
    const storedMap: Record<string, Partial<PerkItem>> = JSON.parse(rawJson);

    if (typeof storedMap !== "object" || storedMap === null) {
      return defaultPerks;
    }

    // Merge default perks with stored overrides
    const result: PerkItem[] = defaultPerks.map((def) => {
      const stored = storedMap[def.id];
      if (stored) {
        return {
          ...def,
          status: stored.status || "pending",
          deliveredAt: stored.deliveredAt || null,
          deliveredBy: stored.deliveredBy || null,
          notes: stored.notes || null,
        };
      }
      return def;
    });

    // Append custom perks that are not part of default tier catalog
    Object.entries(storedMap).forEach(([id, item]) => {
      const isAlreadyInDefaults = defaultPerks.some((d) => d.id === id);
      if (!isAlreadyInDefaults && item && typeof item === "object") {
        result.push({
          id,
          title: item.title || "Avantage Complémentaire",
          description: item.description || "",
          status: item.status || "pending",
          deliveredAt: item.deliveredAt || null,
          deliveredBy: item.deliveredBy || null,
          notes: item.notes || null,
          isCustom: true,
        });
      }
    });

    return result;
  } catch {
    return defaultPerks;
  }
}

/**
 * Encodes perks list into the member's notes using the [PERKS:<base64>] tag.
 * Preserves other tags like [DEBT:...], [POOLPAID:...], and genuine user text.
 */
export function encodePerksInNotes(
  currentNotes: string | null | undefined,
  perks: PerkItem[]
): string {
  const raw = currentNotes ?? "";
  const cleaned = raw.replace(PERKS_TAG_GLOBAL_REGEX, "").trim().replace(/\s{2,}/g, " ");

  const payload: Record<string, Partial<PerkItem>> = {};
  perks.forEach((p) => {
    payload[p.id] = {
      id: p.id,
      title: p.title,
      description: p.description,
      status: p.status,
      deliveredAt: p.deliveredAt || null,
      deliveredBy: p.deliveredBy || null,
      notes: p.notes || null,
      isCustom: p.isCustom || false,
    };
  });

  const b64 = Buffer.from(JSON.stringify(payload)).toString("base64");
  const tag = `[PERKS:${b64}]`;

  if (cleaned.length > 0) {
    return `${tag} ${cleaned}`;
  }
  return tag;
}

/**
 * Removes the [PERKS:...] tag from notes.
 */
export function removePerksFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const cleaned = notes.replace(PERKS_TAG_GLOBAL_REGEX, "").trim().replace(/\s{2,}/g, " ");
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Strips all internal metadata tags (DEBT, POOLPAID, GROUPS, PERKS) to display
 * only pure user-facing notes.
 */
export function cleanMemberDisplayNotes(notes: string | null | undefined): string {
  if (!notes) return "";
  return notes
    .replace(/\[GROUPS:[^\]]*\]/g, "")
    .replace(/\[POOLPAID(?::[^\]]*)?\]/g, "")
    .replace(/\[DEBT(?::[^\]]*)?\]/g, "")
    .replace(PERKS_TAG_GLOBAL_REGEX, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Calculates delivery progress metrics for a list of perks.
 */
export function computePerksProgress(perks: PerkItem[]): PerkProgress {
  const total = perks.length;
  if (total === 0) {
    return {
      total: 0,
      delivered: 0,
      pending: 0,
      inProgress: 0,
      cancelled: 0,
      percent: 100,
      isFullyDelivered: true,
    };
  }

  const delivered = perks.filter((p) => p.status === "delivered").length;
  const pending = perks.filter((p) => p.status === "pending").length;
  const inProgress = perks.filter((p) => p.status === "in_progress").length;
  const cancelled = perks.filter((p) => p.status === "cancelled").length;

  // Cancelled items do not count against completion
  const effectiveTotal = Math.max(1, total - cancelled);
  const percent = Math.round((delivered / effectiveTotal) * 100);

  return {
    total,
    delivered,
    pending,
    inProgress,
    cancelled,
    percent: Math.min(100, percent),
    isFullyDelivered: delivered >= effectiveTotal,
  };
}

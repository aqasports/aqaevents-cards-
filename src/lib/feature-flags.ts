import { prisma } from "@/lib/prisma";

// ─── Registry ─────────────────────────────────────────────────────────────────
// Add one entry here to expose a new flag in the admin UI and via getFlag().
// No bespoke route or UI section is needed — the flags API and settings page
// read this registry automatically.

export interface FlagDefinition {
  key: string;
  description: string;
  default: boolean;
}

export const FLAG_REGISTRY: FlagDefinition[] = [
  {
    key: "feature_org_portal",
    description:
      "Enable organisation self-service portal (Phase 7 dark rollout). Clients belonging to an organisation will see a read-only credits summary page.",
    default: false,
  },
  {
    key: "feature_ai_tooling",
    description:
      "Enable AI-assisted suggestions in the admin UI (Phase 8). Surfaces recommended actions on the client detail page.",
    default: false,
  },
  {
    key: "feature_ad_tooling",
    description:
      "Enable advertising campaign tooling (Phase 9). Adds a Campaigns tab for targeted promo pushes.",
    default: false,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a Set of all registry keys for O(1) membership checks. */
const REGISTRY_KEYS = new Set(FLAG_REGISTRY.map((f) => f.key));

function parseBoolean(raw: string): boolean {
  return raw.trim().toLowerCase() === "true";
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Read a feature flag from PlatformSetting.
 *
 * - Returns `defaultValue` when the key is not in FLAG_REGISTRY.
 * - Returns `defaultValue` when no PlatformSetting row exists for the key.
 * - Otherwise parses the stored string ("true" | "false") and returns the result.
 */
export async function getFlag(key: string, defaultValue = false): Promise<boolean> {
  if (!REGISTRY_KEYS.has(key)) {
    return defaultValue;
  }

  try {
    const setting = await prisma.platformSetting.findUnique({
      where: { key },
    });

    if (setting?.value !== undefined && setting.value !== null) {
      return parseBoolean(setting.value);
    }
  } catch (err) {
    console.error(`[feature-flags] Failed to read flag "${key}":`, err);
  }

  return defaultValue;
}

/**
 * Persist a feature flag to PlatformSetting.
 * Silently ignores keys that are not in FLAG_REGISTRY (no upsert performed).
 */
export async function setFlag(key: string, value: boolean): Promise<void> {
  if (!REGISTRY_KEYS.has(key)) {
    console.warn(`[feature-flags] Attempted to set unknown flag "${key}". Ignoring.`);
    return;
  }

  await prisma.platformSetting.upsert({
    where: { key },
    create: { key, value: String(value) },
    update: { value: String(value) },
  });
}

// AQA Swim Groups Domain Utilities
// Production-grade helpers for group naming, types, time slots, and solid tracking.
// Standard Western Arabic numerals only. No emojis.

export type SwimGroupType = "G10" | "MAX5" | "indiv";

export const SWIM_GROUP_TYPES: readonly SwimGroupType[] = ["G10", "MAX5", "indiv"] as const;

export const SWIM_GROUP_DEFAULT_CAPACITIES: Record<SwimGroupType, number> = {
  G10: 10,
  MAX5: 5,
  indiv: 1,
};

export const FRENCH_DAYS = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
] as const;

export const DEFAULT_SWIM_LOCATIONS = [
  "Bassin Olympique",
  "Piscine Kouba",
  "Bassin 25m",
  "Piscine El Biar",
  "Piscine 1er Mai",
] as const;

export const SWIM_TIME_SLOTS = [
  "06:00",
  "06:30",
  "07:00",
  "07:30",
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
  "22:00",
] as const;

// ─── Swimmer Level Constants ──────────────────────────────────────────────────

export const SWIM_LEVELS = ["new_aqa", "old_aqa"] as const;
export type SwimLevel = (typeof SWIM_LEVELS)[number];

export const SWIM_LEVEL_LABELS: Record<string, string> = {
  new_aqa: "New AQA Member",
  old_aqa: "Old AQA Member",
  // Legacy values - backward compatible display
  beginner: "New AQA Member",
  intermediate: "Old AQA Member",
  advanced: "Old AQA Member",
};

/**
 * Returns a human-readable label for a swim level value.
 * Handles both new values (new_aqa, old_aqa) and legacy values
 * (beginner, intermediate, advanced) for backward compatibility.
 */
export function getSwimLevelLabel(level: string): string {
  return SWIM_LEVEL_LABELS[level] ?? level;
}

/**
 * Determines whether a swimmer level belongs to an "old member".
 * Platform rule: only old members ("old_aqa", "intermediate", "advanced")
 * are authorized to view group tables and cohort member names.
 */
export function isOldSwimMember(level: string | null | undefined): boolean {
  if (!level) return false;
  const l = level.toLowerCase().trim();
  return l === "old_aqa" || l === "intermediate" || l === "advanced";
}

// ─── Group Name Generation ────────────────────────────────────────────────────

/**
 * Generates group name according to specification:
 * (first three letters of french day name)
 * (space)
 * (time)
 * (space)
 * (7 first letters from coach name)
 * (space)
 * (4 first letters from loc name)
 *
 * Example: Lundi + 18:00 + Karim Benali + Bassin Olympique -> "Lun 18:00 Karim B Bass"
 */
export function generateSwimGroupName(
  day?: string | null,
  time?: string | null,
  coachName?: string | null,
  locationName?: string | null
): string {
  const dayPart = day ? day.trim().slice(0, 3) : "";
  const timePart = time ? time.trim() : "";
  const coachPart = coachName ? coachName.trim().slice(0, 7) : "";
  const locPart = locationName ? locationName.trim().slice(0, 4) : "";

  return [dayPart, timePart, coachPart, locPart].filter(Boolean).join(" ");
}

// ─── Solid Group Encoding ─────────────────────────────────────────────────────

const SOLID_TAG = "[SOLID]";

export function encodeSolidNotes(notes: string | null | undefined, isSolid: boolean): string | null {
  const raw = notes ?? "";
  const cleaned = raw.replace(SOLID_TAG, "").trim();
  if (isSolid) {
    return cleaned ? `${SOLID_TAG} ${cleaned}` : SOLID_TAG;
  }
  return cleaned.length > 0 ? cleaned : null;
}

export function decodeSolidNotes(notes: string | null | undefined): { isSolid: boolean; cleanNotes: string } {
  if (!notes) {
    return { isSolid: false, cleanNotes: "" };
  }
  const isSolid = notes.includes(SOLID_TAG);
  const cleanNotes = notes.replace(SOLID_TAG, "").trim();
  return { isSolid, cleanNotes };
}

// ─── Multi-Group Member Encoding ──────────────────────────────────────────────

const GROUPS_REGEX = /\[GROUPS:([^\]]+)\]/;

/**
 * Encodes an array of assigned group IDs into the member's notes field.
 * Safely preserves any other tags (such as [SOLID] or text notes).
 */
export function encodeMemberGroupIds(notes: string | null | undefined, groupIds: string[]): string | null {
  const raw = notes ?? "";
  const cleaned = raw.replace(GROUPS_REGEX, "").trim();
  const validIds = Array.from(new Set(groupIds.filter(Boolean)));

  if (validIds.length === 0) {
    return cleaned.length > 0 ? cleaned : null;
  }

  const tag = `[GROUPS:${validIds.join(",")}]`;
  if (cleaned.length > 0) {
    return `${tag} ${cleaned}`;
  }
  return tag;
}

/**
 * Decodes all assigned group IDs for a member from their notes field and primary groupId.
 * Returns a unique ordered list of group IDs.
 */
export function decodeMemberGroupIds(notes: string | null | undefined, primaryGroupId?: string | null): string[] {
  const result: string[] = [];
  if (primaryGroupId && primaryGroupId.trim()) {
    result.push(primaryGroupId.trim());
  }

  if (notes) {
    const match = notes.match(GROUPS_REGEX);
    if (match && match[1]) {
      const parsedIds = match[1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      for (const id of parsedIds) {
        if (!result.includes(id)) {
          result.push(id);
        }
      }
    }
  }

  return result;
}


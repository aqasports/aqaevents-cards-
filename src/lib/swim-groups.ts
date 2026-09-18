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

/**
 * Generates a dual-slot group name for kids (enfants) groups that meet on two
 * different days per week.
 *
 * Format: "Sam 18:00+Mer 18:00 CoachNa Loca"
 * Example: Samedi 18:00 + Mercredi 18:00 + Karim Benali + Bassin Olympique
 *          -> "Sam 18:00+Mer 18:00 Karim B Bass"
 */
export function generateKidsGroupName(
  day1?: string | null,
  time1?: string | null,
  day2?: string | null,
  time2?: string | null,
  coachName?: string | null,
  locationName?: string | null
): string {
  const d1 = day1 ? day1.trim().slice(0, 3) : "";
  const t1 = time1 ? time1.trim() : "";
  const d2 = day2 ? day2.trim().slice(0, 3) : "";
  const t2 = time2 ? time2.trim() : "";
  const coachPart = coachName ? coachName.trim().slice(0, 7) : "";
  const locPart = locationName ? locationName.trim().slice(0, 4) : "";

  const slot1 = [d1, t1].filter(Boolean).join(" ");
  const slot2 = [d2, t2].filter(Boolean).join(" ");
  const slotPart = slot2 ? `${slot1}+${slot2}` : slot1;

  return [slotPart, coachPart, locPart].filter(Boolean).join(" ");
}

/**
 * Builds a schedule string for storage.
 *
 * Single slot: "Samedi 18:00 · Bassin Olympique"
 * Dual slot:   "Samedi 18:00 + Mercredi 18:00 · Bassin Olympique"
 */
export function buildScheduleString(
  day1: string,
  time1: string,
  locationName: string,
  day2?: string | null,
  time2?: string | null
): string {
  const slot1 = `${day1} ${time1}`;
  if (day2 && time2) {
    return `${slot1} + ${day2} ${time2} · ${locationName}`;
  }
  return `${slot1} · ${locationName}`;
}

/**
 * Parses a schedule string into an array of day/time/location slot objects.
 * Returns 1 slot for standard groups, 2 slots for dual-day kids groups.
 *
 * Supports formats:
 *   "Samedi 18:00 · Bassin Olympique"                    -> 1 slot
 *   "Samedi 18:00 + Mercredi 18:00 · Bassin Olympique"   -> 2 slots
 *   Legacy plain text fallback for older records.
 */
export function parseScheduleSlots(
  schedule: string
): { day: string; time: string; location: string }[] {
  if (!schedule) return [{ day: "", time: "", location: "" }];

  // Extract location (everything after the last middle dot)
  const dotIdx = schedule.lastIndexOf("\u00b7");
  const location = dotIdx !== -1 ? schedule.slice(dotIdx + 1).trim() : "";
  const slotsPart = dotIdx !== -1 ? schedule.slice(0, dotIdx).trim() : schedule;

  function extractDayTime(part: string): { day: string; time: string } {
    let day = "";
    let time = "";
    for (const d of FRENCH_DAYS) {
      if (part.toLowerCase().includes(d.toLowerCase())) {
        day = d;
        break;
      }
    }
    const timeMatch = part.match(/\b([0-2]?[0-9]:[0-5][0-9])\b/);
    if (timeMatch) {
      time = timeMatch[1].padStart(5, "0");
    }
    return { day, time };
  }

  // Check for dual-slot: " + " surrounded by spaces between the two slots
  const plusMatch = slotsPart.match(/^(.+?)\s\+\s(.+)$/);
  if (plusMatch) {
    const slot1 = extractDayTime(plusMatch[1]);
    const slot2 = extractDayTime(plusMatch[2]);
    return [
      { ...slot1, location },
      { ...slot2, location },
    ];
  }

  // Single slot
  const single = extractDayTime(slotsPart);
  return [{ ...single, location }];
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

/**
 * Extracts only the first name (prénom) which is the first word before SPACE for privacy.
 */
export function extractFirstName(fullName?: string | null): string {
  if (!fullName) return "";
  const trimmed = fullName.trim();
  const spaceIdx = trimmed.indexOf(" ");
  if (spaceIdx === -1) return trimmed;
  return trimmed.substring(0, spaceIdx).trim();
}


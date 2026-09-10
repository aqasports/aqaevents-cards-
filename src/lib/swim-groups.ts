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

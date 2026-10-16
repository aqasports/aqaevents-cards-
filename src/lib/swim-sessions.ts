import { prisma } from "@/lib/prisma";
import { parseScheduleSlots, FRENCH_DAYS } from "@/lib/swim-groups";
import { DEFAULT_EXCLUDED_PERIODS } from "@/lib/swim-subscription";

const DAY_NAME_TO_INDEX: Record<string, number> = {
  dimanche: 0,
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
};

/**
 * Checks if a date falls within any excluded period (Ramadan, Eid al-Fitr, Eid al-Adha).
 */
export function isDateExcluded(date: Date): boolean {
  const time = date.getTime();
  for (const period of DEFAULT_EXCLUDED_PERIODS) {
    if (time >= period.start.getTime() && time <= period.end.getTime()) {
      return true;
    }
  }
  return false;
}

/**
 * Normalizes a Date to UTC midnight for consistent database comparison.
 */
export function toMidnightUTC(date: Date): Date {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Computes end time string (HH:MM) given a startTime string (HH:MM) and duration in minutes (default 60).
 */
export function computeEndTime(startTime: string | null | undefined, durationMinutes = 60): string {
  if (!startTime || !startTime.includes(":")) return "19:30";
  const parts = startTime.trim().split(":");
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return "19:30";
  const totalMinutes = h * 60 + m + durationMinutes;
  const endH = Math.floor(totalMinutes / 60) % 24;
  const endM = totalMinutes % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

/**
 * Extracts structured schedule metadata from a group's raw schedule string.
 * Example input: "Samedi 18:30 + Mercredi 18:30 • Azal"
 */
export function extractGroupScheduleMeta(schedule: string | null | undefined): {
  scheduleDays: string[];
  startTime: string;
  endTime: string;
  pool: string;
  slots: Array<{ day: string; time: string; endTime: string; location: string }>;
} {
  const slots = parseScheduleSlots(schedule || "");
  if (slots.length === 0) {
    return {
      scheduleDays: [],
      startTime: "18:00",
      endTime: "19:00",
      pool: "Piscine AQA",
      slots: [],
    };
  }

  const scheduleDays = Array.from(
    new Set(slots.map((s) => s.day).filter((d): d is string => Boolean(d)))
  );
  const firstTime = slots.find((s) => s.time)?.time || "18:00";
  const endTime = computeEndTime(firstTime, 60);
  const firstPool = slots.find((s) => s.location)?.location || "Piscine AQA";

  return {
    scheduleDays,
    startTime: firstTime,
    endTime,
    pool: firstPool,
    slots: slots.map((s) => ({
      day: s.day || "",
      time: s.time || firstTime,
      endTime: computeEndTime(s.time || firstTime, 60),
      location: s.location || firstPool,
    })),
  };
}

/**
 * Materializes sessions for given group IDs within [fromDate, toDate] on-demand.
 * Fully idempotent, skips excluded periods (Ramadan/Eid), and requires zero cron/polling.
 */
export async function ensureSessions(
  groupIds: string[],
  fromDate: Date,
  toDate: Date
): Promise<void> {
  if (groupIds.length === 0) return;

  // Safety cap: max 31 days window per execution to protect compute quota
  const start = toMidnightUTC(fromDate);
  const end = toMidnightUTC(toDate);
  const maxSpanMs = 31 * 24 * 60 * 60 * 1000;
  if (end.getTime() - start.getTime() > maxSpanMs) {
    end.setTime(start.getTime() + maxSpanMs);
  }

  // Fetch groups, current active lead coaches, and all active coaches for legacy coachName fallback
  const [groups, allCoaches, existingSessions] = await Promise.all([
    prisma.swimGroup.findMany({
      where: {
        id: { in: groupIds },
        active: true,
      },
      include: {
        staff: {
          where: { role: "lead", endsOn: null },
          take: 1,
        },
      },
    }),
    prisma.coach.findMany({
      where: { active: true },
      select: { id: true, name: true },
    }),
    prisma.swimSession.findMany({
      where: {
        groupId: { in: groupIds },
        sessionDate: { gte: start, lte: end },
      },
      select: {
        groupId: true,
        sessionDate: true,
        startTime: true,
      },
    }),
  ]);

  const existingKeySet = new Set(
    existingSessions.map(
      (s) => `${s.groupId}|${s.sessionDate.toISOString().split("T")[0]}|${s.startTime}`
    )
  );

  const sessionEntriesToCreate: Array<{
    groupId: string;
    sessionDate: Date;
    startTime: string;
    location: string | null;
    plannedCoachId: string | null;
    actualCoachId: string | null;
    status: string;
  }> = [];

  for (const group of groups) {
    const slots = parseScheduleSlots(group.schedule || "");
    if (slots.length === 0) continue;

    let leadCoachId = group.staff[0]?.coachId || null;
    if (!leadCoachId && group.coachName) {
      const normalizedTarget = group.coachName.trim().toLowerCase();
      const matchedCoach = allCoaches.find((c) => {
        const cName = c.name.trim().toLowerCase();
        return (
          cName === normalizedTarget ||
          cName.startsWith(normalizedTarget) ||
          normalizedTarget.startsWith(cName)
        );
      });
      if (matchedCoach) {
        leadCoachId = matchedCoach.id;
      }
    }

    // Iterate day-by-day from start to end
    const cursor = new Date(start);
    while (cursor <= end) {
      if (!isDateExcluded(cursor)) {
        const dayOfWeek = cursor.getUTCDay();
        const dateKey = cursor.toISOString().split("T")[0];

        for (const slot of slots) {
          if (!slot.day || !slot.time) continue;
          const targetDayIdx = DAY_NAME_TO_INDEX[slot.day.trim().toLowerCase()];
          if (targetDayIdx === dayOfWeek) {
            const compositeKey = `${group.id}|${dateKey}|${slot.time}`;
            if (!existingKeySet.has(compositeKey)) {
              existingKeySet.add(compositeKey);
              sessionEntriesToCreate.push({
                groupId: group.id,
                sessionDate: new Date(cursor),
                startTime: slot.time,
                location: slot.location || null,
                plannedCoachId: leadCoachId,
                actualCoachId: leadCoachId,
                status: "scheduled",
              });
            }
          }
        }
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  for (const entry of sessionEntriesToCreate) {
    await prisma.swimSession.upsert({
      where: {
        groupId_sessionDate_startTime: {
          groupId: entry.groupId,
          sessionDate: entry.sessionDate,
          startTime: entry.startTime,
        },
      },
      create: entry,
      update: {},
    });
  }
}


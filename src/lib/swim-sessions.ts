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

  // Fetch groups and current active lead coaches
  const groups = await prisma.swimGroup.findMany({
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
  });

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

    const leadCoachId = group.staff[0]?.coachId || null;

    // Iterate day-by-day from start to end
    const cursor = new Date(start);
    while (cursor <= end) {
      if (!isDateExcluded(cursor)) {
        const dayOfWeek = cursor.getUTCDay();

        for (const slot of slots) {
          if (!slot.day || !slot.time) continue;
          const targetDayIdx = DAY_NAME_TO_INDEX[slot.day.trim().toLowerCase()];
          if (targetDayIdx === dayOfWeek) {
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

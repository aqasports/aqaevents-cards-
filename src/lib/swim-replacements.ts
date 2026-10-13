import { prisma } from "@/lib/prisma";

export interface ReplacementCandidate {
  coachId: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  isGroupAssistant: boolean;
  hasCategoryExperience: boolean;
  weeklySessionsCount: number;
}

/**
 * Finds eligible substitute coaches for a specific swim session, ranked by best match.
 * Enforces category eligibility (D7), schedule collision checks, and approved absence exclusions.
 */
export async function findReplacementCandidates(
  sessionId: string
): Promise<ReplacementCandidate[]> {
  const session = await prisma.swimSession.findUnique({
    where: { id: sessionId },
    include: {
      group: true,
    },
  });

  if (!session) return [];

  const sessionCategory = session.group.category.toLowerCase().trim();
  const sessionDate = session.sessionDate;
  const sessionStartTime = session.startTime;

  // 1. Fetch all active coaches with an enabled CoachAccount
  const potentialCoaches = await prisma.coach.findMany({
    where: {
      active: true,
      account: {
        loginEnabled: true,
      },
    },
    include: {
      account: true,
      groupAssignments: {
        where: { endsOn: null },
      },
    },
  });

  const candidates: ReplacementCandidate[] = [];

  for (const coach of potentialCoaches) {
    // Cannot replace oneself
    if (
      coach.id === session.actualCoachId ||
      coach.id === session.plannedCoachId
    ) {
      continue;
    }

    // Check category authorization in account.categories (per D7)
    let hasCategoryAccess = true;
    if (coach.account?.categories) {
      try {
        const allowedCats: string[] = JSON.parse(coach.account.categories);
        hasCategoryAccess = allowedCats
          .map((c) => c.toLowerCase().trim())
          .includes(sessionCategory);
      } catch {
        hasCategoryAccess = false;
      }
    }

    if (!hasCategoryAccess) {
      continue;
    }

    // Check absence collision
    const hasAbsence = await prisma.swimCoachAbsence.findFirst({
      where: {
        coachId: coach.id,
        status: "approved",
        startsAt: { lte: sessionDate },
        endsAt: { gte: sessionDate },
      },
    });

    if (hasAbsence) {
      continue;
    }

    // Check session schedule collision (same date + same start time)
    const hasCollision = await prisma.swimSession.findFirst({
      where: {
        actualCoachId: coach.id,
        sessionDate,
        startTime: sessionStartTime,
        status: { in: ["scheduled", "held"] },
        id: { not: session.id },
      },
    });

    if (hasCollision) {
      continue;
    }

    // Check if this coach is an assistant for this exact group
    const isGroupAssistant = coach.groupAssignments.some(
      (a) => a.groupId === session.groupId && a.role === "assistant"
    );

    // Calculate weekly load for balance
    const weekStart = new Date(sessionDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weeklySessionsCount = await prisma.swimSession.count({
      where: {
        actualCoachId: coach.id,
        sessionDate: { gte: weekStart, lte: weekEnd },
        status: { in: ["scheduled", "held"] },
      },
    });

    candidates.push({
      coachId: coach.id,
      name: coach.name,
      email: coach.email,
      phone: coach.phone,
      role: coach.account?.role || "coach",
      isGroupAssistant,
      hasCategoryExperience: true,
      weeklySessionsCount,
    });
  }

  // Sort candidates:
  // 1. Group assistants first
  // 2. Head coach / coach over assistant
  // 3. Lowest weekly load
  return candidates.sort((a, b) => {
    if (a.isGroupAssistant && !b.isGroupAssistant) return -1;
    if (!a.isGroupAssistant && b.isGroupAssistant) return 1;
    return a.weeklySessionsCount - b.weeklySessionsCount;
  });
}

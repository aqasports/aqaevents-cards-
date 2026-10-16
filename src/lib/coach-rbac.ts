import { prisma } from "@/lib/prisma";

export type CoachRole = "head_coach" | "coach" | "assistant";

export interface CoachContext {
  coachId: string;
  role: CoachRole;
  coachName?: string;
}

function isCoachNameMatch(groupCoachName: string | null | undefined, coachName: string | null | undefined): boolean {
  if (!groupCoachName || !coachName) return false;
  const g = groupCoachName.trim().toLowerCase();
  const c = coachName.trim().toLowerCase();
  if (!g || !c) return false;
  return g === c || c.startsWith(g) || g.startsWith(c);
}

/**
 * Resolves all visible active SwimGroup IDs for a coach according to RBAC,
 * including SwimGroupStaff assignments, accepted replacements, and legacy SwimGroup.coachName matching.
 */
export async function resolveCoachGroupIds(ctx: CoachContext): Promise<string[]> {
  const allActiveGroups = await prisma.swimGroup.findMany({
    where: { active: true },
    select: { id: true, coachName: true },
  });

  if (ctx.role === "head_coach") {
    return allActiveGroups.map((g) => g.id);
  }

  let coachName = ctx.coachName;
  if (!coachName) {
    const coachRecord = await prisma.coach.findUnique({
      where: { id: ctx.coachId },
      select: { name: true },
    });
    coachName = coachRecord?.name;
  }

  const [staffAssignments, replacementAssignments] = await Promise.all([
    prisma.swimGroupStaff.findMany({
      where: {
        coachId: ctx.coachId,
        endsOn: null,
        group: { active: true },
      },
      select: { groupId: true },
    }),
    prisma.swimReplacement.findMany({
      where: {
        substituteCoachId: ctx.coachId,
        status: { in: ["accepted", "assigned"] },
      },
      include: { session: { select: { groupId: true } } },
    }),
  ]);

  const set = new Set<string>();
  staffAssignments.forEach((a) => set.add(a.groupId));
  replacementAssignments.forEach((r) => set.add(r.session.groupId));

  // Match legacy SwimGroup.coachName
  for (const g of allActiveGroups) {
    if (isCoachNameMatch(g.coachName, coachName)) {
      set.add(g.id);
    }
  }

  // Fallback for shared/demo role accounts (e.g., "Coach AQA", "Assistant Coach AQA")
  // when no explicit SwimGroupStaff records have been seeded for them yet
  if (set.size === 0) {
    const anyStaffCount = await prisma.swimGroupStaff.count({
      where: { coachId: ctx.coachId, endsOn: null },
    });
    if (anyStaffCount === 0) {
      return allActiveGroups.map((g) => g.id);
    }
  }

  return Array.from(set);
}

/**
 * Checks whether a coach can view a group and its roster.
 * - head_coach: every group
 * - coach: his assigned groups (as lead or assistant) or legacy coachName match
 * - assistant: his assigned groups (as assistant or lead)
 */
export async function canViewSwimGroup(
  ctx: CoachContext,
  groupId: string
): Promise<boolean> {
  if (ctx.role === "head_coach") {
    return true;
  }

  const staffAssignment = await prisma.swimGroupStaff.findFirst({
    where: {
      groupId,
      coachId: ctx.coachId,
      endsOn: null,
    },
  });

  if (staffAssignment) {
    return true;
  }

  // Also allow view if the coach has an active replacement for a session in this group
  const replacement = await prisma.swimReplacement.findFirst({
    where: {
      substituteCoachId: ctx.coachId,
      status: { in: ["accepted", "assigned"] },
      session: { groupId },
    },
  });

  if (replacement) {
    return true;
  }

  const visibleGroupIds = await resolveCoachGroupIds(ctx);
  return visibleGroupIds.includes(groupId);
}

/**
 * Checks whether a coach can view a specific session and its attendance.
 */
export async function canViewSession(
  ctx: CoachContext,
  session: { id: string; groupId: string; actualCoachId: string | null }
): Promise<boolean> {
  if (ctx.role === "head_coach") {
    return true;
  }

  if (session.actualCoachId === ctx.coachId) {
    return true;
  }

  return canViewSwimGroup(ctx, session.groupId);
}

/**
 * Checks whether a coach can take/submit attendance for a session.
 * Rule (per user specification):
 * - head_coach: all groups/sessions
 * - coach: his assigned group sessions, or a session where he is the accepted replacement
 * - assistant: his assigned group view only (CANNOT edit attendance)
 */
export async function canEditAttendance(
  ctx: CoachContext,
  session: {
    id: string;
    groupId: string;
    sessionDate: Date;
    actualCoachId: string | null;
    status: string;
  }
): Promise<{ allowed: boolean; reason?: string }> {
  if (session.status === "cancelled") {
    return { allowed: false, reason: "Session is cancelled." };
  }

  // Assistants are strictly view-only per user instruction
  if (ctx.role === "assistant") {
    return {
      allowed: false,
      reason: "Assistants have view-only access to attendance.",
    };
  }

  if (ctx.role === "head_coach") {
    return { allowed: true };
  }

  // Regular coach: must be actualCoachId for this session or assigned to the group
  if (session.actualCoachId === ctx.coachId) {
    return { allowed: true };
  }

  const isLead = await prisma.swimGroupStaff.findFirst({
    where: {
      groupId: session.groupId,
      coachId: ctx.coachId,
      role: "lead",
      endsOn: null,
    },
  });

  if (isLead) {
    return { allowed: true };
  }

  const visibleGroupIds = await resolveCoachGroupIds(ctx);
  if (visibleGroupIds.includes(session.groupId)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: "You are not authorized to edit attendance for this group.",
  };
}

/**
 * Checks whether a coach can create/edit a technical review for a swimmer.
 * Rule:
 * - head_coach: all swimmers
 * - coach: swimmers in his assigned groups
 * - assistant: view only (cannot create/edit reviews)
 */
export async function canManageTechReview(
  ctx: CoachContext,
  memberId: string
): Promise<{ allowed: boolean; reason?: string }> {
  if (ctx.role === "assistant") {
    return {
      allowed: false,
      reason: "Assistants have view-only access to technical follow-up.",
    };
  }

  if (ctx.role === "head_coach") {
    return { allowed: true };
  }

  // Regular coach: check if member belongs to any of coach's active groups
  const member = await prisma.swimMember.findUnique({
    where: { id: memberId },
    select: { groupId: true, notes: true },
  });

  if (!member) {
    return { allowed: false, reason: "Member not found." };
  }

  const visibleGroupIds = await resolveCoachGroupIds(ctx);
  const coachGroupIds = new Set(visibleGroupIds);

  if (member.groupId && coachGroupIds.has(member.groupId)) {
    return { allowed: true };
  }

  // Check multi-group notes
  if (member.notes && member.notes.includes("[GROUPS:")) {
    for (const gid of coachGroupIds) {
      if (member.notes.includes(gid)) {
        return { allowed: true };
      }
    }
  }

  return {
    allowed: false,
    reason: "Swimmer is not enrolled in your training groups.",
  };
}


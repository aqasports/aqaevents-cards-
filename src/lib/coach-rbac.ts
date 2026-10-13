import { prisma } from "@/lib/prisma";

export type CoachRole = "head_coach" | "coach" | "assistant";

export interface CoachContext {
  coachId: string;
  role: CoachRole;
}

/**
 * Checks whether a coach can view a group and its roster.
 * - head_coach: every group
 * - coach: his assigned groups (as lead or assistant)
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

  // Also allow view if the coach has an active replacement for a session in this group today or upcoming
  const replacement = await prisma.swimReplacement.findFirst({
    where: {
      substituteCoachId: ctx.coachId,
      status: { in: ["accepted", "assigned"] },
      session: { groupId },
    },
  });

  return !!replacement;
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

  // Regular coach: must be lead coach of the group or actualCoachId for this session
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

  if (!member || !member.groupId) {
    return { allowed: false, reason: "Member not found or unassigned." };
  }

  const coachGroups = await prisma.swimGroupStaff.findMany({
    where: {
      coachId: ctx.coachId,
      role: "lead",
      endsOn: null,
    },
    select: { groupId: true },
  });

  const coachGroupIds = new Set(coachGroups.map((g) => g.groupId));

  if (coachGroupIds.has(member.groupId)) {
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

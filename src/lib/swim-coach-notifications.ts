import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { isOldSwimMember } from "@/lib/swim-groups";

export type SwimmerCoachEventType = "NEW_CLIENT" | "MOVEMENT";
export type SwimmerMovementKind = "transfer" | "multi_group";

export interface CoachSwimmerNotification {
  id: string;
  eventType: SwimmerCoachEventType;
  movementKind: SwimmerMovementKind | null;
  memberId: string;
  memberName: string;
  swimId: string;
  groupId: string;
  groupName: string;
  fromGroupId: string | null;
  fromGroupName: string | null;
  allGroupNames: string[];
  isNewClientLabelActive: boolean;
  createdAt: string;
}

/**
 * Records either a NEW_CLIENT notification or a MOVEMENT (transfer / multi-group)
 * notification in AuditLog when a swimmer is created or their group assignment changes.
 *
 * Rules:
 * - NEW label & NEW_CLIENT event are ONLY for brand-new clients assigned to a single group
 *   who have 0 prior attendances and 0 prior group movements.
 * - Multi-group assignments (nextGroupIds.length > 1) or group movements/transfers
 *   (previousGroupIds.length > 0 or prior history) NEVER get the NEW label,
 *   but DO notify the coach via COACH_SWIMMER_MOVEMENT.
 */
export async function recordSwimmerGroupChangeNotification(params: {
  memberId: string;
  memberName: string;
  swimId: string;
  previousGroupIds: string[];
  nextGroupIds: string[];
  isNewlyCreatedMember: boolean;
  adminId?: string | null;
}): Promise<void> {
  const prevClean = Array.from(new Set(params.previousGroupIds.filter(Boolean)));
  const nextClean = Array.from(new Set(params.nextGroupIds.filter(Boolean)));

  // Determine which groups were newly added in this operation
  const addedGroupIds = nextClean.filter((gid) => !prevClean.includes(gid));
  if (addedGroupIds.length === 0) {
    return;
  }

  const allRelevantGroupIds = Array.from(new Set([...prevClean, ...nextClean]));
  const groups =
    allRelevantGroupIds.length > 0
      ? await prisma.swimGroup.findMany({
          where: { id: { in: allRelevantGroupIds } },
          select: { id: true, name: true },
        })
      : [];
  const groupNameById = new Map(groups.map((g) => [g.id, g.name]));
  const allNextGroupNames = nextClean.map((gid) => groupNameById.get(gid) || "Groupe AQA");

  // Case 1: Multi-group assignment (assigned to 2+ groups)
  // Rule: NEW is NEVER used for multi-group assignment, but movement notifies the coach.
  if (nextClean.length > 1) {
    const fromGroupId = prevClean[0] || null;
    const fromGroupName = fromGroupId ? groupNameById.get(fromGroupId) || null : null;

    for (const targetGroupId of addedGroupIds) {
      const targetGroupName = groupNameById.get(targetGroupId) || "Groupe AQA";
      await logAdminAction(
        params.adminId || null,
        "COACH_SWIMMER_MOVEMENT",
        targetGroupId,
        JSON.stringify({
          eventType: "MOVEMENT",
          movementKind: "multi_group",
          memberId: params.memberId,
          memberName: params.memberName,
          swimId: params.swimId,
          groupId: targetGroupId,
          groupName: targetGroupName,
          fromGroupId,
          fromGroupName,
          allGroupIds: nextClean,
          allGroupNames: allNextGroupNames,
          createdAt: new Date().toISOString(),
        })
      );
    }
    return;
  }

  // Case 2: Single target group (nextClean.length === 1)
  const targetGroupId = nextClean[0];
  const targetGroupName = groupNameById.get(targetGroupId) || "Groupe AQA";

  // Check if this swimmer was already in a group previously OR has prior attendance / movement history
  let hadPriorActivity = prevClean.length > 0;

  if (!hadPriorActivity && !params.isNewlyCreatedMember) {
    const [attCount, priorLogCount] = await Promise.all([
      prisma.swimAttendance.count({
        where: { memberId: params.memberId },
      }),
      prisma.auditLog.count({
        where: {
          action: { in: ["COACH_SWIMMER_MOVEMENT", "COACH_SWIMMER_NEW_CLIENT"] },
          details: { contains: params.memberId },
        },
      }),
    ]);
    if (attCount > 0 || priorLogCount > 0) {
      hadPriorActivity = true;
    }
  }

  if (hadPriorActivity) {
    const fromGroupId = prevClean[0] || null;
    const fromGroupName = fromGroupId ? groupNameById.get(fromGroupId) || null : null;

    await logAdminAction(
      params.adminId || null,
      "COACH_SWIMMER_MOVEMENT",
      targetGroupId,
      JSON.stringify({
        eventType: "MOVEMENT",
        movementKind: "transfer",
        memberId: params.memberId,
        memberName: params.memberName,
        swimId: params.swimId,
        groupId: targetGroupId,
        groupName: targetGroupName,
        fromGroupId,
        fromGroupName,
        allGroupIds: nextClean,
        allGroupNames: allNextGroupNames,
        createdAt: new Date().toISOString(),
      })
    );
    return;
  }

  // Case 3: Genuine brand-new client assigned to their first single group
  await logAdminAction(
    params.adminId || null,
    "COACH_SWIMMER_NEW_CLIENT",
    targetGroupId,
    JSON.stringify({
      eventType: "NEW_CLIENT",
      movementKind: null,
      memberId: params.memberId,
      memberName: params.memberName,
      swimId: params.swimId,
      groupId: targetGroupId,
      groupName: targetGroupName,
      fromGroupId: null,
      fromGroupName: null,
      allGroupIds: nextClean,
      allGroupNames: allNextGroupNames,
      createdAt: new Date().toISOString(),
    })
  );
}

/**
 * Returns the set of memberIds that have had any group movement or multi-group assignment.
 * Any member in this set must NEVER display the NEW label.
 */
export async function getMovedSwimmerIds(memberIds?: string[]): Promise<Set<string>> {
  if (memberIds && memberIds.length === 0) {
    return new Set();
  }

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const movementLogs = await prisma.auditLog.findMany({
    where: {
      action: "COACH_SWIMMER_MOVEMENT",
      createdAt: { gte: ninetyDaysAgo },
    },
    orderBy: { createdAt: "desc" },
    take: 400,
    select: { details: true },
  });

  const movedSet = new Set<string>();
  const filterSet = memberIds ? new Set(memberIds) : null;

  for (const log of movementLogs) {
    if (!log.details) continue;
    try {
      const parsed = JSON.parse(log.details) as Record<string, unknown>;
      const mid = typeof parsed.memberId === "string" ? parsed.memberId : "";
      if (mid && (!filterSet || filterSet.has(mid))) {
        movedSet.add(mid);
      }
    } catch {
      // ignore malformed log
    }
  }

  return movedSet;
}

/**
 * Returns the set of memberIds that are genuinely newly added new clients.
 * Rules:
 * - Must have an explicit COACH_SWIMMER_NEW_CLIENT event in AuditLog (within active 30-day onboarding window)
 * - OR must be created within the last 14 days with level new_aqa/beginner (and NOT an old member).
 * Any member not in this set is an old client and must NEVER receive the NEW label.
 */
export async function getNewClientSwimmerIds(memberIds?: string[]): Promise<Set<string>> {
  if (memberIds && memberIds.length === 0) {
    return new Set();
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const newClientLogs = await prisma.auditLog.findMany({
    where: {
      action: "COACH_SWIMMER_NEW_CLIENT",
      createdAt: { gte: thirtyDaysAgo },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: { details: true },
  });

  const newClientSet = new Set<string>();
  const filterSet = memberIds ? new Set(memberIds) : null;

  for (const log of newClientLogs) {
    if (!log.details) continue;
    try {
      const parsed = JSON.parse(log.details) as Record<string, unknown>;
      const mid = typeof parsed.memberId === "string" ? parsed.memberId : "";
      if (mid && (!filterSet || filterSet.has(mid))) {
        newClientSet.add(mid);
      }
    } catch {
      // ignore malformed log
    }
  }

  // Also query members created in the last 14 days whose level is NOT an old client
  const recentNewMembers = await prisma.swimMember.findMany({
    where: {
      ...(filterSet ? { id: { in: Array.from(filterSet) } } : {}),
      createdAt: { gte: fourteenDaysAgo },
      level: { in: ["new_aqa", "beginner", "New AQA Member", "debutant"] },
    },
    select: { id: true, level: true },
  });

  for (const m of recentNewMembers) {
    if (!isOldSwimMember(m.level)) {
      newClientSet.add(m.id);
    }
  }

  return newClientSet;
}

/**
 * Determines whether a swimmer should display the "NEW" label:
 * - NEVER for old clients (level old_aqa, intermediate, advanced, or existing prior members)
 * - Must be explicitly verified in newClientMemberIds
 * - Must have 0 session attendances (disappears immediately and permanently after the first session)
 * - Must NOT be a multi-group assignment (!isMultiGroup)
 * - Must NOT have been moved between groups (!movedMemberIds.has(memberId))
 */
export function computeIsNewClientSwimmer(params: {
  memberId: string;
  level?: string | null;
  totalAttendances: number;
  isMultiGroup: boolean;
  movedMemberIds: Set<string>;
  newClientMemberIds: Set<string>;
}): boolean {
  // 1. Old clients NEVER get the NEW label
  if (isOldSwimMember(params.level)) {
    return false;
  }

  // 2. Swimmer MUST be in the verified new client set (never default to true for unknown/old swimmers!)
  if (!params.newClientMemberIds.has(params.memberId)) {
    return false;
  }

  // 3. Even new clients that already done a session do NOT get the NEW label
  if (params.totalAttendances > 0) {
    return false;
  }

  // 4. Multi-group assignments never get the NEW label
  if (params.isMultiGroup) {
    return false;
  }

  // 5. Group movements / transfers never get the NEW label
  if (params.movedMemberIds.has(params.memberId)) {
    return false;
  }

  return true;
}

/**
 * Fetches recent NEW_CLIENT and MOVEMENT notifications for a coach's groups.
 */
export async function getCoachSwimmerNotifications(params: {
  groupIds: string[];
  movedMemberIds: Set<string>;
  attendanceCountByMemberId: Map<string, number>;
  multiGroupMemberIds: Set<string>;
  newClientMemberIds: Set<string>;
}): Promise<CoachSwimmerNotification[]> {
  if (params.groupIds.length === 0) return [];

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const logs = await prisma.auditLog.findMany({
    where: {
      action: { in: ["COACH_SWIMMER_NEW_CLIENT", "COACH_SWIMMER_MOVEMENT"] },
      target: { in: params.groupIds },
      createdAt: { gte: fourteenDaysAgo },
    },
    orderBy: { createdAt: "desc" },
    take: 35,
  });

  const notifications: CoachSwimmerNotification[] = [];

  for (const log of logs) {
    if (!log.details) continue;
    try {
      const d = JSON.parse(log.details) as Record<string, unknown>;
      const memberId = typeof d.memberId === "string" ? d.memberId : "";
      if (!memberId) continue;

      const eventType: SwimmerCoachEventType =
        log.action === "COACH_SWIMMER_MOVEMENT" || d.eventType === "MOVEMENT"
          ? "MOVEMENT"
          : "NEW_CLIENT";

      const movementKind: SwimmerMovementKind | null =
        eventType === "MOVEMENT"
          ? d.movementKind === "multi_group"
            ? "multi_group"
            : "transfer"
          : null;

      const totalAttendances = params.attendanceCountByMemberId.get(memberId) ?? 0;
      const isMultiGroup =
        params.multiGroupMemberIds.has(memberId) || movementKind === "multi_group";

      const isNewClientLabelActive =
        eventType === "NEW_CLIENT" &&
        computeIsNewClientSwimmer({
          memberId,
          level: typeof d.level === "string" ? d.level : null,
          totalAttendances,
          isMultiGroup,
          movedMemberIds: params.movedMemberIds,
          newClientMemberIds: params.newClientMemberIds,
        });

      notifications.push({
        id: log.id,
        eventType,
        movementKind,
        memberId,
        memberName: typeof d.memberName === "string" ? d.memberName : "Nageur AQA",
        swimId: typeof d.swimId === "string" ? d.swimId : "",
        groupId: typeof d.groupId === "string" ? d.groupId : log.target || "",
        groupName: typeof d.groupName === "string" ? d.groupName : "Groupe AQA",
        fromGroupId: typeof d.fromGroupId === "string" ? d.fromGroupId : null,
        fromGroupName: typeof d.fromGroupName === "string" ? d.fromGroupName : null,
        allGroupNames: Array.isArray(d.allGroupNames)
          ? d.allGroupNames.map((x) => String(x))
          : [],
        isNewClientLabelActive,
        createdAt: log.createdAt.toISOString(),
      });
    } catch {
      // ignore malformed log
    }
  }

  return notifications;
}

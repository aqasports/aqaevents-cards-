import { prisma } from "@/lib/prisma";
import { decodeMemberGroupIds } from "@/lib/swim-groups";

export interface ResolvedGroupMember {
  id: string;
  swimId: string;
  fullName: string;
  phone: string;
  email: string | null;
  photoUrl: string | null;
  category: string;
  level: string;
  formula: string;
  duration: string | null;
  priceDA: number;
  paymentStatus: string;
  groupStatus: string;
  cardCode: string | null;
  cardStatus: string | null;
  subscriptionStart: Date | null;
  subscriptionEnd: Date | null;
  isMultiGroup: boolean;
}

/**
 * Resolves the canonical, deduplicated list of swimmers enrolled in a group.
 * Handles both primary group members and secondary multi-group members encoded
 * via [GROUPS:id1,id2] in notes.
 */
export async function getGroupRoster(groupId: string): Promise<ResolvedGroupMember[]> {
  if (!groupId) return [];

  // 1. Fetch primary members
  const primaryMembers = await prisma.swimMember.findMany({
    where: {
      groupId,
      groupStatus: { not: "rejected" },
    },
    include: {
      card: {
        select: { cardCode: true, status: true },
      },
    },
    orderBy: { fullName: "asc" },
  });

  // 2. Fetch multi-group candidate members
  const multiGroupCandidates = await prisma.swimMember.findMany({
    where: {
      notes: { contains: "[GROUPS:" },
      groupStatus: { not: "rejected" },
    },
    include: {
      card: {
        select: { cardCode: true, status: true },
      },
    },
    orderBy: { fullName: "asc" },
  });

  const memberMap = new Map<string, ResolvedGroupMember>();

  // Add primary members
  for (const m of primaryMembers) {
    const assigned = decodeMemberGroupIds(m.notes, m.groupId);
    memberMap.set(m.id, {
      id: m.id,
      swimId: m.swimId,
      fullName: m.fullName,
      phone: m.phone,
      email: m.email,
      photoUrl: m.photoUrl,
      category: m.category,
      level: m.level,
      formula: m.formula,
      duration: m.duration,
      priceDA: m.priceDA,
      paymentStatus: m.paymentStatus,
      groupStatus: m.groupStatus,
      cardCode: m.card?.cardCode ?? null,
      cardStatus: m.card?.status ?? null,
      subscriptionStart: m.subscriptionStart,
      subscriptionEnd: m.subscriptionEnd,
      isMultiGroup: assigned.length > 1,
    });
  }

  // Add secondary members assigned to this group via [GROUPS:]
  for (const m of multiGroupCandidates) {
    if (memberMap.has(m.id)) continue;
    const assigned = decodeMemberGroupIds(m.notes, m.groupId);
    if (assigned.includes(groupId)) {
      memberMap.set(m.id, {
        id: m.id,
        swimId: m.swimId,
        fullName: m.fullName,
        phone: m.phone,
        email: m.email,
        photoUrl: m.photoUrl,
        category: m.category,
        level: m.level,
        formula: m.formula,
        duration: m.duration,
        priceDA: m.priceDA,
        paymentStatus: m.paymentStatus,
        groupStatus: m.groupStatus,
        cardCode: m.card?.cardCode ?? null,
        cardStatus: m.card?.status ?? null,
        subscriptionStart: m.subscriptionStart,
        subscriptionEnd: m.subscriptionEnd,
        isMultiGroup: true,
      });
    }
  }

  return Array.from(memberMap.values()).sort((a, b) =>
    a.fullName.localeCompare(b.fullName)
  );
}

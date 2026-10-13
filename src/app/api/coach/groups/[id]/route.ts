import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoachSession } from "@/lib/coach-auth";
import { canViewSwimGroup } from "@/lib/coach-rbac";
import { getGroupRoster } from "@/lib/swim-roster";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, coach, role } = await requireCoachSession(req);
  if (error || !coach) return error;

  const { id: groupId } = await params;

  try {
    const isAllowed = await canViewSwimGroup({ coachId: coach.id, role }, groupId);
    if (!isAllowed) {
      return NextResponse.json(
        { error: "Forbidden: You do not have access to this training group." },
        { status: 403 }
      );
    }

    const group = await prisma.swimGroup.findUnique({
      where: { id: groupId },
      include: {
        staff: {
          where: { endsOn: null },
          include: { coach: { select: { id: true, name: true, phone: true } } },
        },
      },
    });

    if (!group) {
      return NextResponse.json(
        { error: "Group not found." },
        { status: 404 }
      );
    }

    const rawRoster = await getGroupRoster(groupId);

    // Apply privacy filtering per role
    const shapedRoster = rawRoster.map((m) => {
      return {
        id: m.id,
        swimId: m.swimId,
        fullName: m.fullName,
        // Assistants do not see personal phone numbers
        phone: role === "assistant" ? null : m.phone,
        category: m.category,
        level: m.level,
        formula: m.formula,
        duration: m.duration,
        cardCode: m.cardCode,
        cardStatus: m.cardStatus,
        paymentStatus: m.paymentStatus,
        subscriptionStart: m.subscriptionStart,
        subscriptionEnd: m.subscriptionEnd,
        isMultiGroup: m.isMultiGroup,
      };
    });

    return NextResponse.json({
      group: {
        id: group.id,
        name: group.name,
        category: group.category,
        level: group.level,
        schedule: group.schedule,
        capacity: group.capacity,
        notes: group.notes,
        staff: group.staff.map((s) => ({
          coachId: s.coach.id,
          coachName: s.coach.name,
          role: s.role,
        })),
      },
      roster: shapedRoster,
    });
  } catch (err) {
    logger.error("GET /api/coach/groups/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to load group details." },
      { status: 500 }
    );
  }
}

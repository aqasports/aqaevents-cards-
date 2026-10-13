import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoachSession } from "@/lib/coach-auth";
import { canViewSession } from "@/lib/coach-rbac";
import { getGroupRoster } from "@/lib/swim-roster";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, coach, role } = await requireCoachSession(req);
  if (error || !coach) return error;

  const { id: sessionId } = await params;

  try {
    const session = await prisma.swimSession.findUnique({
      where: { id: sessionId },
      include: {
        group: true,
        attendances: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found." },
        { status: 404 }
      );
    }

    const isAllowed = await canViewSession(
      { coachId: coach.id, role },
      { id: session.id, groupId: session.groupId, actualCoachId: session.actualCoachId }
    );

    if (!isAllowed) {
      return NextResponse.json(
        { error: "Forbidden: You do not have access to this session." },
        { status: 403 }
      );
    }

    const roster = await getGroupRoster(session.groupId);

    // Map existing attendances
    const attendanceByMemberId = new Map(
      session.attendances.map((a) => [a.memberId, a])
    );

    const shapedMembers = roster.map((m) => {
      const att = attendanceByMemberId.get(m.id);
      return {
        memberId: m.id,
        swimId: m.swimId,
        fullName: m.fullName,
        phone: role === "assistant" ? null : m.phone,
        cardCode: m.cardCode,
        status: att?.status ?? "unmarked",
        method: att?.method ?? "manual",
        note: att?.note ?? null,
        isGuest: att?.isGuest ?? false,
        markedAt: att?.markedAt ?? null,
      };
    });

    // Also include any guest attendees who were not in the default roster
    for (const att of session.attendances) {
      if (att.isGuest && !roster.some((m) => m.id === att.memberId)) {
        const guestMember = await prisma.swimMember.findUnique({
          where: { id: att.memberId },
          select: { id: true, swimId: true, fullName: true, phone: true },
        });
        if (guestMember) {
          shapedMembers.push({
            memberId: guestMember.id,
            swimId: guestMember.swimId,
            fullName: guestMember.fullName,
            phone: role === "assistant" ? null : guestMember.phone,
            cardCode: null,
            status: att.status,
            method: att.method,
            note: att.note,
            isGuest: true,
            markedAt: att.markedAt,
          });
        }
      }
    }

    return NextResponse.json({
      session: {
        id: session.id,
        groupId: session.groupId,
        groupName: session.group.name,
        category: session.group.category,
        level: session.group.level,
        sessionDate: session.sessionDate.toISOString().split("T")[0],
        startTime: session.startTime,
        location: session.location,
        status: session.status,
        cancelReason: session.cancelReason,
        closedAt: session.closedAt,
        canEdit: role !== "assistant" && session.status !== "cancelled",
      },
      members: shapedMembers,
    });
  } catch (err) {
    logger.error("GET /api/coach/sessions/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to load session details." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoachSession } from "@/lib/coach-auth";
import { getSkillsForCategory } from "@/lib/swim-skills";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, coach, role } = await requireCoachSession(req);
  if (error || !coach) return error;

  const { id: memberId } = await params;

  try {
    const member = await prisma.swimMember.findUnique({
      where: { id: memberId },
      include: {
        card: { select: { cardCode: true, status: true } },
        group: { select: { id: true, name: true, category: true, level: true } },
        attendances: {
          take: 30,
          orderBy: { markedAt: "desc" },
          include: {
            session: {
              select: { sessionDate: true, startTime: true },
            },
          },
        },
        techReviews: {
          orderBy: { createdAt: "desc" },
          include: {
            coach: { select: { name: true } },
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "Swimmer not found." },
        { status: 404 }
      );
    }

    const skillsCatalog = getSkillsForCategory(member.category);

    return NextResponse.json({
      member: {
        id: member.id,
        swimId: member.swimId,
        fullName: member.fullName,
        phone: role === "assistant" ? null : member.phone,
        category: member.category,
        level: member.level,
        formula: member.formula,
        duration: member.duration,
        cardCode: member.card?.cardCode ?? null,
        groupName: member.group?.name ?? "Non assigné",
        subscriptionStart: member.subscriptionStart,
        subscriptionEnd: member.subscriptionEnd,
        paymentStatus: member.paymentStatus,
      },
      skillsCatalog,
      recentAttendances: member.attendances.map((a) => ({
        id: a.id,
        date: a.session.sessionDate.toISOString().split("T")[0],
        time: a.session.startTime,
        status: a.status,
        method: a.method,
      })),
      techReviews: member.techReviews.map((r) => ({
        id: r.id,
        kind: r.kind,
        skills: r.skills ? JSON.parse(r.skills) : [],
        metrics: r.metrics ? JSON.parse(r.metrics) : [],
        strengths: r.strengths,
        improvements: r.improvements,
        nextGoals: r.nextGoals,
        recommendedLevel: r.recommendedLevel,
        coachName: r.coach?.name ?? "Coach",
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    logger.error("GET /api/coach/members/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to load swimmer profile." },
      { status: 500 }
    );
  }
}

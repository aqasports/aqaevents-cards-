import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { logAdminAction } from "@/lib/audit";
import {
  createDefaultChildProfile,
  kidsSuiviActionSchema,
} from "@/lib/swim-kids-physical";
import {
  buildEvaluatedPayload,
  deleteKidsAssessment,
  getKidsPhysicalProfile,
  listAllKidsPhysicalProfiles,
  saveKidsPhysicalProfile,
  toggleKidsAssessmentPublish,
  upsertKidsAssessment,
} from "@/lib/swim-kids-physical-server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/swim/kids-suivi
 *
 * Single batched read for the AQA Kids Suivi Physique desk:
 * loads all kids members (category "enfants" or holding a physical profile),
 * their evaluated physical bilans, and active coaches. No polling.
 */
export async function GET() {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const [profilesMap, coaches] = await Promise.all([
      listAllKidsPhysicalProfiles(),
      prisma.coach.findMany({
        where: { active: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const trackedIds = Array.from(profilesMap.keys());

    const members = await prisma.swimMember.findMany({
      where: {
        OR: [
          { category: { contains: "enfant", mode: "insensitive" } },
          { category: { contains: "kid", mode: "insensitive" } },
          ...(trackedIds.length > 0 ? [{ id: { in: trackedIds } }] : []),
        ],
      },
      select: {
        id: true,
        swimId: true,
        fullName: true,
        phone: true,
        category: true,
        level: true,
        formula: true,
        duration: true,
        groupStatus: true,
        dateOfStart: true,
        group: {
          select: { id: true, name: true, coachName: true, schedule: true },
        },
        card: {
          select: { cardCode: true, publicToken: true, status: true },
        },
      },
      orderBy: { fullName: "asc" },
    });

    const rows = members.map((m) => {
      const profile = profilesMap.get(m.id) ?? {
        childProfile: createDefaultChildProfile(),
        assessments: [],
        updatedAt: m.dateOfStart.toISOString(),
      };
      const evaluated = buildEvaluatedPayload(profile, false);
      const publishedCount = profile.assessments.filter((a) => a.publishedToPortal).length;

      return {
        id: m.id,
        swimId: m.swimId,
        fullName: m.fullName,
        phone: m.phone,
        category: m.category,
        level: m.level,
        formula: m.formula,
        duration: m.duration,
        groupStatus: m.groupStatus,
        group: m.group,
        card: m.card,
        childProfile: evaluated.childProfile,
        assessments: evaluated.assessments,
        latest: evaluated.latest,
        first: evaluated.first,
        evolution: evaluated.evolution,
        totalAssessments: profile.assessments.length,
        publishedCount,
      };
    });

    return NextResponse.json({
      members: rows,
      coaches,
    });
  } catch (err) {
    logger.error("GET /api/admin/swim/kids-suivi error:", err);
    return NextResponse.json(
      { error: "Failed to load AQA Kids physical follow-up data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const rawBody = await request.json();
    const parsed = kidsSuiviActionSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const body = parsed.data;
    const member = await prisma.swimMember.findUnique({
      where: { id: body.memberId },
      select: { id: true, swimId: true, fullName: true },
    });

    if (!member) {
      return NextResponse.json({ error: "Swimmer not found" }, { status: 404 });
    }

    if (body.action === "update_child_profile") {
      const existing = await getKidsPhysicalProfile(member.id);
      const saved = await saveKidsPhysicalProfile(member.id, {
        ...existing,
        childProfile: body.childProfile,
        updatedAt: new Date().toISOString(),
      });
      await logAdminAction(
        session.user?.id ?? null,
        "KIDS_PHYSICAL_PROFILE_UPDATED",
        `${member.fullName} (${member.swimId})`
      );
      return NextResponse.json({
        success: true,
        data: buildEvaluatedPayload(saved, false),
      });
    }

    if (body.action === "save_assessment") {
      const { profile, savedAssessment } = await upsertKidsAssessment({
        memberId: member.id,
        childProfile: body.childProfile,
        input: body.assessment,
      });
      await logAdminAction(
        session.user?.id ?? null,
        body.assessment.id ? "KIDS_PHYSICAL_BILAN_UPDATED" : "KIDS_PHYSICAL_BILAN_CREATED",
        `${member.fullName} (${member.swimId})`,
        JSON.stringify({
          assessmentId: savedAssessment.id,
          assessedAt: savedAssessment.assessedAt,
          publishedToPortal: savedAssessment.publishedToPortal,
        })
      );
      return NextResponse.json({
        success: true,
        savedAssessmentId: savedAssessment.id,
        data: buildEvaluatedPayload(profile, false),
      });
    }

    if (body.action === "delete_assessment") {
      const saved = await deleteKidsAssessment(member.id, body.assessmentId);
      await logAdminAction(
        session.user?.id ?? null,
        "KIDS_PHYSICAL_BILAN_DELETED",
        `${member.fullName} (${member.swimId})`,
        JSON.stringify({ assessmentId: body.assessmentId })
      );
      return NextResponse.json({
        success: true,
        data: buildEvaluatedPayload(saved, false),
      });
    }

    if (body.action === "toggle_publish") {
      const saved = await toggleKidsAssessmentPublish(
        member.id,
        body.assessmentId,
        body.publishedToPortal
      );
      await logAdminAction(
        session.user?.id ?? null,
        "KIDS_PHYSICAL_BILAN_VISIBILITY",
        `${member.fullName} (${member.swimId})`,
        JSON.stringify({
          assessmentId: body.assessmentId,
          publishedToPortal: body.publishedToPortal,
        })
      );
      return NextResponse.json({
        success: true,
        data: buildEvaluatedPayload(saved, false),
      });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (err) {
    logger.error("POST /api/admin/swim/kids-suivi error:", err);
    return NextResponse.json(
      { error: "Failed to save AQA Kids physical assessment" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/api-auth";
import { logAdminAction } from "@/lib/audit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const groupStaffSchema = z.object({
  leadCoachId: z.string().nullable(),
  assistantCoachIds: z.array(z.string()).default([]),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id: groupId } = await params;

  try {
    const group = await prisma.swimGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return NextResponse.json(
        { error: "Training group not found." },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parsed = groupStaffSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid group staff format." },
        { status: 400 }
      );
    }

    const { leadCoachId, assistantCoachIds } = parsed.data;

    let leadCoachName: string | null = null;
    if (leadCoachId) {
      const leadCoach = await prisma.coach.findUnique({
        where: { id: leadCoachId },
        select: { name: true },
      });
      leadCoachName = leadCoach?.name ?? null;
    }

    await prisma.$transaction(async (tx) => {
      // 1. End all current assignments for this group
      await tx.swimGroupStaff.updateMany({
        where: {
          groupId,
          endsOn: null,
        },
        data: {
          endsOn: new Date(),
        },
      });

      // 2. Create lead assignment
      if (leadCoachId) {
        await tx.swimGroupStaff.create({
          data: {
            groupId,
            coachId: leadCoachId,
            role: "lead",
            startsOn: new Date(),
          },
        });
      }

      // 3. Create assistant assignments
      for (const asstId of assistantCoachIds) {
        if (asstId !== leadCoachId) {
          await tx.swimGroupStaff.create({
            data: {
              groupId,
              coachId: asstId,
              role: "assistant",
              startsOn: new Date(),
            },
          });
        }
      }

      // 4. Backward-compatible dual-write to SwimGroup.coachName
      await tx.swimGroup.update({
        where: { id: groupId },
        data: {
          coachName: leadCoachName,
        },
      });
    });

    await logAdminAction(
      session.user.id,
      "ADMIN_GROUP_STAFF_UPDATED",
      group.name,
      JSON.stringify({ groupId, leadCoachId, assistantCoachIds, leadCoachName })
    );

    return NextResponse.json({ success: true, leadCoachName });
  } catch (err) {
    logger.error("PUT /api/admin/swim/coaching/groups/[id]/staff error:", err);
    return NextResponse.json(
      { error: "Failed to update group staffing." },
      { status: 500 }
    );
  }
}

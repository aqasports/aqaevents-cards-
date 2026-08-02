import { NextRequest, NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logAdminAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

const proposeActivitySchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  userName: z.string().min(2),
  userPhone: z.string().min(8),
  userEmail: z.string().email().optional().nullable(),
});

export async function GET() {
  const { session, organizationId, error } = await requireOrgSession();
  if (error) return error;
  if (!session || !organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const activities = await prisma.activity.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: {
        sessions: {
          where: { sessionDate: { gte: new Date() }, active: true },
          take: 5,
          orderBy: { sessionDate: "asc" },
        },
      },
    });

    return NextResponse.json(activities);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch activities" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { session, organizationId, role, error } = await requireOrgSession();
  if (error) return error;
  if (!session || !organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const validated = proposeActivitySchema.parse(body);

    const proposal = await prisma.activityProposal.create({
      data: {
        title: validated.title.trim(),
        description: `[Corporate Portal Proposal - Org ID: ${organizationId}] ${validated.description.trim()}`,
        userName: validated.userName.trim(),
        userPhone: validated.userPhone.trim(),
        userEmail: validated.userEmail ? validated.userEmail.trim() : null,
        status: "pending",
      },
    });

    await logAdminAction(
      session.user.id,
      "PROPOSE_ACTIVITY_PORTAL",
      proposal.title,
      `Submitted activity proposal "${proposal.title}" from portal (${role})`
    );

    return NextResponse.json(proposal, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to submit proposal" }, { status: 400 });
  }
}

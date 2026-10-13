import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/api-auth";
import { hashPassword } from "@/lib/coach-auth";
import { logAdminAction } from "@/lib/audit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const staffAccountSchema = z.object({
  coachId: z.string(),
  email: z.string().email(),
  password: z.string().min(4).optional(),
  role: z.enum(["head_coach", "coach", "assistant"]).default("coach"),
  categories: z.array(z.string()).optional(),
  loginEnabled: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const body = await req.json();
    const parsed = staffAccountSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid staff payload." },
        { status: 400 }
      );
    }

    const { coachId, email, password, role, categories, loginEnabled } = parsed.data;

    const coach = await prisma.coach.findUnique({
      where: { id: coachId },
    });

    if (!coach) {
      return NextResponse.json(
        { error: "Coach not found." },
        { status: 404 }
      );
    }

    const existingAccount = await prisma.coachAccount.findUnique({
      where: { coachId },
    });

    let passwordHash = existingAccount?.passwordHash;
    if (password) {
      passwordHash = await hashPassword(password);
    } else if (!passwordHash) {
      return NextResponse.json(
        { error: "Password is required for new coach accounts." },
        { status: 400 }
      );
    }

    const categoriesJson = categories ? JSON.stringify(categories) : null;

    const account = await prisma.coachAccount.upsert({
      where: { coachId },
      create: {
        coachId,
        email: email.trim().toLowerCase(),
        passwordHash,
        role,
        categories: categoriesJson,
        loginEnabled,
      },
      update: {
        email: email.trim().toLowerCase(),
        passwordHash,
        role,
        categories: categoriesJson,
        loginEnabled,
      },
    });

    // Also sync email back to Coach model if coach.email is empty
    if (!coach.email || coach.email !== email) {
      await prisma.coach.update({
        where: { id: coachId },
        data: { email: email.trim().toLowerCase() },
      });
    }

    await logAdminAction(
      session.user.id,
      "ADMIN_COACH_ACCOUNT_SAVED",
      coach.name,
      JSON.stringify({ coachId, email, role, loginEnabled })
    );

    return NextResponse.json({ success: true, account });
  } catch (err: any) {
    logger.error("POST /api/admin/swim/coaching/staff error:", err);
    if (err?.code === "P2002") {
      return NextResponse.json(
        { error: "This email is already in use by another coach account." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to save coach account." },
      { status: 500 }
    );
  }
}

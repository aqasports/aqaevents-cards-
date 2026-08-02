import { NextRequest, NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { hashPassword } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

const createUserSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  role: z.enum(["OWNER", "HR_MANAGER", "FINANCE", "VIEWER"]).default("VIEWER"),
  sendMagicLink: z.boolean().default(false),
});

const updateUserSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["OWNER", "HR_MANAGER", "FINANCE", "VIEWER"]).optional(),
  active: z.boolean().optional(),
});

export async function GET() {
  const { session, organizationId, error } = await requireOrgSession(["OWNER"]);
  if (error || !session || !organizationId) return error;

  try {
    const users = await prisma.organizationUser.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    return NextResponse.json(users);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch portal users" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { session, organizationId, role, error } = await requireOrgSession(["OWNER"]);
  if (error || !session || !organizationId) return error;

  try {
    const body = await request.json();
    const validated = createUserSchema.parse(body);

    const existing = await prisma.organizationUser.findFirst({
      where: { organizationId, email: validated.email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json({ error: "User with this email already exists in this organization" }, { status: 400 });
    }

    let passwordHash: string | null = null;
    if (validated.password) {
      passwordHash = await hashPassword(validated.password);
    }

    let magicToken: string | null = null;
    let magicTokenExp: Date | null = null;
    if (validated.sendMagicLink || !validated.password) {
      magicToken = nanoid(32);
      magicTokenExp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    }

    const newUser = await prisma.organizationUser.create({
      data: {
        organizationId,
        email: validated.email.toLowerCase(),
        passwordHash,
        magicToken,
        magicTokenExp,
        role: validated.role,
        active: true,
      },
      select: { id: true, email: true, role: true, active: true, magicToken: true },
    });

    await logAdminAction(
      session.user.id,
      "ADD_PORTAL_USER",
      newUser.email,
      `Created portal user ${newUser.email} with role ${newUser.role} (${role})`
    );

    return NextResponse.json(newUser, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to create portal user" }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const { session, organizationId, role, error } = await requireOrgSession(["OWNER"]);
  if (error || !session || !organizationId) return error;

  try {
    const body = await request.json();
    const validated = updateUserSchema.parse(body);

    const existing = await prisma.organizationUser.findFirst({
      where: { id: validated.userId, organizationId },
    });

    if (!existing) {
      return NextResponse.json({ error: "User not found in organization" }, { status: 404 });
    }

    const updated = await prisma.organizationUser.update({
      where: { id: validated.userId },
      data: {
        ...(validated.role ? { role: validated.role } : {}),
        ...(validated.active !== undefined ? { active: validated.active } : {}),
      },
      select: { id: true, email: true, role: true, active: true },
    });

    await logAdminAction(
      session.user.id,
      "UPDATE_PORTAL_USER",
      updated.email,
      `Updated portal user ${updated.email} role to ${updated.role} (active: ${updated.active})`
    );

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to update portal user" }, { status: 400 });
  }
}

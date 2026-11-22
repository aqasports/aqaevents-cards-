import { NextRequest, NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { nanoid } from "nanoid";
import { logAdminAction } from "@/lib/audit";
import { generatePublicToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";

const createEmployeeSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().min(8).optional().nullable().or(z.literal("")),
  departmentId: z.string().optional().nullable(),
  assignCard: z.boolean().optional(),
});

const updateEmployeeSchema = z.object({
  clientId: z.string().min(1),
  archived: z.boolean().optional(),
  departmentId: z.string().optional().nullable(),
});

export async function GET() {
  const { session, organizationId, error } = await requireOrgSession();
  if (error) return error;
  if (!session || !organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const employees = await prisma.client.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        archived: true,
        createdAt: true,
        cards: {
          select: { id: true, cardCode: true, publicToken: true, status: true },
          where: { status: "active" },
        },
        _count: { select: { redemptions: true } },
      },
    });

    return NextResponse.json(employees);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch employees" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { session, organizationId, role, error } = await requireOrgSession(["OWNER", "HR_MANAGER"]);
  if (error) return error;
  if (!session || !organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const validated = createEmployeeSchema.parse(body);

    if (validated.departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: validated.departmentId, organizationId },
        select: { id: true },
      });
      if (!dept) {
        return NextResponse.json({ error: "Department not found in organization" }, { status: 400 });
      }
    }

    const client = await prisma.client.create({
      data: {
        fullName: validated.fullName.trim(),
        email: validated.email ? validated.email.trim().toLowerCase() : null,
        phone: validated.phone ? validated.phone.trim() : null,
        organizationId,
        departmentId: validated.departmentId || null,
      },
    });

    if (validated.assignCard) {
      await prisma.card.create({
        data: {
          clientId: client.id,
          organizationId,
          publicToken: generatePublicToken(),
          cardCode: `AQA-CORP-${nanoid(6).toUpperCase()}`,
          status: "active",
        },
      });
    }

    await logAdminAction(
      null,
      "ADD_EMPLOYEE",
      client.fullName,
      `Added employee ${client.fullName} in portal (${role}, orgUserId: ${session.user.id}, orgId: ${organizationId})`
    );

    return NextResponse.json(client, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to create employee" }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const { session, organizationId, role, error } = await requireOrgSession(["OWNER", "HR_MANAGER"]);
  if (error) return error;
  if (!session || !organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const validated = updateEmployeeSchema.parse(body);

    const existing = await prisma.client.findFirst({
      where: { id: validated.clientId, organizationId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Employee not found in organization" }, { status: 404 });
    }

    if (validated.departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: validated.departmentId, organizationId },
        select: { id: true },
      });
      if (!dept) {
        return NextResponse.json({ error: "Department not found in organization" }, { status: 400 });
      }
    }

    const updated = await prisma.client.update({
      where: { id: validated.clientId },
      data: {
        ...(validated.archived !== undefined ? { archived: validated.archived, archivedAt: validated.archived ? new Date() : null } : {}),
        ...(validated.departmentId !== undefined ? { departmentId: validated.departmentId } : {}),
      },
    });

    await logAdminAction(
      null,
      "UPDATE_EMPLOYEE",
      updated.fullName,
      `Updated employee ${updated.fullName} in portal (${role}, orgUserId: ${session.user.id}, orgId: ${organizationId})`
    );

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to update employee" }, { status: 400 });
  }
}

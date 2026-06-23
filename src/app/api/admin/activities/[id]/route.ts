import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession, requireSuperAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  creditCost: z.number().int().nonnegative().optional(),
  imageUrl: z.string().optional().nullable(),
  places: z.string().optional().nullable(),
  duration: z.string().optional().nullable(),
  gallery: z.string().optional().nullable(),
  equipment: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;

  try {
    const activity = await prisma.activity.findUnique({
      where: { id },
      include: {
        expenses: {
          orderBy: { createdAt: "desc" },
        },
        sessions: {
          include: {
            redemptions: {
              include: {
                client: {
                  select: {
                    id: true,
                    fullName: true,
                    phone: true,
                    email: true,
                  },
                },
              },
              orderBy: { redeemedAt: "desc" },
            },
          },
          orderBy: { sessionDate: "asc" },
        },
      },
    });

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    return NextResponse.json(activity);
  } catch (err: unknown) {
    console.error("Fetch activity details database error:", err);
    const details = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Database error during activity fetch: ${details}` },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireSuperAdminSession();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const activity = await prisma.activity.update({
      where: { id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        creditCost: parsed.data.creditCost,
        imageUrl: parsed.data.imageUrl,
        places: parsed.data.places,
        duration: parsed.data.duration,
        gallery: parsed.data.gallery,
        equipment: parsed.data.equipment,
        active: parsed.data.active,
      },
    });

    const sessionResult = await requireSuperAdminSession();
    if (sessionResult.session) {
      await logAdminAction(
        sessionResult.session.user.id,
        "UPDATE_ACTIVITY",
        `Activity "${activity.name}"`,
        `Updated activity "${activity.name}" (Credit cost: ${activity.creditCost}, duration: ${activity.duration || "None"}, active: ${activity.active}).`
      );
    }

    return NextResponse.json(activity);
  } catch (err: unknown) {
    console.error("Patch activity details database error:", err);
    const details = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Database error during activity update: ${details}` },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireSuperAdminSession();
  if (error) return error;

  const { id } = await params;

  try {
    const activity = await prisma.activity.findUnique({
      where: { id },
    });

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    await prisma.activity.delete({
      where: { id },
    });

    const sessionResult = await requireSuperAdminSession();
    if (sessionResult.session) {
      await logAdminAction(
        sessionResult.session.user.id,
        "DELETE_ACTIVITY",
        `Activity "${activity.name}"`,
        `Deleted activity "${activity.name}" (ID: ${id}).`
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Delete activity database error:", err);
    const details = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Database error during activity deletion: ${details}` },
      { status: 500 },
    );
  }
}

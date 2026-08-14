import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { logAdminAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id } = await params;

  try {
    const usageLogs = await prisma.equipmentUsage.findMany({
      where: { equipmentAssetId: id },
      orderBy: { loggedAt: "desc" },
      include: {
        session: {
          include: {
            activity: true,
          },
        },
      },
    });

    return NextResponse.json(usageLogs);
  } catch (err: unknown) {
    logger.error("GET equipment usage logs error:", err);
    return NextResponse.json({ error: "Failed to fetch usage logs" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id } = await params;

  try {
    const asset = await prisma.equipmentAsset.findUnique({ where: { id } });
    if (!asset) {
      return NextResponse.json({ error: "Equipment asset not found" }, { status: 404 });
    }

    const body = await request.json();
    const { sessionId, loggedAt, notes } = body;

    if (sessionId) {
      const sessionExists = await prisma.activitySession.findUnique({
        where: { id: sessionId },
      });
      if (!sessionExists) {
        return NextResponse.json({ error: "Activity session not found" }, { status: 404 });
      }
    }

    const usageLog = await prisma.equipmentUsage.create({
      data: {
        equipmentAssetId: id,
        sessionId: sessionId || null,
        loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
        notes: notes?.trim() || null,
      },
      include: {
        session: {
          include: {
            activity: true,
          },
        },
      },
    });

    if (session.user?.id) {
      await logAdminAction(
        session.user.id,
        "LOG_EQUIPMENT_USAGE",
        asset.name,
        `Logged usage for equipment asset ${asset.name}`
      );
    }

    return NextResponse.json(usageLog, { status: 201 });
  } catch (err: unknown) {
    logger.error("POST equipment usage error:", err);
    const details = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to log equipment usage: ${details}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id } = await params;
  const usageId = request.nextUrl.searchParams.get("usageId");

  if (!usageId) {
    return NextResponse.json({ error: "usageId query parameter is required" }, { status: 400 });
  }

  try {
    const existing = await prisma.equipmentUsage.findFirst({
      where: { id: usageId, equipmentAssetId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Usage log record not found" }, { status: 404 });
    }

    await prisma.equipmentUsage.delete({
      where: { id: usageId },
    });

    if (session.user?.id) {
      await logAdminAction(
        session.user.id,
        "DELETE_EQUIPMENT_USAGE",
        usageId,
        `Deleted equipment usage record ${usageId} from asset ${id}`
      );
    }

    return NextResponse.json({ success: true, message: "Usage log record deleted" });
  } catch (err: unknown) {
    logger.error("DELETE equipment usage error:", err);
    return NextResponse.json({ error: "Failed to delete usage log" }, { status: 500 });
  }
}

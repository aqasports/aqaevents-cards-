import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import crypto from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: orgId } = await params;

  try {
    const newApiKey = `aqa_feed_${crypto.randomBytes(16).toString("hex")}`;

    const updatedOrg = await prisma.organization.update({
      where: { id: orgId },
      data: {
        feedApiKey: newApiKey,
      },
      select: { id: true, name: true, feedApiKey: true },
    });

    await logAdminAction(
      session.user.id,
      "GENERATE_FEED_API_KEY",
      updatedOrg.name,
      `Generated new Ad Tunnel Feed API key for ${updatedOrg.name}`
    );

    return NextResponse.json({
      success: true,
      feedApiKey: updatedOrg.feedApiKey,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to generate feed API key" }, { status: 500 });
  }
}

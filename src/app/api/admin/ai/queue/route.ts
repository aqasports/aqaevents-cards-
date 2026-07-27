/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  try {
    const where: any = {};
    if (status && status !== "all") {
      where.status = status;
    }

    const items = await prisma.aiActionQueue.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(items);
  } catch (err: unknown) {
    console.error("GET ai queue error:", err);
    return NextResponse.json(
      { error: "Failed to fetch AI action queue items" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const body = await request.json();
    const { actionType, proposedPayload, reasoning } = body;

    const trimmedActionType = actionType ? String(actionType).trim() : "";
    const trimmedReasoning = reasoning ? String(reasoning).trim() : "";

    if (!trimmedActionType) {
      return NextResponse.json(
        { error: "actionType is required" },
        { status: 400 }
      );
    }
    if (!trimmedReasoning) {
      return NextResponse.json(
        { error: "reasoning is required" },
        { status: 400 }
      );
    }

    const payloadString =
      typeof proposedPayload === "string"
        ? proposedPayload
        : JSON.stringify(proposedPayload || {});

    const item = await prisma.aiActionQueue.create({
      data: {
        actionType: trimmedActionType,
        proposedPayload: payloadString,
        reasoning: trimmedReasoning,
        status: "pending",
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err: unknown) {
    console.error("POST ai queue error:", err);
    const details = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to enqueue AI action: ${details}` },
      { status: 500 }
    );
  }
}

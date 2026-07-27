/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getCreditRate } from "@/lib/settings";
import { getEffectiveCreditRateForClient } from "@/lib/organizations";
import { calculateCoachPayout } from "@/lib/coach-payouts";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { searchParams } = new URL(request.url);
  const startDateStr = searchParams.get("startDate");
  const endDateStr = searchParams.get("endDate");
  const activityId = searchParams.get("activityId");

  try {
    const where: any = {};

    if (startDateStr || endDateStr) {
      where.sessionDate = {};
      if (startDateStr) where.sessionDate.gte = new Date(startDateStr);
      if (endDateStr) where.sessionDate.lte = new Date(endDateStr);
    }

    if (activityId && activityId !== "all") {
      where.activityId = activityId;
    }

    const dbSessions = await prisma.activitySession.findMany({
      where,
      orderBy: { sessionDate: "desc" },
      include: {
        activity: true,
        checkIns: true,
        sessionExpenses: true,
        coach: true,
        equipmentUsages: {
          include: {
            equipmentAsset: true,
          },
        },
      },
    });

    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalCoachPayouts = 0;
    let totalNetProfit = 0;

    let bestSession: any = null;
    let maxSessionProfit = -Infinity;

    const activityProfitMap = new Map<string, { id: string; name: string; totalNetProfit: number }>();

    const analyzedSessions = [];

    for (const s of dbSessions) {
      const firstClientId = s.checkIns[0]?.clientId;
      const effectiveRate = firstClientId
        ? await getEffectiveCreditRateForClient(firstClientId)
        : await getCreditRate();

      const grossRevenue = (s.checkIns.length || 0) * s.activity.creditCost * effectiveRate;
      const variableExpenses = s.sessionExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const payoutResult = await calculateCoachPayout(s);
      const coachPayout = payoutResult.totalPayout;
      const netProfit = grossRevenue - variableExpenses - coachPayout;
      const profitMarginPercent = grossRevenue > 0 ? Math.round((netProfit / grossRevenue) * 100) : 0;

      totalRevenue += grossRevenue;
      totalExpenses += variableExpenses;
      totalCoachPayouts += coachPayout;
      totalNetProfit += netProfit;

      const analyzedItem = {
        id: s.id,
        activityId: s.activityId,
        activityName: s.activity.name,
        sessionDate: s.sessionDate,
        location: s.location,
        checkInCount: s.checkIns.length,
        grossRevenue,
        variableExpenses,
        coachPayout,
        netProfit,
        profitMarginPercent,
        coachName: s.coach?.name ?? null,
      };

      analyzedSessions.push(analyzedItem);

      if (netProfit > maxSessionProfit) {
        maxSessionProfit = netProfit;
        bestSession = analyzedItem;
      }

      const existingAct = activityProfitMap.get(s.activityId) || {
        id: s.activityId,
        name: s.activity.name,
        totalNetProfit: 0,
      };
      existingAct.totalNetProfit += netProfit;
      activityProfitMap.set(s.activityId, existingAct);
    }

    let mostProfitableActivity: { id: string; name: string; totalNetProfit: number } | null = null;
    let maxActivityProfit = -Infinity;

    for (const act of activityProfitMap.values()) {
      if (act.totalNetProfit > maxActivityProfit) {
        maxActivityProfit = act.totalNetProfit;
        mostProfitableActivity = act;
      }
    }

    const overallMarginPercent =
      totalRevenue > 0 ? Math.round((totalNetProfit / totalRevenue) * 100) : 0;

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalExpenses,
        totalCoachPayouts,
        totalNetProfit,
        overallMarginPercent,
        sessionCount: dbSessions.length,
      },
      bestSession,
      mostProfitableActivity,
      sessions: analyzedSessions,
    });
  } catch (err: unknown) {
    console.error("GET profitability report error:", err);
    return NextResponse.json(
      { error: "Failed to generate profitability report" },
      { status: 500 }
    );
  }
}

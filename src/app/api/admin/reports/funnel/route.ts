/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { searchParams } = new URL(request.url);
  const startDateStr = searchParams.get("startDate");
  const endDateStr = searchParams.get("endDate");
  const utmSource = searchParams.get("utmSource");
  const utmCampaign = searchParams.get("utmCampaign");

  try {
    const where: any = {};

    if (startDateStr || endDateStr) {
      where.createdAt = {};
      if (startDateStr) where.createdAt.gte = new Date(startDateStr);
      if (endDateStr) where.createdAt.lte = new Date(endDateStr);
    }

    if (utmSource && utmSource !== "all") {
      where.utmSource = utmSource;
    }

    if (utmCampaign && utmCampaign !== "all") {
      where.utmCampaign = utmCampaign;
    }

    const demands = await prisma.cardDemand.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const totalDemands = demands.length;
    let acceptedDemands = 0;
    let totalRevenueGenerated = 0;

    const sourceMap = new Map<string, { total: number; accepted: number; revenue: number }>();
    const campaignMap = new Map<string, { total: number; accepted: number; revenue: number }>();

    for (const d of demands) {
      const isAccepted = d.status === "accepted";
      const price = d.price || 0;

      if (isAccepted) {
        acceptedDemands += 1;
        totalRevenueGenerated += price;
      }

      const sourceKey = d.utmSource ? d.utmSource.trim() : "Direct / Organic";
      const campaignKey = d.utmCampaign ? d.utmCampaign.trim() : "None / Unassigned";

      const sourceStat = sourceMap.get(sourceKey) || { total: 0, accepted: 0, revenue: 0 };
      sourceStat.total += 1;
      if (isAccepted) {
        sourceStat.accepted += 1;
        sourceStat.revenue += price;
      }
      sourceMap.set(sourceKey, sourceStat);

      const campaignStat = campaignMap.get(campaignKey) || { total: 0, accepted: 0, revenue: 0 };
      campaignStat.total += 1;
      if (isAccepted) {
        campaignStat.accepted += 1;
        campaignStat.revenue += price;
      }
      campaignMap.set(campaignKey, campaignStat);
    }

    const conversionRate = totalDemands > 0 ? Math.round((acceptedDemands / totalDemands) * 100) : 0;

    const breakdownBySource = Array.from(sourceMap.entries()).map(([source, stats]) => ({
      source,
      total: stats.total,
      accepted: stats.accepted,
      conversionRate: stats.total > 0 ? Math.round((stats.accepted / stats.total) * 100) : 0,
      revenue: stats.revenue,
    }));

    const breakdownByCampaign = Array.from(campaignMap.entries()).map(([campaign, stats]) => ({
      campaign,
      total: stats.total,
      accepted: stats.accepted,
      conversionRate: stats.total > 0 ? Math.round((stats.accepted / stats.total) * 100) : 0,
      revenue: stats.revenue,
    }));

    return NextResponse.json({
      summary: {
        totalDemands,
        acceptedDemands,
        conversionRate,
        totalRevenueGenerated,
      },
      breakdownBySource,
      breakdownByCampaign,
    });
  } catch (err: unknown) {
    console.error("GET funnel report error:", err);
    return NextResponse.json(
      { error: "Failed to generate funnel report" },
      { status: 500 }
    );
  }
}

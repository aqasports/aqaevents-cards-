export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import AcademyClient from "./academy-client";

export default async function AcademyHubPage() {
  try {
    const [
      swimmersCount,
      pendingLeadsCount,
      activeGroupsCount,
      swimRevenueAggregate,
    ] = await Promise.all([
      prisma.swimMember.count(),
      prisma.swimLead.count({ where: { status: "pending" } }),
      prisma.swimGroup.count({ where: { active: true } }),
      prisma.swimPayment.aggregate({ _sum: { amount: true } }),
    ]);

    return (
      <AcademyClient
        swimmersCount={swimmersCount}
        pendingLeadsCount={pendingLeadsCount}
        activeGroupsCount={activeGroupsCount}
        swimRevenueTotal={swimRevenueAggregate._sum.amount ?? 0}
      />
    );
  } catch (error) {
    console.error("[AcademyHubPage] Failed to load academy metrics:", error);
    return (
      <AcademyClient
        swimmersCount={0}
        pendingLeadsCount={0}
        activeGroupsCount={0}
        swimRevenueTotal={0}
      />
    );
  }
}

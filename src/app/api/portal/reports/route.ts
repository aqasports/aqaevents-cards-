import { NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, organizationId, error } = await requireOrgSession();
  if (error || !session || !organizationId) return error;

  try {
    // 1. Total redemptions & credits used by org employees
    const redemptions = await prisma.redemption.findMany({
      where: {
        client: { organizationId },
      },
      include: {
        activity: { select: { id: true, name: true } },
        client: { select: { id: true, fullName: true, departmentId: true } },
      },
      orderBy: { redeemedAt: "desc" },
    });

    // 2. Department spend aggregation
    const departments = await prisma.department.findMany({
      where: { organizationId },
      include: {
        clients: { select: { id: true } },
      },
    });

    const deptSpendMap = new Map<string, { id: string; name: string; budgetCap: number | null; creditsUsed: number; employeesCount: number }>();

    departments.forEach((dept) => {
      deptSpendMap.set(dept.id, {
        id: dept.id,
        name: dept.name,
        budgetCap: dept.budgetCap,
        creditsUsed: 0,
        employeesCount: dept.clients.length,
      });
    });

    // Unassigned employees department bucket
    deptSpendMap.set("unassigned", {
      id: "unassigned",
      name: "Unassigned Department",
      budgetCap: null,
      creditsUsed: 0,
      employeesCount: 0,
    });

    // Aggregate spend per department
    redemptions.forEach((r) => {
      const deptId = r.client.departmentId || "unassigned";
      const current = deptSpendMap.get(deptId);
      if (current) {
        current.creditsUsed += r.creditsUsed;
      }
    });

    const departmentSpend = Array.from(deptSpendMap.values()).filter((d) => d.creditsUsed > 0 || d.id !== "unassigned");

    // 3. Popular activities
    const activityCountsMap = new Map<string, { id: string; name: string; count: number; creditsUsed: number }>();
    redemptions.forEach((r) => {
      const actId = r.activity.id;
      const existing = activityCountsMap.get(actId) || { id: actId, name: r.activity.name, count: 0, creditsUsed: 0 };
      existing.count += 1;
      existing.creditsUsed += r.creditsUsed;
      activityCountsMap.set(actId, existing);
    });

    const popularActivities = Array.from(activityCountsMap.values()).sort((a, b) => b.count - a.count);

    return NextResponse.json({
      summary: {
        totalRedemptions: redemptions.length,
        totalCreditsUsed: redemptions.reduce((acc, r) => acc + r.creditsUsed, 0),
      },
      departmentSpend,
      popularActivities,
      recentRedemptions: redemptions.slice(0, 20),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch reports" }, { status: 500 });
  }
}

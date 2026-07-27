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
  const status = searchParams.get("status");
  const format = searchParams.get("format")?.toLowerCase() || "json";

  try {
    const where: any = {};

    if (startDateStr || endDateStr) {
      where.createdAt = {};
      if (startDateStr) where.createdAt.gte = new Date(startDateStr);
      if (endDateStr) where.createdAt.lte = new Date(endDateStr);
    }

    if (status && status !== "all") {
      where.status = status;
    }

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        client: {
          select: { fullName: true, email: true, phone: true },
        },
        organization: {
          select: { name: true },
        },
      },
    });

    if (format === "csv") {
      const csvRows = [
        "InvoiceCode,ClientOrOrg,Category,AmountDA,Status,PaidAt,CreatedAt",
      ];

      for (const inv of invoices) {
        const clientOrOrg = (inv.organization?.name || inv.client?.fullName || "N/A").replace(/,/g, " ");
        const category = (inv.category || "").replace(/,/g, " ");
        const paidAt = inv.paidAt ? inv.paidAt.toISOString() : "";
        const createdAt = inv.createdAt ? inv.createdAt.toISOString() : "";

        csvRows.push(
          `${inv.invoiceCode},"${clientOrOrg}","${category}",${inv.amount},${inv.status},${paidAt},${createdAt}`
        );
      }

      const csvContent = csvRows.join("\n");

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="invoices-export.csv"',
        },
      });
    }

    return NextResponse.json(invoices);
  } catch (err: unknown) {
    console.error("GET invoices export error:", err);
    return NextResponse.json(
      { error: "Failed to export invoices" },
      { status: 500 }
    );
  }
}

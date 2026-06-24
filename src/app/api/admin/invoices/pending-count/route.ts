import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/api-auth";

export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  try {
    const unpaidInvoices = await prisma.invoice.findMany({
      where: {
        status: "unpaid",
        notes: {
          startsWith: "{",
          endsWith: "}",
        },
      },
      select: {
        notes: true,
      },
    });

    let pendingCount = 0;
    for (const inv of unpaidInvoices) {
      if (inv.notes) {
        try {
          const parsed = JSON.parse(inv.notes);
          if (parsed && (parsed.type === "package" || parsed.type === "custom")) {
            pendingCount++;
          }
        } catch {
          // Ignore
        }
      }
    }

    return NextResponse.json({ count: pendingCount });
  } catch (err: unknown) {
    console.error("GET pending-count API error:", err);
    return NextResponse.json({ error: "Failed to fetch pending count" }, { status: 500 });
  }
}

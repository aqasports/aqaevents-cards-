import { NextRequest, NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/api-auth";
import { processEmployeeCsvImport } from "@/lib/csv-import";
import { logAdminAction } from "@/lib/audit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const importSchema = z.object({
  csvContent: z.string().min(5, "CSV content is required"),
  commit: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  const { session, organizationId, role, error } = await requireOrgSession(["OWNER", "HR_MANAGER"]);
  if (error || !session || !organizationId) return error;

  try {
    const body = await request.json();
    const validated = importSchema.parse(body);

    const result = await processEmployeeCsvImport(validated.csvContent, organizationId, validated.commit);

    if (validated.commit && result.importedCount && result.importedCount > 0) {
      await logAdminAction(
        session.user.id,
        "BULK_EMPLOYEE_IMPORT",
        organizationId,
        `Bulk imported ${result.importedCount} employees via CSV (${role})`
      );
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "CSV processing failed" }, { status: 400 });
  }
}

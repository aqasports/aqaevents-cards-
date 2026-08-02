import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { DepartmentsService } from "@/modules/departments/service";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const { id } = await params;
    const service = new DepartmentsService();
    const depts = await service.getDepartments(id);
    return NextResponse.json(depts);
  } catch (err: any) {
    logger.error("GET organization departments error:", err);
    return NextResponse.json({ error: "Failed to fetch departments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    const service = new DepartmentsService();

    const dept = await service.createDepartment(
      {
        ...body,
        organizationId: id,
      },
      session.user.id
    );

    return NextResponse.json(dept, { status: 201 });
  } catch (err: any) {
    logger.error("POST department error:", err);
    return NextResponse.json({ error: err?.message || "Failed to create department" }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const body = await request.json();
    const { departmentId, ...updates } = body;

    if (!departmentId) {
      return NextResponse.json({ error: "departmentId is required" }, { status: 400 });
    }

    const service = new DepartmentsService();
    const updated = await service.updateDepartment(departmentId, updates, session.user.id);

    return NextResponse.json(updated);
  } catch (err: any) {
    logger.error("PATCH department error:", err);
    return NextResponse.json({ error: err?.message || "Failed to update department" }, { status: 400 });
  }
}

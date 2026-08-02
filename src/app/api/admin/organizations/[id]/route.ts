import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession, requireSuperAdminSession } from "@/lib/api-auth";
import { OrganizationsService } from "@/modules/organizations/service";
import { logger } from "@/lib/logger";

const orgsService = new OrganizationsService();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;

  try {
    const org = await orgsService.getOrganization(id);
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }
    return NextResponse.json(org);
  } catch (err: unknown) {
    logger.error("GET organization API error:", err);
    return NextResponse.json({ error: "Failed to fetch organization" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id } = await params;
  try {
    const body = await request.json();
    const updated = await orgsService.updateOrganization(id, body, session.user.id);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    logger.error("PATCH organization API error:", err);
    const message = err instanceof Error ? err.message : "Failed to update organization";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSuperAdminSession();
  if (error || !session) return error;

  const { id } = await params;

  try {
    const result = await orgsService.deleteOrganization(id, session.user.id);
    return NextResponse.json(result);
  } catch (err: unknown) {
    logger.error("DELETE organization API error:", err);
    const message = err instanceof Error ? err.message : "Failed to delete organization";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

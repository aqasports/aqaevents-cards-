import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession, requireSuperAdminSession } from "@/lib/api-auth";
import { OrganizationsService } from "@/modules/organizations/service";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, max-age=0, must-revalidate, proxy-revalidate",
};

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
      return NextResponse.json({ error: "Organization not found" }, { status: 404, headers: NO_CACHE_HEADERS });
    }
    return NextResponse.json(org, { headers: NO_CACHE_HEADERS });
  } catch (err: unknown) {
    logger.error("GET organization API error:", err);
    const details = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to fetch organization: ${details}` }, { status: 500, headers: NO_CACHE_HEADERS });
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

import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { OrganizationsService } from "@/modules/organizations/service";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, max-age=0, must-revalidate, proxy-revalidate",
};

const orgsService = new OrganizationsService();

export async function GET(_request: NextRequest) {
  const { error } = await requireAdminSession();
  if (error) return error;

  try {
    const orgs = await orgsService.getOrganizations();
    return NextResponse.json(orgs, { headers: NO_CACHE_HEADERS });
  } catch (err: unknown) {
    logger.error("GET organizations API error:", err);
    const details = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to fetch organizations: ${details}` },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const body = await request.json();
    const org = await orgsService.createOrganization(body, session.user.id);
    return NextResponse.json(org, { status: 201 });
  } catch (err: unknown) {
    logger.error("POST organization API error:", err);
    const message = err instanceof Error ? err.message : "Failed to create organization";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}


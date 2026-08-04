import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession, requireSuperAdminSession } from "@/lib/api-auth";
import { ClientsService } from "@/modules/clients/service";
import { updateClientSchema } from "@/modules/clients/validators";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const clientsService = new ClientsService();

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, max-age=0, must-revalidate, proxy-revalidate",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;

  try {
    const client = await clientsService.getClient(id);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    return NextResponse.json(client, { headers: NO_CACHE_HEADERS });
  } catch (err: unknown) {
    logger.error("GET client details API error:", err);
    return NextResponse.json({ error: "Failed to fetch client details" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateClientSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const client = await clientsService.updateClient(id, parsed.data, session.user.id);
    return NextResponse.json(client);
  } catch (err: unknown) {
    logger.error("PATCH client API error:", err);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireSuperAdminSession();
  if (error || !session) return error;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "true";
  const deleteRelated = searchParams.get("deleteRelated") === "true";

  try {
    const result = await clientsService.deleteClient(id, session.user.id, { force, deleteRelated });
    return NextResponse.json(result);
  } catch (err: unknown) {
    logger.error("DELETE client API error:", err);
    const message = err instanceof Error ? err.message : "Database error during client deletion.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/lib/api-auth";
import { ClientsService } from "@/modules/clients/service";

const clientsService = new ClientsService();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireSuperAdminSession();
  if (error || !session) return error;

  const { id } = await params;

  try {
    const result = await clientsService.unarchiveClient(id, session.user.id);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("POST client unarchive API error:", err);
    const message = err instanceof Error ? err.message : "Database error during client restoration.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

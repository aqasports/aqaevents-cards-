import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { ClientsService } from "@/domains/clients/clients.service";

const clientsService = new ClientsService();

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id: clientId } = await params;

  try {
    const card = await clientsService.reissueCard(clientId, null, session.user.id);
    return NextResponse.json(card);
  } catch (err: unknown) {
    console.error("POST reissue-card API error:", err);
    const message = err instanceof Error ? err.message : "Failed to reissue card.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

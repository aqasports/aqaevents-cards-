import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession, requireSuperAdminSession } from "@/lib/api-auth";
import { ClientsService } from "@/domains/clients/clients.service";

const clientsService = new ClientsService();

const updateClientSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  leadSource: z.string().optional().nullable(),
});

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
    return NextResponse.json(client);
  } catch (err: unknown) {
    console.error("GET client details API error:", err);
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
    console.error("PATCH client API error:", err);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireSuperAdminSession();
  if (error || !session) return error;

  const { id } = await params;

  try {
    const result = await clientsService.deleteClient(id, session.user.id);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("DELETE client API error:", err);
    const message = err instanceof Error ? err.message : "Database error during client deletion.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

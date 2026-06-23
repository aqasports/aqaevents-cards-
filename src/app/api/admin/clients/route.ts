import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/api-auth";
import { ClientsService } from "@/domains/clients/clients.service";

const clientsService = new ClientsService();

const createClientSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
  packageId: z.string().optional(),
  issueCard: z.boolean().default(true),
  preCardCode: z.string().optional(),
  leadSource: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || undefined;
  const limit = parseInt(searchParams.get("limit") ?? "0", 10) || undefined;

  try {
    const clients = await clientsService.getClients(search, limit);
    return NextResponse.json(clients);
  } catch (err: unknown) {
    console.error("GET clients API error:", err);
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const body = await request.json();
  const parsed = createClientSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const client = await clientsService.createClient(parsed.data, session.user.id);
    return NextResponse.json(client, { status: 201 });
  } catch (err: unknown) {
    console.error("POST client API error:", err);
    const details = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: `Database error during client creation: ${details}. If you recently reset the database, please try logging out of the admin panel and logging back in to refresh your session.`
      },
      { status: 500 }
    );
  }
}

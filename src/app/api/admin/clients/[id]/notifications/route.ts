import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { ClientsService } from "@/domains/clients/clients.service";

const clientsService = new ClientsService();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;

  try {
    const logs = await clientsService.getNotificationLogs(id);
    return NextResponse.json(logs);
  } catch (err: unknown) {
    console.error("GET client notifications API error:", err);
    return NextResponse.json({ error: "Failed to fetch notification logs" }, { status: 500 });
  }
}

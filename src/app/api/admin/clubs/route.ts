import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { generateClubTerminalToken } from "@/lib/tokens";
import { z } from "zod";

const createClubSchema = z.object({
  name: z.string().min(2),
  contactName: z.string().optional().nullable(),
  contactEmail: z.string().email().or(z.literal("")).optional().nullable(),
  contactPhone: z.string().optional().nullable(),
});

export async function GET() {
  const { error } = await requireSuperAdminSession();
  if (error) return error;

  try {
    const clubs = await prisma.club.findMany({
      include: {
        activities: {
          select: { id: true, name: true },
        },
        _count: { select: { checkIns: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(clubs);
  } catch (err) {
    console.error("GET clubs error:", err);
    return NextResponse.json({ error: "Failed to fetch clubs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireSuperAdminSession();
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = createClubSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const terminalToken = generateClubTerminalToken();

    const club = await prisma.club.create({
      data: {
        name: parsed.data.name,
        contactName: parsed.data.contactName ?? null,
        contactEmail: parsed.data.contactEmail || null,
        contactPhone: parsed.data.contactPhone ?? null,
        terminalToken,
        isActive: true,
      },
    });

    return NextResponse.json(club, { status: 201 });
  } catch (err) {
    console.error("POST club error:", err);
    return NextResponse.json({ error: "Failed to create club" }, { status: 500 });
  }
}

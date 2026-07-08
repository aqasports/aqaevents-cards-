import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createClubSchema = z.object({
  name: z.string().min(2),
  contact: z.string().optional().nullable(),
});

export async function GET() {
  const { error } = await requireSuperAdminSession();
  if (error) return error;

  try {
    const clubs = await prisma.club.findMany({
      include: {
        sessions: {
          include: {
            activity: { select: { id: true, name: true } },
          },
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

  const body = await request.json();
  const parsed = createClubSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const club = await prisma.club.create({
      data: {
        name: parsed.data.name,
        contact: parsed.data.contact ?? null,
      },
    });
    return NextResponse.json(club, { status: 201 });
  } catch (err) {
    console.error("POST club error:", err);
    return NextResponse.json({ error: "Failed to create club" }, { status: 500 });
  }
}

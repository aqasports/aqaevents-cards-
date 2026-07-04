import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }

  entry.count += 1;
  return entry.count > 10;
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const { title, description, userName, userPhone, userEmail } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400, headers: corsHeaders });
    }
    if (!description || !description.trim()) {
      return NextResponse.json({ error: "Description is required" }, { status: 400, headers: corsHeaders });
    }
    if (!userName || !userName.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400, headers: corsHeaders });
    }
    if (!userPhone || !userPhone.trim()) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400, headers: corsHeaders });
    }

    const proposal = await prisma.activityProposal.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        userName: userName.trim(),
        userPhone: userPhone.trim(),
        userEmail: userEmail && userEmail.trim() ? userEmail.trim() : null,
        status: "pending",
      },
    });

    return NextResponse.json(proposal, { status: 201, headers: corsHeaders });
  } catch (err: unknown) {
    console.error("POST public proposals API error:", err);
    return NextResponse.json({ error: "Failed to submit proposal" }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

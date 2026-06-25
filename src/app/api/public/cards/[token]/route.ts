import { NextRequest, NextResponse } from "next/server";
import { CardsService } from "@/modules/cards/service";

const cardsService = new CardsService();

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }

  entry.count += 1;
  return entry.count > 60;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { token } = await params;

  try {
    const cardData = await cardsService.getPublicCardByToken(token);
    if (!cardData) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }
    return NextResponse.json(cardData, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    console.error("GET public card API error:", err);
    return NextResponse.json({ error: "Failed to fetch card info" }, { status: 500 });
  }
}

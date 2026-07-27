import { NextRequest, NextResponse } from "next/server";
import { CardsService } from "@/modules/cards/service";
import { checkAndIncrement } from "@/lib/rate-limit";

const cardsService = new CardsService();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const { limited } = await checkAndIncrement(`cards-token:${ip}`, { windowMs: 60_000, max: 60 });
  if (limited) {
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

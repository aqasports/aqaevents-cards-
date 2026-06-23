import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { CardsService } from "@/domains/cards/cards.service";

const cardsService = new CardsService();

export async function GET(request: NextRequest) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const token = request.nextUrl.searchParams.get("token");
  const cardCode = request.nextUrl.searchParams.get("code");
  const query = request.nextUrl.searchParams.get("query");

  if (!token && !cardCode && !query) {
    return NextResponse.json(
      { error: "Provide token, code, or query param" },
      { status: 400 },
    );
  }

  try {
    const result = await cardsService.searchCards({ token, cardCode, query });
    if (!result) {
      return NextResponse.json({ error: "No client or card found matching that query" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("GET card lookup API error:", err);
    return NextResponse.json({ error: "Failed to perform card lookup" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { validateAndApplyPromoCode } from "@/lib/campaigns";
import { checkAndIncrement } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const { limited } = await checkAndIncrement(`promo:${ip}`, { windowMs: 60_000, max: 20 });
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: corsHeaders }
    );
  }

  try {
    const body = await request.json();
    const { code, originalPrice } = body;

    const price = Number(originalPrice);
    if (isNaN(price) || price < 0) {
      return NextResponse.json(
        { error: "Valid non-negative originalPrice is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const result = await validateAndApplyPromoCode(code, price);

    if (!result.valid) {
      return NextResponse.json(
        {
          valid: false,
          error: result.error,
          discountAmount: 0,
          finalPrice: price,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        valid: true,
        discountAmount: result.discountAmount,
        finalPrice: result.finalPrice,
        promo: {
          code: result.promo?.code,
          discountType: result.promo?.discountType,
          discountValue: result.promo?.discountValue,
        },
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: unknown) {
    logger.error("POST public promo validate error:", err);
    return NextResponse.json(
      { error: "Failed to validate promo code" },
      { status: 500, headers: corsHeaders }
    );
  }
}

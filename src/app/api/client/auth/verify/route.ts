import { NextRequest, NextResponse } from "next/server";
import { verifyMagicPin } from "@/lib/client-auth";
import { getClientEffectiveBalance } from "@/lib/organizations";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneOrEmail, pin } = body;

    if (!phoneOrEmail || !pin) {
      return NextResponse.json(
        { error: "phoneOrEmail and pin are required" },
        { status: 400 }
      );
    }

    const result = await verifyMagicPin(String(phoneOrEmail), String(pin));

    if (!result.success || !result.client) {
      return NextResponse.json(
        { error: result.error || "Verification failed" },
        { status: 400 }
      );
    }

    const creditBalance = await getClientEffectiveBalance(result.client.id);

    const response = NextResponse.json({
      success: true,
      token: result.token,
      client: {
        id: result.client.id,
        fullName: result.client.fullName,
        email: result.client.email,
        phone: result.client.phone,
        organizationId: result.client.organizationId,
      },
      creditBalance,
    });

    if (result.token) {
      response.cookies.set("client_token", result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: "/",
      });
    }

    return response;
  } catch (err: unknown) {
    logger.error("POST client auth verify error:", err);
    return NextResponse.json(
      { error: "Failed to verify PIN" },
      { status: 500 }
    );
  }
}

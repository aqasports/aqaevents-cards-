import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAndIncrement } from "@/lib/rate-limit";
import { verifyCaptcha } from "@/lib/captcha";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const { limited } = await checkAndIncrement(`proposals:${ip}`, { windowMs: 60_000, max: 10 });
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: corsHeaders }
    );
  }

  try {
    const body = await request.json();
    const captchaToken = body.captchaToken || request.headers.get("x-captcha-token");
    const captchaResult = await verifyCaptcha(captchaToken, ip);
    if (!captchaResult.success) {
      return NextResponse.json(
        { error: "CAPTCHA_VERIFICATION_FAILED" },
        { status: 400, headers: corsHeaders }
      );
    }

    const {
      title,
      description,
      userName,
      userPhone,
      userEmail,
      marketingConsent,
      utmSource,
      utmMedium,
      utmCampaign,
    } = body;

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
        marketingConsent: Boolean(marketingConsent),
        utmSource: utmSource ? String(utmSource).trim() : null,
        utmMedium: utmMedium ? String(utmMedium).trim() : null,
        utmCampaign: utmCampaign ? String(utmCampaign).trim() : null,
      },
    });

    return NextResponse.json(proposal, { status: 201, headers: corsHeaders });
  } catch (err: unknown) {
    logger.error("POST public proposals API error:", err);
    return NextResponse.json({ error: "Failed to submit proposal" }, { status: 500, headers: corsHeaders });
  }
}

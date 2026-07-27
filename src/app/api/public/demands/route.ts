import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAndIncrement } from "@/lib/rate-limit";
import { getCreditRate } from "@/lib/settings";
import { verifyCaptcha } from "@/lib/captcha";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const { limited } = await checkAndIncrement(`demands:${ip}`, { windowMs: 60_000, max: 15 });
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
      name,
      phone,
      email,
      creditType,
      packageId,
      amount,
      marketingConsent,
      utmSource,
      utmMedium,
      utmCampaign,
      referrer,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400, headers: corsHeaders });
    }
    if (!phone || !phone.trim()) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400, headers: corsHeaders });
    }
    if (creditType !== "package" && creditType !== "custom") {
      return NextResponse.json({ error: "Invalid credit type" }, { status: 400, headers: corsHeaders });
    }

    let calculatedPrice = 0;
    let creditDetails = "";

    if (creditType === "package") {
      if (!packageId) {
        return NextResponse.json({ error: "Package is required" }, { status: 400, headers: corsHeaders });
      }
      const pkg = await prisma.package.findUnique({
        where: { id: packageId },
      });
      if (!pkg) {
        return NextResponse.json({ error: "Package not found" }, { status: 400, headers: corsHeaders });
      }
      calculatedPrice = pkg.price;
      creditDetails = `Package: ${pkg.name} (${pkg.totalCredits} credits)`;
    } else {
      const parsedAmount = parseInt(amount, 10);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return NextResponse.json({ error: "Valid custom credit amount is required" }, { status: 400, headers: corsHeaders });
      }
      const creditRate = await getCreditRate();
      calculatedPrice = parsedAmount * creditRate;
      creditDetails = `Custom Credits: ${parsedAmount} credits`;
    }

    const demand = await prisma.cardDemand.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        email: email && email.trim() ? email.trim() : null,
        creditType,
        packageId: creditType === "package" ? packageId : null,
        amount: creditType === "custom" ? parseInt(amount, 10) : null,
        price: calculatedPrice,
        status: "pending",
        marketingConsent: Boolean(marketingConsent),
        utmSource: utmSource ? String(utmSource).trim() : null,
        utmMedium: utmMedium ? String(utmMedium).trim() : null,
        utmCampaign: utmCampaign ? String(utmCampaign).trim() : null,
        referrer: referrer ? String(referrer).trim() : null,
      },
    });

    // Compute updated total money in queue
    const pendingSum = await prisma.cardDemand.aggregate({
      where: { status: "pending" },
      _sum: { price: true },
    });
    const totalMoneyQueue = pendingSum._sum.price ?? 0;

    // Simulate WhatsApp notification to admin (using env variable)
    const adminPhone = process.env.ADMIN_NOTIFICATION_PHONE ?? "+213540454907";
    const adminMessage = `New AQA Card demand received!
Client: ${demand.name}
Phone: ${demand.phone}${demand.email ? `\nEmail: ${demand.email}` : ""}
Desired Credit: ${creditDetails}
Price: ${calculatedPrice.toLocaleString("fr-DZ")} DA
Total money in demand queue: ${totalMoneyQueue.toLocaleString("fr-DZ")} DA.`;

    console.log(`[SIMULATED WHATSAPP MESSAGE SENT]
To Admin: ${adminPhone}
Message: ${adminMessage}
`);

    return NextResponse.json(demand, { status: 201, headers: corsHeaders });
  } catch (err: unknown) {
    console.error("POST public demands API error:", err);
    return NextResponse.json({ error: "Failed to submit card demand" }, { status: 500, headers: corsHeaders });
  }
}

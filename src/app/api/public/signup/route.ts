import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSimulatedNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }

  entry.count += 1;
  return entry.count > 15;
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { fullName, email, phone, packageId } = body;

    if (!fullName || !fullName.trim()) {
      return NextResponse.json({ error: "Missing fullName" }, { status: 400 });
    }

    if (!packageId) {
      return NextResponse.json({ error: "Missing packageId" }, { status: 400 });
    }

    // Verify package exists and is active
    const pkg = await prisma.package.findUnique({
      where: { id: packageId, active: true },
    });

    if (!pkg) {
      return NextResponse.json({ error: "Selected package is invalid or inactive" }, { status: 400 });
    }

    const cleanPhone = phone ? phone.trim() : "";
    const cleanEmail = email && email.trim() ? email.trim() : null;

    // Create a pending card demand instead of directly creating client and auto-granting credits
    const demand = await prisma.cardDemand.create({
      data: {
        name: fullName.trim(),
        phone: cleanPhone,
        email: cleanEmail,
        creditType: "package",
        packageId,
        amount: null,
        price: pkg.price,
        status: "pending",
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
    const adminMessage = `New AQA Card demand received via self-signup!
Client: ${demand.name}
Phone: ${demand.phone}${demand.email ? `\nEmail: ${demand.email}` : ""}
Desired Credit: Package: ${pkg.name} (${pkg.totalCredits} credits)
Price: ${pkg.price.toLocaleString("fr-DZ")} DA
Total money in demand queue: ${totalMoneyQueue.toLocaleString("fr-DZ")} DA.`;

    console.log(`[SIMULATED WHATSAPP MESSAGE SENT]
To Admin: ${adminPhone}
Message: ${adminMessage}
`);

    return NextResponse.json({
      success: true,
      message: "Signup request submitted successfully and is pending approval.",
      demand,
    }, { status: 201 });

  } catch (err: unknown) {
    console.error("POST public signup API error:", err);
    const details = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Signup submission failed: ${details}` },
      { status: 500 }
    );
  }
}

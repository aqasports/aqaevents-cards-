import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, email, creditType, packageId, amount } = body;

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
      calculatedPrice = parsedAmount * 1900;
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
      },
    });

    // Compute updated total money in queue
    const pendingSum = await prisma.cardDemand.aggregate({
      where: { status: "pending" },
      _sum: { price: true },
    });
    const totalMoneyQueue = pendingSum._sum.price ?? 0;

    // Simulate WhatsApp notification to admin (+213540454907)
    const adminPhone = "+213540454907";
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

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

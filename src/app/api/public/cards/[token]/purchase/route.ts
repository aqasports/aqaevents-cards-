import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BillingService } from "@/domains/billing/billing.service";

const billingService = new BillingService();

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }

  entry.count += 1;
  return entry.count > 15; // lower limit for purchases
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { token } = await params;

  // Verify card exists, is active, and has client
  const card = await prisma.card.findUnique({
    where: { publicToken: token },
  });

  if (!card || card.status !== "active" || !card.clientId) {
    return NextResponse.json({ error: "Card not found or inactive" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { type, packageId, customCredits, productId } = body;

    if (type === "package") {
      if (!packageId) {
        return NextResponse.json({ error: "Missing packageId" }, { status: 400 });
      }

      const pkg = await prisma.package.findUnique({
        where: { id: packageId, active: true },
      });

      if (!pkg) {
        return NextResponse.json({ error: "Package not found or inactive" }, { status: 400 });
      }

      const result = await billingService.createInvoiceWithCredits(
        {
          clientId: card.clientId,
          amount: pkg.price,
          category: "package",
          items: `${pkg.name} Package — ${pkg.creditAmount} credits + ${pkg.bonusCredits} bonus (${pkg.totalCredits} total)`,
          status: "unpaid",
          notes: JSON.stringify({
            type: "package",
            packageId: pkg.id,
            credits: pkg.totalCredits,
            reason: `Public Demand: ${pkg.name} (On Credit)`,
            originalNotes: "Demanded on credit via client page",
          }),
        }
      );

      return NextResponse.json({
        success: true,
        message: `Package ${pkg.name} demanded on credit successfully.`,
        invoice: result.invoice,
        balance: result.balance,
      });

    } else if (type === "custom") {
      const credits = Number(customCredits);
      if (isNaN(credits) || credits <= 0) {
        return NextResponse.json({ error: "Invalid custom credits amount" }, { status: 400 });
      }

      const price = credits * 1900;
      const result = await billingService.createInvoiceWithCredits(
        {
          clientId: card.clientId,
          amount: price,
          category: "custom",
          items: `Custom Credit Recharge — ${credits} activities`,
          status: "unpaid",
          notes: JSON.stringify({
            type: "custom",
            credits: credits,
            reason: `Public Demand: Custom Credit (${credits} activities) (On Credit)`,
            originalNotes: "Demanded on credit via client page",
          }),
        }
      );

      return NextResponse.json({
        success: true,
        message: `Custom credit of ${credits} activities demanded successfully.`,
        invoice: result.invoice,
        balance: result.balance,
      });

    } else if (type === "product") {
      if (!productId) {
        return NextResponse.json({ error: "Missing productId" }, { status: 400 });
      }

      const product = await prisma.product.findUnique({
        where: { id: productId, active: true },
      });

      if (!product) {
        return NextResponse.json({ error: "Product not found" }, { status: 400 });
      }

      const result = await billingService.createInvoiceWithCredits(
        {
          clientId: card.clientId,
          amount: product.price,
          category: "adhoc",
          items: `Product: ${product.name}`,
          status: "unpaid",
          notes: JSON.stringify({
            type: "product",
            productId: product.id,
            originalNotes: "Product ordered on credit via client page",
          }),
        }
      );

      return NextResponse.json({
        success: true,
        message: `Product ${product.name} ordered on credit successfully.`,
        invoice: result.invoice,
        balance: result.balance,
      });

    } else {
      return NextResponse.json({ error: "Invalid purchase type" }, { status: 400 });
    }

  } catch (err: unknown) {
    console.error("POST public purchase API error:", err);
    return NextResponse.json({ error: "Failed to process purchase request" }, { status: 500 });
  }
}

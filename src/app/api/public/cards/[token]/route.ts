import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientBalance } from "@/lib/balance";
import { getFirstName } from "@/lib/tokens";

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

  const card = await prisma.card.findUnique({
    where: { publicToken: token },
    include: {
      client: {
        include: {
          redemptions: {
            include: {
              activity: true,
              session: true,
            },
            orderBy: { redeemedAt: "desc" },
            take: 50,
          },
          ledgerEntries: {
            include: { package: true },
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      },
    },
  });

  if (!card || card.status !== "active" || !card.clientId || !card.client) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const balance = await getClientBalance(card.clientId);

  const history = card.client.redemptions.map((redemption) => ({
    activity: redemption.activity.name,
    date: redemption.session?.sessionDate ?? redemption.redeemedAt,
    creditsUsed: redemption.creditsUsed,
    redeemedAt: redemption.redeemedAt,
    location: redemption.session?.location ?? null,
  }));

  const credits = card.client.ledgerEntries
    .filter((entry) => entry.delta > 0)
    .map((entry) => ({
      label: entry.package?.name ?? entry.reason ?? "Credit added",
      amount: entry.delta,
      date: entry.createdAt,
    }));

  return NextResponse.json(
    {
      cardCode: card.cardCode,
      clientFirstName: getFirstName(card.client.fullName),
      balance,
      credits,
      history,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getClientBalance } from "@/lib/balance";
import { getFirstName, getEventCardUrl } from "@/lib/tokens";
import { EventCardClient } from "./event-card-client";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Your Activity Card · AQA Sports",
    description: "View your AQA Sports activity balance and history.",
  };
}

export default async function EventCardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const card = await prisma.card.findUnique({
    where: { publicToken: token },
    include: {
      client: {
        include: {
          redemptions: {
            include: { activity: true, session: true },
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
    notFound();
  }

  const balance = await getClientBalance(card.clientId);

  const history = card.client.redemptions.map((r) => ({
    activity: r.activity.name,
    date: r.session?.sessionDate ?? r.redeemedAt,
    creditsUsed: r.creditsUsed,
    redeemedAt: r.redeemedAt,
    location: r.session?.location ?? null,
  }));

  const credits = card.client.ledgerEntries
    .filter((e) => e.delta > 0)
    .map((e) => ({
      label: e.package?.name ?? e.reason ?? "Credit added",
      amount: e.delta,
      paid: e.package ? e.package.creditAmount : e.delta,
      bonus: e.package ? e.package.bonusCredits : 0,
      date: e.createdAt,
    }));

  const cardUrl = getEventCardUrl(card.publicToken);
  const qrDataUrl = await QRCode.toDataURL(cardUrl, { width: 300, margin: 1 });

  const activePackages = await prisma.package.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });

  const advertisedProducts = await prisma.product.findMany({
    where: { active: true, advertised: true },
    orderBy: [
      { sortOrder: "asc" },
      { createdAt: "desc" },
    ],
  });

  return (
    <EventCardClient
      cardCode={card.cardCode}
      clientFirstName={card.client.fullName}
      balance={balance}
      history={history}
      credits={credits}
      qrDataUrl={qrDataUrl}
      packages={activePackages}
      products={advertisedProducts}
      publicToken={card.publicToken}
    />
  );
}

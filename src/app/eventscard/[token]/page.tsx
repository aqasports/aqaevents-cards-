import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getClientBalance } from "@/lib/balance";
import { getFirstName, getEventCardUrl } from "@/lib/tokens";
import { getCreditRate } from "@/lib/settings";
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
    select: {
      id: true,
      cardCode: true,
      publicToken: true,
      status: true,
      clientId: true,
      organizationId: true,
      client: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          ledgerEntries: {
            select: {
              id: true,
              delta: true,
              reason: true,
              createdAt: true,
              package: {
                select: {
                  id: true,
                  name: true,
                  creditAmount: true,
                  bonusCredits: true,
                },
              },
              redemption: {
                select: {
                  id: true,
                  redeemedAt: true,
                  creditsUsed: true,
                  activity: {
                    select: { id: true, name: true },
                  },
                  session: {
                    select: { id: true, sessionDate: true, location: true },
                  },
                  checkIns: {
                    select: { scannedAt: true, status: true },
                    orderBy: { scannedAt: "desc" },
                    take: 1,
                  },
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      },
    },
  });

  // Handle blank org cards -- show branded activation page
  if (card && card.status === "active" && !card.clientId) {
    let orgData: { name: string; logoUrl: string | null; slug: string } | null = null;

    if (card.organizationId) {
      orgData = await prisma.organization.findUnique({
        where: { id: card.organizationId },
        select: { name: true, logoUrl: true, slug: true },
      });
    }

    return (
      <div
        className="flex min-h-screen items-center justify-center px-4"
        style={{ background: "linear-gradient(135deg, #030712 0%, #0c2a4a 50%, #0a3a6e 100%)" }}
      >
        <div className="w-full max-w-sm text-center space-y-6">
          {orgData?.logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={orgData.logoUrl}
              alt={orgData.name}
              className="h-16 w-auto mx-auto rounded-xl"
            />
          ) : (
            <div className="mx-auto h-16 w-16 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center">
              <span className="text-xl font-black text-sky-400">
                {orgData ? orgData.name.slice(0, 3).toUpperCase() : "AQA"}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">
              {orgData ? `${orgData.name} Events Card` : "AQA Sports Events Card"}
            </h1>
            <p className="text-sm text-white/50 font-mono tracking-wider">
              {card.cardCode}
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
            <div className="h-10 w-10 mx-auto rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-white">Card Not Yet Activated</h2>
            <p className="text-xs text-white/50 leading-relaxed">
              This card has been issued but is not yet linked to an employee account.
              Please contact your company&apos;s HR department or your AQA Sports account manager to activate this card.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
            <span className="text-xs font-semibold text-white/60">
              {orgData ? `${orgData.name} x AQA Sports` : "aqasports.com"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!card || card.status !== "active" || !card.clientId || !card.client) {
    notFound();
  }

  const balance = await getClientBalance(card.clientId);

  // Check if admin has flagged this client as "not paid"
  const notPaidFlag = await prisma.invoice.findFirst({
    where: { clientId: card.clientId, category: "not_paid_flag" },
    select: { id: true },
  });
  const isNotPaid = !!notPaidFlag;

  const creditRate = await getCreditRate();

  const history = card.client.ledgerEntries
    .filter((e) => e.delta < 0)
    .map((e) => {
      const r = e.redemption;
      const checkIn = r?.checkIns?.[0];
      return {
        activity: r ? (r.activity?.name ?? "Activity") : (e.reason ?? "Store Purchase"),
        sessionDate: r?.session?.sessionDate ?? null,
        checkInAt: checkIn?.scannedAt ?? null,
        date: r ? (r.session?.sessionDate ?? r.redeemedAt) : e.createdAt,
        creditsUsed: Math.abs(e.delta),
        redeemedAt: r ? r.redeemedAt : e.createdAt,
        location: r ? (r.session?.location ?? null) : "AQA Store",
        amountDa: Math.abs(e.delta) * creditRate,
      };
    });

  history.sort((a, b) => new Date(b.redeemedAt).getTime() - new Date(a.redeemedAt).getTime());

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
      isNotPaid={isNotPaid}
      creditRate={creditRate}
    />
  );
}

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function SwimCardScanPage({ params }: Props) {
  const { token } = await params;

  const card = await prisma.swimCard.findUnique({
    where: { publicToken: token },
    include: {
      member: {
        include: {
          group: true,
        },
      },
    },
  });

  if (!card) {
    notFound();
  }

  const member = card.member;
  const isPaid = member?.paymentStatus === "paid";
  const isPartial = member?.paymentStatus === "partial";

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-cyan-500 selection:text-black">
      {/* Background glow orbs */}
      <div className="fixed top-[-10%] left-[-10%] w-[60vw] h-[60vh] bg-sky-500/10 blur-[120px] pointer-events-none rounded-full" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[60vw] h-[60vh] bg-cyan-400/10 blur-[120px] pointer-events-none rounded-full" />

      <main className="w-full max-w-md relative z-10">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>AQA Swim</span>
            <span className="text-slate-500">·</span>
            <span>Official Pass</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Swimmer Verification
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Card Code: <span className="font-mono text-cyan-300">{card.cardCode}</span>
          </p>
        </div>

        {/* Card Face */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-6 shadow-2xl space-y-6">
          {!member ? (
            <div className="text-center py-8">
              <div className="h-12 w-12 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                !
              </div>
              <h2 className="text-base font-semibold text-white">Blank Card</h2>
              <p className="text-xs text-slate-400 mt-1">
                This PVC card is currently unassigned to any swimmer.
              </p>
            </div>
          ) : (
            <>
              {/* Profile Header */}
              <div className="flex items-center gap-4 pb-5 border-b border-white/10">
                {member.photoUrl ? (
                  <img
                    src={member.photoUrl}
                    alt={member.fullName}
                    className="h-16 w-16 rounded-2xl object-cover border border-cyan-400/40 shadow-[0_0_15px_rgba(0,242,255,0.2)]"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 text-slate-950 font-black text-xl flex items-center justify-center shadow-[0_0_15px_rgba(0,242,255,0.25)] shrink-0">
                    {member.fullName
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-white truncate">
                    {member.fullName}
                  </h2>
                  <p className="text-xs font-mono text-cyan-400 tracking-wider">
                    ID: {member.swimId}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-800 text-slate-300 border border-white/10">
                      {member.category}
                    </span>
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-sky-950/60 text-sky-400 border border-sky-800/40">
                      {member.level}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Status Banner */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Payment Status
                </p>
                {isPaid ? (
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-sm font-bold tracking-wide">PAID / A JOUR</span>
                    </div>
                    <span className="text-xs font-mono text-emerald-400 font-semibold">
                      {member.priceDA.toLocaleString("fr-DZ")} DA
                    </span>
                  </div>
                ) : isPartial ? (
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                      <span className="text-sm font-bold tracking-wide">PARTIAL PAYMENT</span>
                    </div>
                    <span className="text-xs font-mono text-amber-400 font-semibold">
                      {member.priceDA.toLocaleString("fr-DZ")} DA
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-300 animate-not-paid-blink shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                      <span className="text-sm font-black tracking-wide">NOT PAID / NON REGLE</span>
                    </div>
                    <span className="text-xs font-mono text-rose-400 font-bold">
                      {member.priceDA.toLocaleString("fr-DZ")} DA
                    </span>
                  </div>
                )}
              </div>

              {/* Group & Training details */}
              <div className="space-y-3 pt-2">
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Assigned Group</span>
                    <span className="text-xs font-bold text-white">
                      {member.group ? member.group.name : "No group assigned"}
                    </span>
                  </div>

                  {member.group?.coachName && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Coach</span>
                      <span className="text-xs font-semibold text-cyan-300">
                        {member.group.coachName}
                      </span>
                    </div>
                  )}

                  {member.group?.schedule && (
                    <div className="flex items-start justify-between gap-2 pt-1 border-t border-white/5">
                      <span className="text-xs text-slate-400 shrink-0">Schedule</span>
                      <span className="text-xs font-medium text-slate-200 text-right">
                        {member.group.schedule}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Formula</span>
                  <span className="font-semibold text-slate-200">
                    {member.formula} ({member.duration ?? "3m"})
                  </span>
                </div>

                {member.coachMessage && (
                  <div className="p-3.5 rounded-xl bg-sky-950/30 border border-sky-500/20">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-400 mb-1">
                      Word From Your Coach
                    </p>
                    <p className="text-xs italic text-slate-300">
                      &ldquo;{member.coachMessage}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Footer branding */}
          <div className="pt-3 border-t border-white/10 text-center">
            <p className="text-[11px] text-slate-500">
              AQA Sports Academy · Swimming Division
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, StatCard, Card, Badge, Button } from "@/components/admin/ui";
import { useTranslations } from "@/lib/i18n";

export default function SwimOverviewPage() {
  const [stats, setStats] = useState({
    pendingLeads: 0,
    totalMembers: 0,
    totalGroups: 0,
    totalCards: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [leadsRes, membersRes, groupsRes, cardsRes] = await Promise.all([
          fetch("/api/admin/swim/leads/pending-count"),
          fetch("/api/admin/swim/members"),
          fetch("/api/admin/swim/groups"),
          fetch("/api/admin/swim/cards"),
        ]);

        const leads = leadsRes.ok ? await leadsRes.json() : { count: 0 };
        const members = membersRes.ok ? await membersRes.json() : [];
        const groups = groupsRes.ok ? await groupsRes.json() : [];
        const cards = cardsRes.ok ? await cardsRes.json() : [];

        setStats({
          pendingLeads: leads.count ?? 0,
          totalMembers: members.length ?? 0,
          totalGroups: groups.length ?? 0,
          totalCards: cards.length ?? 0,
        });
      } catch (err) {
        console.error("Failed to load swim stats:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const sectors = [
    {
      title: "1. New Clients Lead (Wait List)",
      desc: "Receive and process new client demands submitted from aqasports.com. Call, confirm, propose groups, and promote to members.",
      href: "/admin/swim/leads",
      badge: stats.pendingLeads > 0 ? `${stats.pendingLeads} Pending` : "Up to date",
      badgeTone: stats.pendingLeads > 0 ? ("warning" as const) : ("success" as const),
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
      actionText: "Manage Leads",
    },
    {
      title: "2. Old Clients Profiles",
      desc: "Input and manage old clients profiles: name, phone, date of start, level, solid group proposal, and personal coach message.",
      href: "/admin/swim/members",
      badge: `${stats.totalMembers} Swimmers`,
      badgeTone: "info" as const,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      actionText: "Manage Profiles",
    },
    {
      title: "3. AQA Swim Groups Manager",
      desc: "Create and configure training groups, weekly time slots, coach assignments, capacity caps, and view enrolled swimmers.",
      href: "/admin/swim/groups",
      badge: `${stats.totalGroups} Groups`,
      badgeTone: "info" as const,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      actionText: "Manage Groups",
    },
    {
      title: "4. PVC Cards QR Code Generator",
      desc: "Generate blank PVC card batches (SWM-000001), export print-ready sheets, link cards to swimmers, and verify scan pages.",
      href: "/admin/swim/cards",
      badge: `${stats.totalCards} PVC Cards`,
      badgeTone: "info" as const,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
      ),
      actionText: "Generate & Print",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="AQA Swim Inscription Manager"
        description="Temporary operational module for managing swim inscriptions, old client profiles, training groups, and PVC pass cards."
      />

      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pending Leads (Wait List)"
          value={stats.pendingLeads}
          animated
          hint="Clients to call & confirm"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Registered Swimmers"
          value={stats.totalMembers}
          animated
          hint="Old and promoted clients"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />
        <StatCard
          label="Active Groups"
          value={stats.totalGroups}
          animated
          hint="Configured training slots"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />
        <StatCard
          label="Swim PVC Cards"
          value={stats.totalCards}
          animated
          hint="Issued and blank inventory"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          }
        />
      </div>

      {/* 4 Main Sectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {sectors.map((sec) => (
          <div
            key={sec.title}
            className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md p-6 shadow-sm hover:shadow-[var(--shadow-glow)] hover:border-[var(--primary)]/40 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary-light)] text-[var(--primary)] group-hover:bg-[var(--primary)] group-hover:text-white transition-all duration-300">
                  {sec.icon}
                </div>
                <Badge tone={sec.badgeTone}>{sec.badge}</Badge>
              </div>

              <h2 className="text-base font-bold text-white mb-2">
                {sec.title}
              </h2>
              <p className="text-xs text-[var(--muted)] leading-relaxed mb-6">
                {sec.desc}
              </p>
            </div>

            <Link
              href={sec.href}
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-[var(--primary)] hover:text-white text-cyan-400 font-semibold text-xs border border-white/5 transition-all duration-200"
            >
              <span>{sec.actionText}</span>
              <span>→</span>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

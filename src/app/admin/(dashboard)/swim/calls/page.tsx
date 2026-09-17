"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader, Button } from "@/components/admin/ui";
import { SwimCallsTab } from "@/components/admin/swim/SwimCallsTab";

function SwimCallsPageInner() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <PageHeader
        title="AQA Swim Reinscription & Renewal Call Desk"
        description="Proactively manage member subscription renewals, track client intentions, schedule follow-ups, and convert reinscriptions directly into active training groups."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => router.push("/admin/swim")} variant="secondary">
              Back to Swim Manager
            </Button>
            <Link
              href="/admin/swim?tab=confirmed"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-white/10 transition-colors"
            >
              Confirmed Swimmers
            </Link>
          </div>
        }
      />

      <SwimCallsTab />
    </div>
  );
}

export default function SwimCallsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-sm text-[var(--muted)] animate-pulse">
            Loading calling desk...
          </div>
        </div>
      }
    >
      <SwimCallsPageInner />
    </Suspense>
  );
}

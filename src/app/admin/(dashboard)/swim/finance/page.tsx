"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader, Button } from "@/components/admin/ui";
import { SwimFinanceDesk } from "@/components/admin/swim/finance/SwimFinanceDesk";
import { useTranslations } from "@/lib/i18n";

function SwimFinancePageInner() {
  const router = useRouter();
  const { t } = useTranslations("swimFinance");

  return (
    <div className="space-y-6">
      <div className="print:hidden space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 px-3.5 py-2">
          <div className="flex items-center gap-2 text-xs">
            <Link href="/admin" className="font-bold text-slate-400 hover:text-white transition-colors">
              AQA ERP
            </Link>
            <span className="text-slate-600">/</span>
            <Link href="/admin/swim" className="font-bold text-sky-400 hover:text-sky-300 transition-colors">
              AQA Swim
            </Link>
            <span className="text-slate-600">/</span>
            <span className="font-extrabold text-[var(--accent)]">{t("tabTitle")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/swim?tab=confirmed"
              className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 transition-colors"
            >
              Swimmer Profiles
            </Link>
            <span className="text-slate-600">·</span>
            <Link
              href="/admin/swim?tab=pool"
              className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Pool Direction
            </Link>
          </div>
        </div>

        <PageHeader
          title={t("tabTitle") + " - AQA Swim"}
          description={t("subtitle")}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => router.push("/admin/swim")} variant="secondary">
                Back to Swim Manager
              </Button>
            </div>
          }
        />
      </div>

      <SwimFinanceDesk />
    </div>
  );
}

export default function SwimFinancePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-sm text-[var(--muted)] animate-pulse">
            Loading financial accounting desk...
          </div>
        </div>
      }
    >
      <SwimFinancePageInner />
    </Suspense>
  );
}

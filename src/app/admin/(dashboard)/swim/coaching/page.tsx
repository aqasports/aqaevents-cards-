"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader, Button } from "@/components/admin/ui";
import { SwimCoachingDesk } from "@/components/admin/swim/coaching/SwimCoachingDesk";

function SwimCoachingPageInner() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          title="Espace Coaches & Assiduité - AQA Swim"
          description="Gestion des accès AQA Coaches App (Android / iOS), suivi de présence des groupes, encadrement technique et remplacements."
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => router.push("/admin/swim")} variant="secondary">
                Retour Gestionnaire Swim
              </Button>
              <Link
                href="/admin/swim?tab=groups"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-white/10 transition-colors"
              >
                Groupes d&apos;Entraînement
              </Link>
            </div>
          }
        />
      </div>

      <SwimCoachingDesk />
    </div>
  );
}

export default function SwimCoachingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-sm text-[var(--muted)] animate-pulse">
            Chargement de l&apos;espace coaching...
          </div>
        </div>
      }
    >
      <SwimCoachingPageInner />
    </Suspense>
  );
}

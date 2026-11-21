"use client";

import React, { useEffect, useState } from "react";
import { useTranslations, useLocale } from "@/lib/i18n";
import type { PublicKidsPhysicalPayload } from "@/lib/swim-kids-physical-server";
import type { WhoBmiBand } from "@/lib/swim-kids-physical";
import { KidsBodyMapSvg } from "@/components/swim/KidsBodyMapSvg";
import {
  KidsDomainRadarChart,
  KidsMetricTrendChart,
  KidsWhoBmiGauge,
} from "@/components/swim/KidsPhysicalCharts";
import {
  AquaticProgramHeroBanner,
  FootArchIllustration,
  KidsHeroBannerVisual,
  KneeAlignmentIllustration,
  SagittalSpineIllustration,
  ScoliosisAdamsIllustration,
} from "@/components/swim/KidsPostureIllustrations";

interface KidsPhysicalPortalSectionProps {
  memberName: string;
  swimId: string;
  data: PublicKidsPhysicalPayload;
}

type ModalTab = "overview" | "illustrations" | "growth" | "aquatic";

function fmtDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(
    locale === "ar" ? "ar-DZ-u-nu-latn" : locale === "en" ? "en-GB" : "fr-DZ",
    { year: "numeric", month: "short", day: "numeric" }
  );
}

function bmiBandKey(band: WhoBmiBand | null): string {
  switch (band) {
    case "severe_thinness":
      return "bmiSevereThinness";
    case "thinness":
      return "bmiThinness";
    case "overweight":
      return "bmiOverweight";
    case "obesity":
      return "bmiObesity";
    default:
      return "bmiNormal";
  }
}

function FunctionalBar({
  label,
  valueText,
  pct,
  color = "from-sky-500 to-cyan-300",
}: {
  label: string;
  valueText: string;
  pct: number;
  color?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-300 font-medium">{label}</span>
        <span className="font-mono font-bold text-white" dir="ltr">
          {valueText}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800/90">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-500`}
          style={{ width: `${Math.max(6, Math.min(100, pct))}%` }}
        />
      </div>
    </div>
  );
}

export function KidsPhysicalPortalSection({
  memberName,
  swimId,
  data,
}: KidsPhysicalPortalSectionProps) {
  const { t } = useTranslations("swimKidsPhysical");
  const { locale, setLocale, dir } = useLocale();
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ModalTab>("overview");
  const [selectedIdx, setSelectedIdx] = useState(0);

  const assessments = data.assessments ?? [];
  const active = assessments[selectedIdx] ?? assessments[0] ?? null;

  useEffect(() => {
    if (!modalOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [modalOpen]);

  const statusConfig = active
    ? active.evaluation.overallStatus === "referral"
      ? {
          label: t("statusReferral"),
          glow: "border-rose-500/35 shadow-[0_0_28px_rgba(239,68,68,0.14)]",
        }
      : active.evaluation.overallStatus === "watch"
        ? {
            label: t("statusWatch"),
            glow: "border-amber-500/35 shadow-[0_0_28px_rgba(245,158,11,0.14)]",
          }
        : {
            label: t("statusOptimal"),
            glow: "border-cyan-500/35 shadow-[0_0_28px_rgba(0,242,255,0.14)]",
          }
    : {
        label: t("portalBadge"),
        glow: "border-cyan-500/30 shadow-[0_0_24px_rgba(0,242,255,0.12)]",
      };

  const valLabel = (val: string) => t(`val_${val}`);

  const baseline =
    active && assessments.length >= 2 && data.first && data.first.assessment.id !== active.assessment.id
      ? data.first.evaluation.domainScores
      : null;

  return (
    <>
      {/* ─── INLINE ACCESS CARD ON PUBLIC SWIM PROFILE ─── */}
      <section
        className={`relative overflow-hidden rounded-2xl border bg-gradient-to-b from-slate-900/95 to-slate-950/95 p-3.5 backdrop-blur-xl transition-all space-y-3.5 ${statusConfig.glow}`}
      >
        {/* 4K 3D Holographic Hero Visual */}
        <KidsHeroBannerVisual
          status={active ? active.evaluation.overallStatus : "pending"}
          score={active ? active.evaluation.overallScore : null}
          statusLabel={statusConfig.label}
          scoreLabel={t("overallScore")}
          compact
        />

        <div className="px-0.5 space-y-1">
          <h2 className="text-sm font-extrabold text-white font-display leading-snug">
            {t("sectionTitle")}
          </h2>
          <p className="text-[11px] text-slate-300/90 leading-relaxed">
            {active
              ? `${t("assessedOn")} ${fmtDate(active.assessment.assessedAt, locale)} · ${t("bilansRecorded", { n: assessments.length })}`
              : t("entryCardDesc")}
          </p>
        </div>

        {/* Compact Metric Strip when assessed */}
        {active && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-white/10 bg-slate-950/75 px-2 py-2">
              <span className="block text-[9px] uppercase font-semibold text-slate-400">
                {t("height")}
              </span>
              <span className="font-mono text-xs font-bold text-white" dir="ltr">
                {active.assessment.heightCm !== null ? `${active.assessment.heightCm} cm` : "-"}
              </span>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/75 px-2 py-2">
              <span className="block text-[9px] uppercase font-semibold text-slate-400">
                {t("weight")}
              </span>
              <span className="font-mono text-xs font-bold text-white" dir="ltr">
                {active.assessment.weightKg !== null ? `${active.assessment.weightKg} kg` : "-"}
              </span>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/75 px-2 py-2">
              <span className="block text-[9px] uppercase font-semibold text-slate-400">
                {t("bmiShort")}
              </span>
              <span className="font-mono text-xs font-bold text-cyan-300" dir="ltr">
                {active.evaluation.bmi !== null ? active.evaluation.bmi : "-"}
              </span>
            </div>
          </div>
        )}

        {/* Prominent Button to Open Full Suivi Physique Studio */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("overview");
            setModalOpen(true);
          }}
          className="w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-sky-500 via-cyan-400 to-teal-300 hover:from-sky-400 hover:via-cyan-300 hover:to-teal-200 text-slate-950 shadow-[0_0_22px_rgba(0,242,255,0.3)] flex items-center justify-between gap-2 group active:scale-[0.99] transition-all cursor-pointer"
        >
          <span>{active ? t("openSuiviBtn") : t("discoverProtocolBtn")}</span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            className="w-4 h-4 shrink-0 rtl:rotate-180 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </section>

      {/* ─── FULL-SCREEN INTERACTIVE SUIVI PHYSIQUE STUDIO MODAL ─── */}
      {modalOpen && (
        <div
          id="aqa-kids-physical-report"
          dir={dir}
          className="fixed inset-0 z-50 overflow-y-auto bg-[#030712] text-slate-100"
        >
          <div className="pointer-events-none fixed left-[-15%] top-[-10%] h-[55vh] w-[55vw] rounded-full bg-sky-500/12 blur-[130px]" />
          <div className="pointer-events-none fixed bottom-[-10%] right-[-15%] h-[55vh] w-[55vw] rounded-full bg-cyan-400/10 blur-[130px]" />

          {/* Sticky Glass Navigation Bar */}
          <header className="sticky top-0 z-20 border-b border-white/10 bg-[#030712]/90 backdrop-blur-xl print:static print:border-b print:bg-transparent">
            <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-2 px-4 py-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="print:hidden inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-400/40 hover:text-white transition-all cursor-pointer"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  className="w-3.5 h-3.5 rtl:rotate-180"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                <span>{t("backToProfile")}</span>
              </button>

              <div className="flex items-center gap-2">
                <div className="print:hidden flex items-center gap-0.5 rounded-xl border border-white/10 bg-slate-900/90 p-1">
                  {(["fr", "ar", "en"] as const).map((lng) => (
                    <button
                      key={lng}
                      type="button"
                      onClick={() => setLocale(lng)}
                      className={`rounded-lg px-2 py-0.5 text-[11px] font-bold uppercase transition-all cursor-pointer ${
                        locale === lng
                          ? "bg-cyan-500 text-slate-950 shadow-[0_0_8px_rgba(0,242,255,0.3)]"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {lng}
                    </button>
                  ))}
                </div>

                {active && (
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="print:hidden inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/35 bg-cyan-950/60 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-900/70 transition-all cursor-pointer"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                      <polyline points="6 9 6 2 18 2 18 9" />
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                      <rect x="6" y="14" width="12" height="8" />
                    </svg>
                    <span className="hidden sm:inline">{t("printReport")}</span>
                  </button>
                )}
              </div>
            </div>
          </header>

          {/* Modal Main Body */}
          <div className="relative z-10 mx-auto w-full max-w-2xl px-4 py-5 space-y-5 pb-14">
            {/* ── CASE 1: PROTOCOL PREVIEW (NO PUBLISHED BILAN YET) ── */}
            {!active ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/90 p-4 space-y-3.5">
                  <KidsHeroBannerVisual status="pending" statusLabel={t("portalBadge")} />
                  <div className="space-y-1">
                    <h2 className="text-base font-extrabold text-white font-display">
                      {t("pendingTitle")}
                    </h2>
                    <p className="text-xs text-slate-300 leading-relaxed">{t("pendingDesc")}</p>
                  </div>
                </div>

                {/* Illustrated Preview of the Pediatric Screening Pillars */}
                <div className="rounded-2xl border border-white/10 bg-slate-900/85 p-4 space-y-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                      {t("protocolTitle")}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{t("protocolSubtitle")}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3 space-y-2.5">
                      <p className="text-xs font-bold text-white">{t("protocolPillar1")}</p>
                      <ScoliosisAdamsIllustration
                        labels={{
                          normal: t("illusScoliosisNormal"),
                          curved: t("illusScoliosisCurved"),
                          adams: t("illusAdamsCheck"),
                          yourChild: t("yourChildResult"),
                        }}
                      />
                    </div>

                    <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3 space-y-2.5">
                      <p className="text-xs font-bold text-white">{t("protocolPillar2")}</p>
                      <SagittalSpineIllustration
                        labels={{
                          ideal: t("illusSagittalIdeal"),
                          kyphosis: t("illusSagittalKyphosis"),
                          lordosis: t("illusSagittalLordosis"),
                          yourChild: t("yourChildResult"),
                        }}
                      />
                    </div>

                    <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3 space-y-3">
                      <p className="text-xs font-bold text-white">{t("protocolPillar3")}</p>
                      <KneeAlignmentIllustration
                        labels={{
                          normal: t("illusKneeNormal"),
                          valgum: t("illusKneeValgum"),
                          varum: t("illusKneeVarum"),
                          yourChild: t("yourChildResult"),
                        }}
                      />
                      <FootArchIllustration
                        labels={{
                          normal: t("illusFootNormal"),
                          flat: t("illusFootFlat"),
                          jack: t("illusFootJack"),
                          yourChild: t("yourChildResult"),
                        }}
                      />
                    </div>

                    <AquaticProgramHeroBanner
                      title={t("protocolPillar4")}
                      subtitle={t("recsTitle")}
                    />
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 leading-relaxed">{t("disclaimer")}</p>
              </div>
            ) : (
              /* ── CASE 2: FULL INTERACTIVE SUIVI PHYSIQUE DASHBOARD ── */
              <>
                {/* Hero Child Summary Card */}
                <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-slate-900/95 to-slate-950/95 p-4 space-y-3.5 shadow-[0_0_30px_rgba(0,242,255,0.1)]">
                  <KidsHeroBannerVisual
                    status={active.evaluation.overallStatus}
                    score={active.evaluation.overallScore}
                    statusLabel={statusConfig.label}
                    scoreLabel={t("overallScore")}
                  />

                  <div className="space-y-1 px-0.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h1 className="text-lg font-extrabold text-white font-display">
                        {memberName}
                      </h1>
                      <span className="font-mono text-xs text-cyan-300 font-bold rounded-lg bg-cyan-950/70 border border-cyan-500/30 px-2.5 py-0.5">
                        {swimId}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-300">
                      {active.evaluation.ageYears !== null && (
                        <span className="font-mono text-cyan-200 font-semibold">
                          {active.evaluation.ageYears} {t("ageYears")}
                        </span>
                      )}
                      <span>
                        {t("assessedOn")}:{" "}
                        <strong className="font-mono text-white">
                          {fmtDate(active.assessment.assessedAt, locale)}
                        </strong>
                      </span>
                      <span>
                        {t("evaluator")}: <strong className="text-white">{active.assessment.evaluatorName}</strong>
                      </span>
                      {active.assessment.nextCheckupDate && (
                        <span className="text-sky-400">
                          {t("nextCheckup")}:{" "}
                          <strong className="font-mono">{fmtDate(active.assessment.nextCheckupDate, locale)}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Assessment History Switcher */}
                  {assessments.length > 1 && (
                    <div className="print:hidden pt-3 border-t border-white/10 flex items-center gap-1.5 overflow-x-auto">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 shrink-0 me-1">
                        {t("assessmentHistory")}:
                      </span>
                      {assessments.map((item, idx) => (
                        <button
                          key={item.assessment.id}
                          type="button"
                          onClick={() => setSelectedIdx(idx)}
                          className={`shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                            idx === selectedIdx
                              ? "border-cyan-400/60 bg-cyan-950/80 text-cyan-200 shadow-[0_0_10px_rgba(0,242,255,0.2)]"
                              : "border-white/10 bg-slate-950/60 text-slate-400 hover:text-white"
                          }`}
                        >
                          <span>{item.assessment.label || fmtDate(item.assessment.assessedAt, locale)}</span>
                          <span className="ms-1.5 font-mono text-[10px] opacity-80">
                            {item.evaluation.overallScore}%
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Medical Referral Banner (if flagged) */}
                {active.evaluation.overallStatus === "referral" && (
                  <div className="rounded-2xl border border-rose-500/45 bg-rose-950/35 p-3.5 space-y-1">
                    <div className="flex items-center gap-2 text-rose-300">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4 shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="text-xs font-bold">{t("referralBannerTitle")}</span>
                    </div>
                    <p className="text-[11px] text-rose-100/90 leading-relaxed">
                      {t("referralBannerDesc")}
                    </p>
                  </div>
                )}

                {/* 4-Tab Visual Navigation Bar */}
                <div className="print:hidden grid grid-cols-2 sm:grid-cols-4 gap-1.5 rounded-2xl border border-white/10 bg-slate-900/90 p-1.5">
                  {(
                    [
                      ["overview", t("tabOverview")],
                      ["illustrations", t("tabIllustrations")],
                      ["growth", t("tabGrowth")],
                      ["aquatic", t("tabAquatic")],
                    ] as [ModalTab, string][]
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveTab(key)}
                      className={`rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                        activeTab === key
                          ? "bg-gradient-to-r from-sky-500 to-cyan-400 text-slate-950 shadow-[0_0_14px_rgba(0,242,255,0.28)]"
                          : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* ── TAB 1: OVERVIEW (3D HOLOGRAPHIC SCANNER + RADAR + FLAGS + SYNTHESIS) ── */}
                <div className={`${activeTab === "overview" ? "block" : "hidden print:block"} space-y-4`}>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-4 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                      {t("bodyMapTitle")}
                    </h3>
                    <KidsBodyMapSvg
                      assessment={active.assessment}
                      bodyZones={active.evaluation.bodyZones}
                      formatValue={valLabel}
                      labels={{
                        backView: t("backView"),
                        sideView: t("sideView"),
                        lowerLimbsView: t("lowerLimbsView"),
                        zoneHead: t("zoneHead"),
                        zoneShoulders: t("zoneShoulders"),
                        zoneSpineFrontal: t("zoneSpineFrontal"),
                        zoneThoracic: t("zoneThoracic"),
                        zoneLumbar: t("zoneLumbar"),
                        zonePelvis: t("zonePelvis"),
                        zoneKnees: t("zoneKnees"),
                        zoneFeet: t("zoneFeet"),
                        statusOptimal: t("statusOptimal"),
                        statusInfo: t("statusInfo"),
                        statusWatch: t("statusWatch"),
                        statusReferral: t("statusReferral"),
                        tapZoneHint: t("tapZoneHint"),
                        adamsShort: t("adamsTest"),
                        schoberShort: t("schoberTest"),
                        jackShort: t("jackTest"),
                      }}
                    />
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-4 space-y-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                      {t("radarTitle")}
                    </h3>
                    <KidsDomainRadarChart
                      current={active.evaluation.domainScores}
                      baseline={baseline}
                      labels={{
                        growth: t("domGrowth"),
                        spineFrontal: t("domSpineFrontal"),
                        spineSagittal: t("domSpineSagittal"),
                        lowerLimbs: t("domLowerLimbs"),
                        podology: t("domPodology"),
                        mobilityCore: t("domMobilityCore"),
                        currentLabel: t("currentBilan"),
                        baselineLabel: t("firstBilan"),
                      }}
                    />
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-4 space-y-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                      {t("flagsTitle")}
                    </h3>
                    {active.evaluation.flags.length === 0 ? (
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3.5 space-y-1">
                        <p className="text-xs font-bold text-emerald-300">{t("noFlagsTitle")}</p>
                        <p className="text-[11px] text-slate-300 leading-relaxed">{t("noFlagsDesc")}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {active.evaluation.flags.map((flag, idx) => {
                          const cls =
                            flag.severity === "referral"
                              ? "border-rose-500/40 bg-rose-950/30 text-rose-200"
                              : flag.severity === "watch"
                                ? "border-amber-500/35 bg-amber-950/25 text-amber-200"
                                : "border-sky-500/30 bg-sky-950/25 text-sky-200";
                          const pill =
                            flag.severity === "referral"
                              ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                              : flag.severity === "watch"
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                : "bg-sky-500/20 text-sky-300 border-sky-500/40";
                          return (
                            <div key={`${flag.code}-${idx}`} className={`rounded-xl border p-3 space-y-1 ${cls}`}>
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-xs font-bold">{t(`flag_${flag.code}_title`)}</span>
                                <div className="flex items-center gap-1.5">
                                  {flag.metricValue && (
                                    <span className="font-mono text-[10px] rounded bg-slate-950/70 px-1.5 py-0.5 text-white" dir="ltr">
                                      {flag.metricValue}
                                    </span>
                                  )}
                                  <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${pill}`}>
                                    {flag.severity === "referral"
                                      ? t("statusReferral")
                                      : flag.severity === "watch"
                                        ? t("statusWatch")
                                        : t("statusInfo")}
                                  </span>
                                </div>
                              </div>
                              <p className="text-[11px] text-slate-300 leading-relaxed">
                                {t(`flag_${flag.code}_desc`)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {(active.assessment.clinicalSummary || active.assessment.parentAdvice) && (
                    <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-4 space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                        {t("evaluatorNotesTitle")}
                      </h3>
                      {active.assessment.clinicalSummary && (
                        <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3 space-y-1">
                          <span className="text-[10px] font-semibold uppercase text-slate-400 block">
                            {t("clinicalSummaryLabel")}
                          </span>
                          <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                            {active.assessment.clinicalSummary}
                          </p>
                        </div>
                      )}
                      {active.assessment.parentAdvice && (
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3 space-y-1">
                          <span className="text-[10px] font-semibold uppercase text-emerald-400 block">
                            {t("parentAdviceLabel")}
                          </span>
                          <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                            {active.assessment.parentAdvice}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── TAB 2: 3D POSTURE HOLOGRAMS & DETAILED KINE BILAN ── */}
                <div className={`${activeTab === "illustrations" ? "block" : "hidden print:block"} space-y-4`}>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-4 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                      {t("illusScoliosisTitle")}
                    </h3>
                    <ScoliosisAdamsIllustration
                      assessment={active.assessment}
                      labels={{
                        normal: t("illusScoliosisNormal"),
                        curved: t("illusScoliosisCurved"),
                        adams: t("illusAdamsCheck"),
                        yourChild: t("yourChildResult"),
                      }}
                    />
                    <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/10 text-[11px]">
                      <div><span className="text-slate-400 block text-[10px]">{t("adamsTest")}</span><span className="text-white font-semibold">{valLabel(active.assessment.adamsTest)}</span></div>
                      <div><span className="text-slate-400 block text-[10px]">{t("scoliometerAtr")}</span><span className="font-mono text-white font-semibold" dir="ltr">{active.assessment.scoliometerAtrDeg !== null ? `${active.assessment.scoliometerAtrDeg}°` : "-"}</span></div>
                      <div><span className="text-slate-400 block text-[10px]">{t("shouldersLevel")}</span><span className="text-slate-200">{valLabel(active.assessment.shouldersLevel)}</span></div>
                      <div><span className="text-slate-400 block text-[10px]">{t("scapulaeSymmetry")}</span><span className="text-slate-200">{valLabel(active.assessment.scapulaeSymmetry)}</span></div>
                      <div><span className="text-slate-400 block text-[10px]">{t("waistTriangles")}</span><span className="text-slate-200">{valLabel(active.assessment.waistTriangles)}</span></div>
                      <div><span className="text-slate-400 block text-[10px]">{t("pelvisLevel")}</span><span className="text-slate-200">{valLabel(active.assessment.pelvisLevel)}</span></div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-4 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                      {t("illusSagittalTitle")}
                    </h3>
                    <SagittalSpineIllustration
                      assessment={active.assessment}
                      labels={{
                        ideal: t("illusSagittalIdeal"),
                        kyphosis: t("illusSagittalKyphosis"),
                        lordosis: t("illusSagittalLordosis"),
                        yourChild: t("yourChildResult"),
                      }}
                    />
                    <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/10 text-[11px]">
                      <div><span className="text-slate-400 block text-[10px]">{t("headPosture")}</span><span className="text-slate-200">{valLabel(active.assessment.headPosture)}</span></div>
                      <div><span className="text-slate-400 block text-[10px]">{t("thoracicKyphosis")}</span><span className="text-white font-semibold">{valLabel(active.assessment.thoracicKyphosis)}</span></div>
                      <div><span className="text-slate-400 block text-[10px]">{t("lumbarLordosis")}</span><span className="text-white font-semibold">{valLabel(active.assessment.lumbarLordosis)}</span></div>
                      <div><span className="text-slate-400 block text-[10px]">{t("thoracicReducibility")}</span><span className="text-slate-200">{valLabel(active.assessment.thoracicReducibility)}</span></div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-4 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                      {t("illusKneesTitle")}
                    </h3>
                    <KneeAlignmentIllustration
                      assessment={active.assessment}
                      labels={{
                        normal: t("illusKneeNormal"),
                        valgum: t("illusKneeValgum"),
                        varum: t("illusKneeVarum"),
                        yourChild: t("yourChildResult"),
                      }}
                    />
                    <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/10 text-[11px]">
                      <div><span className="text-slate-400 block text-[10px]">{t("kneeAlignment")}</span><span className="text-white font-semibold">{valLabel(active.assessment.kneeAlignment)}</span></div>
                      <div><span className="text-slate-400 block text-[10px]">{t("gaitPattern")}</span><span className="text-slate-200">{valLabel(active.assessment.gaitPattern)}</span></div>
                      <div><span className="text-slate-400 block text-[10px]">{t("intermalleolarDist")}</span><span className="font-mono text-slate-200" dir="ltr">{active.assessment.intermalleolarDistCm !== null ? `${active.assessment.intermalleolarDistCm} cm` : "-"}</span></div>
                      <div><span className="text-slate-400 block text-[10px]">{t("intercondylarDist")}</span><span className="font-mono text-slate-200" dir="ltr">{active.assessment.intercondylarDistCm !== null ? `${active.assessment.intercondylarDistCm} cm` : "-"}</span></div>
                      <div><span className="text-slate-400 block text-[10px]">{t("kneeSagittal")}</span><span className="text-slate-200">{valLabel(active.assessment.kneeSagittal)}</span></div>
                      <div><span className="text-slate-400 block text-[10px]">{t("limbLengthDiff")}</span><span className="font-mono text-slate-200" dir="ltr">{active.assessment.limbLengthDiffMm !== null ? `${active.assessment.limbLengthDiffMm} mm` : "-"}</span></div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-4 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                      {t("illusFootTitle")}
                    </h3>
                    <FootArchIllustration
                      assessment={active.assessment}
                      labels={{
                        normal: t("illusFootNormal"),
                        flat: t("illusFootFlat"),
                        jack: t("illusFootJack"),
                        yourChild: t("yourChildResult"),
                      }}
                    />
                    <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/10 text-[11px]">
                      <div><span className="text-slate-400 block text-[10px]">{t("footArch")}</span><span className="text-white font-semibold">{valLabel(active.assessment.footArch)}</span></div>
                      <div><span className="text-slate-400 block text-[10px]">{t("heelAlignment")}</span><span className="text-slate-200">{valLabel(active.assessment.heelAlignment)}</span></div>
                      <div><span className="text-slate-400 block text-[10px]">{t("jackTest")}</span><span className="text-slate-200">{valLabel(active.assessment.jackTest)}</span></div>
                      <div><span className="text-slate-400 block text-[10px]">{t("tiptoeTest")}</span><span className="text-slate-200">{valLabel(active.assessment.tiptoeTest)}</span></div>
                      <div><span className="text-slate-400 block text-[10px]">{t("footPain")}</span><span className="text-slate-200">{active.assessment.footPainOrFatigue ? t("yes") : t("no")}</span></div>
                    </div>
                  </div>

                  {/* Functional & Mobility Telemetry Bars */}
                  <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-4 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                      {t("functionalBarsTitle")}
                    </h3>
                    <div className="space-y-3">
                      {active.assessment.coreEnduranceSec !== null && (
                        <FunctionalBar
                          label={t("coreEndurance")}
                          valueText={`${active.assessment.coreEnduranceSec} s`}
                          pct={(active.assessment.coreEnduranceSec / 60) * 100}
                          color="from-sky-500 to-cyan-300"
                        />
                      )}
                      {active.assessment.backExtensorSec !== null && (
                        <FunctionalBar
                          label={t("backExtensor")}
                          valueText={`${active.assessment.backExtensorSec} s`}
                          pct={(active.assessment.backExtensorSec / 60) * 100}
                          color="from-teal-500 to-emerald-300"
                        />
                      )}
                      {active.assessment.singleLegBalanceSec !== null && (
                        <FunctionalBar
                          label={t("singleLegBalance")}
                          valueText={`${active.assessment.singleLegBalanceSec} s`}
                          pct={(active.assessment.singleLegBalanceSec / 30) * 100}
                          color="from-sky-400 to-indigo-400"
                        />
                      )}
                      {active.assessment.schoberCm !== null && (
                        <FunctionalBar
                          label={t("schoberTest")}
                          valueText={`+${active.assessment.schoberCm} cm`}
                          pct={(active.assessment.schoberCm / 6) * 100}
                          color={active.assessment.schoberCm >= 4 ? "from-emerald-500 to-teal-300" : "from-amber-500 to-orange-400"}
                        />
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/10 text-[11px]">
                      <div><span className="text-slate-400 block text-[10px]">{t("fingerFloorDist")}</span><span className="font-mono text-white font-semibold" dir="ltr">{active.assessment.fingerFloorDistCm !== null ? `${active.assessment.fingerFloorDistCm} cm` : "-"}</span></div>
                      <div><span className="text-slate-400 block text-[10px]">{t("beightonScore")}</span><span className="font-mono text-slate-200" dir="ltr">{active.assessment.beightonScore !== null ? `${active.assessment.beightonScore} / 9` : "-"}</span></div>
                      <div><span className="text-slate-400 block text-[10px]">{t("shoulderMobility")}</span><span className="text-slate-200">{valLabel(active.assessment.shoulderMobility)}</span></div>
                      <div><span className="text-slate-400 block text-[10px]">{t("breathingPattern")}</span><span className="text-slate-200">{valLabel(active.assessment.breathingPattern)}</span></div>
                    </div>
                  </div>
                </div>

                {/* ── TAB 3: GROWTH & WHO CHARTS ── */}
                <div className={`${activeTab === "growth" ? "block" : "hidden print:block"} space-y-4`}>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-4 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                      {t("growthTitle")}
                    </h3>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3 text-center">
                        <span className="text-[9px] uppercase font-semibold text-slate-400 block">{t("height")}</span>
                        <span className="font-mono text-base font-bold text-white" dir="ltr">
                          {active.assessment.heightCm !== null ? `${active.assessment.heightCm} cm` : "-"}
                        </span>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3 text-center">
                        <span className="text-[9px] uppercase font-semibold text-slate-400 block">{t("weight")}</span>
                        <span className="font-mono text-base font-bold text-white" dir="ltr">
                          {active.assessment.weightKg !== null ? `${active.assessment.weightKg} kg` : "-"}
                        </span>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3 text-center">
                        <span className="text-[9px] uppercase font-semibold text-slate-400 block">{t("armSpan")}</span>
                        <span className="font-mono text-base font-bold text-cyan-300" dir="ltr">
                          {active.assessment.armSpanCm !== null ? `${active.assessment.armSpanCm} cm` : "-"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl border border-white/5 bg-slate-800/40 p-2.5 text-center">
                        <span className="text-[9px] uppercase text-slate-400 block">{t("apeIndex")}</span>
                        <span className="font-mono text-xs font-bold text-slate-200" dir="ltr">
                          {active.evaluation.apeIndexCm !== null
                            ? `${active.evaluation.apeIndexCm > 0 ? "+" : ""}${active.evaluation.apeIndexCm} cm`
                            : "-"}
                        </span>
                      </div>
                      <div className="rounded-xl border border-white/5 bg-slate-800/40 p-2.5 text-center">
                        <span className="text-[9px] uppercase text-slate-400 block">{t("chestExpansion")}</span>
                        <span className="font-mono text-xs font-bold text-slate-200" dir="ltr">
                          {active.assessment.chestExpansionCm !== null ? `${active.assessment.chestExpansionCm} cm` : "-"}
                        </span>
                      </div>
                      <div className="rounded-xl border border-white/5 bg-slate-800/40 p-2.5 text-center">
                        <span className="text-[9px] uppercase text-slate-400 block">{t("growthVelocity")}</span>
                        <span className="font-mono text-xs font-bold text-sky-300" dir="ltr">
                          {active.evaluation.growthVelocityCmPerYear !== null
                            ? `+${active.evaluation.growthVelocityCmPerYear} ${t("unitCmYr")}`
                            : "-"}
                        </span>
                      </div>
                    </div>

                    <KidsWhoBmiGauge
                      bmi={active.evaluation.bmi}
                      zScore={active.evaluation.bmiZScore}
                      band={active.evaluation.bmiBand}
                      bandLabel={t(bmiBandKey(active.evaluation.bmiBand))}
                      title={t("bmi")}
                      optimalZoneLabel={t("whoOptimalShort")}
                      zScoreLabel={t("zScoreLabel")}
                      unitLabel={t("unitBmi")}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <KidsMetricTrendChart
                        title={t("height")}
                        unit="cm"
                        points={data.evolution.height}
                        locale={locale}
                        emptyLabel={t("trendNotEnough")}
                        accentColor="#00f2ff"
                      />
                      <KidsMetricTrendChart
                        title={t("weight")}
                        unit="kg"
                        points={data.evolution.weight}
                        locale={locale}
                        emptyLabel={t("trendNotEnough")}
                        accentColor="#38bdf8"
                      />
                      {data.evolution.atr.length >= 2 && (
                        <KidsMetricTrendChart
                          title={t("scoliometerAtr")}
                          unit="°"
                          points={data.evolution.atr}
                          locale={locale}
                          emptyLabel={t("trendNotEnough")}
                          accentColor="#f59e0b"
                          lowerIsBetter
                        />
                      )}
                      {data.evolution.coreSec.length >= 2 && (
                        <KidsMetricTrendChart
                          title={t("coreEndurance")}
                          unit="s"
                          points={data.evolution.coreSec}
                          locale={locale}
                          emptyLabel={t("trendNotEnough")}
                          accentColor="#10b981"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* ── TAB 4: TAILORED AQUATIC CORRECTIVE PLAN ── */}
                <div className={`${activeTab === "aquatic" ? "block" : "hidden print:block"} space-y-4`}>
                  <AquaticProgramHeroBanner
                    title={t("recsTitle")}
                    subtitle={t("sectionSubtitle")}
                  />

                  <div className="space-y-2.5">
                    {active.evaluation.recommendations.map((rec, idx) => (
                      <div
                        key={rec.code}
                        className="rounded-2xl border border-sky-500/25 bg-gradient-to-br from-slate-900/95 via-sky-950/35 to-slate-950/95 p-4 flex items-start gap-3.5 shadow-lg"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/35 bg-cyan-950/70 font-mono text-xs font-black text-cyan-300">
                          0{idx + 1}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white">
                              {t(`rec_${rec.code}_title`)}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase border ${
                                rec.priority === "high"
                                  ? "bg-cyan-500/20 text-cyan-200 border-cyan-400/40"
                                  : rec.priority === "medium"
                                    ? "bg-sky-500/15 text-sky-300 border-sky-400/30"
                                    : "bg-emerald-500/15 text-emerald-300 border-emerald-400/30"
                              }`}
                            >
                              {t(`priority_${rec.priority}`)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            {t(`rec_${rec.code}_desc`)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Official Medical Disclaimer */}
                <p className="text-[10px] text-slate-500 leading-relaxed px-1">{t("disclaimer")}</p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

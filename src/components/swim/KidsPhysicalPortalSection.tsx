"use client";

import React, { useState } from "react";
import { useTranslations, useLocale } from "@/lib/i18n";
import type { PublicKidsPhysicalPayload } from "@/lib/swim-kids-physical-server";
import type { WhoBmiBand } from "@/lib/swim-kids-physical";
import { KidsBodyMapSvg } from "@/components/swim/KidsBodyMapSvg";
import {
  KidsDomainRadarChart,
  KidsMetricTrendChart,
  KidsWhoBmiGauge,
} from "@/components/swim/KidsPhysicalCharts";

interface KidsPhysicalPortalSectionProps {
  memberName: string;
  swimId: string;
  data: PublicKidsPhysicalPayload;
}

function fmtDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale === "ar" ? "ar-DZ-u-nu-latn" : locale === "en" ? "en-GB" : "fr-DZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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

export function KidsPhysicalPortalSection({
  memberName,
  swimId,
  data,
}: KidsPhysicalPortalSectionProps) {
  const { t } = useTranslations("swimKidsPhysical");
  const { locale } = useLocale();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showFullBilan, setShowFullBilan] = useState(false);

  const assessments = data.assessments ?? [];
  const active = assessments[selectedIdx] ?? assessments[0] ?? null;

  // Empty state for AQA Kids members awaiting their first published bilan
  if (!active) {
    return (
      <section className="p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/25 backdrop-blur-xl shadow-[0_0_20px_rgba(0,242,255,0.08)] space-y-3">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2c-1.5 4 1.5 8 0 12s1.5 8 0 8" />
                <circle cx="12" cy="5" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="19" r="1.5" />
              </svg>
            </div>
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider font-display">
                {t("sectionTitle")}
              </h2>
              <p className="text-[10px] text-slate-400">{t("sectionSubtitle")}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3.5 space-y-1.5">
          <p className="text-xs font-bold text-cyan-300">{t("pendingTitle")}</p>
          <p className="text-[11px] text-slate-300 leading-relaxed">{t("pendingDesc")}</p>
        </div>
      </section>
    );
  }

  const { assessment, evaluation } = active;
  const baseline =
    assessments.length >= 2 && data.first && data.first.assessment.id !== assessment.id
      ? data.first.evaluation.domainScores
      : null;

  const statusConfig =
    evaluation.overallStatus === "referral"
      ? {
          label: t("statusReferral"),
          pill: "bg-rose-950/80 text-rose-300 border-rose-500/40",
          ring: "#ef4444",
          dot: "bg-rose-400",
        }
      : evaluation.overallStatus === "watch"
        ? {
            label: t("statusWatch"),
            pill: "bg-amber-950/80 text-amber-300 border-amber-500/40",
            ring: "#f59e0b",
            dot: "bg-amber-400",
          }
        : {
            label: t("statusOptimal"),
            pill: "bg-emerald-950/80 text-emerald-300 border-emerald-500/40",
            ring: "#10b981",
            dot: "bg-emerald-400",
          };

  const valLabel = (val: string) => t(`val_${val}`);

  return (
    <section
      id="aqa-kids-physical-report"
      className="p-4 rounded-2xl bg-slate-900/95 border border-cyan-500/30 backdrop-blur-xl shadow-[0_0_24px_rgba(0,242,255,0.1)] space-y-4"
    >
      {/* 1. HEADER & PRINT BUTTON */}
      <div className="flex items-start justify-between gap-2 pb-3 border-b border-white/10">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500/20 to-cyan-400/20 border border-cyan-400/40 text-cyan-300 flex items-center justify-center shrink-0 mt-0.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2c-1.5 4 1.5 8 0 12s1.5 8 0 8" />
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider font-display">
              {t("sectionTitle")}
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
              {t("sectionSubtitle")}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="print:hidden shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-800/80 px-2.5 py-1.5 text-[10px] font-semibold text-cyan-300 hover:bg-slate-800 hover:text-white transition-all"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          <span>{t("printReport")}</span>
        </button>
      </div>

      {/* 2. ASSESSMENT HISTORY SWITCHER (IF MULTIPLE BILANS) */}
      {assessments.length > 1 && (
        <div className="print:hidden space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
            {t("assessmentHistory")} ({assessments.length})
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {assessments.map((item, idx) => (
              <button
                key={item.assessment.id}
                type="button"
                onClick={() => setSelectedIdx(idx)}
                className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
                  idx === selectedIdx
                    ? "border-cyan-400/60 bg-cyan-950/70 text-cyan-200 shadow-[0_0_10px_rgba(0,242,255,0.2)]"
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
        </div>
      )}

      {/* 3. OVERALL STATUS HERO CARD */}
      <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3.5 flex items-center justify-between gap-3">
        <div className="space-y-1.5 min-w-0">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusConfig.pill}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
            {statusConfig.label}
          </span>
          <div className="text-[11px] text-slate-300 space-y-0.5">
            <p className="font-semibold text-white truncate">
              {assessment.label || `${memberName} · ${swimId}`}
            </p>
            <p className="text-[10px] text-slate-400">
              {t("assessedOn")}: <span className="font-mono text-slate-200">{fmtDate(assessment.assessedAt, locale)}</span>
              {evaluation.ageYears !== null && (
                <span>
                  {" · "}
                  <span className="font-mono text-cyan-300">
                    {evaluation.ageYears} {t("ageYears")}
                  </span>
                </span>
              )}
            </p>
            <p className="text-[10px] text-slate-400">
              {t("evaluator")}: <span className="text-slate-200">{assessment.evaluatorName}</span>
            </p>
            {assessment.nextCheckupDate && (
              <p className="text-[10px] text-sky-400">
                {t("nextCheckup")}: <span className="font-mono">{fmtDate(assessment.nextCheckupDate, locale)}</span>
              </p>
            )}
          </div>
        </div>

        {/* Circular Postural Score Ring */}
        <div className="shrink-0 flex flex-col items-center">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="26"
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="5"
              />
              <circle
                cx="32"
                cy="32"
                r="26"
                fill="none"
                stroke={statusConfig.ring}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${(evaluation.overallScore / 100) * 163.36} 163.36`}
              />
            </svg>
            <span className="absolute font-mono text-sm font-black text-white">
              {evaluation.overallScore}
            </span>
          </div>
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5">
            {t("overallScore")}
          </span>
        </div>
      </div>

      {/* 4. MEDICAL REFERRAL BANNER (IF FLAGGED) */}
      {evaluation.overallStatus === "referral" && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/35 p-3 space-y-1">
          <div className="flex items-center gap-2 text-rose-300">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-xs font-bold">{t("referralBannerTitle")}</span>
          </div>
          <p className="text-[11px] text-rose-100/85 leading-relaxed">
            {t("referralBannerDesc")}
          </p>
        </div>
      )}

      {/* 5. INTERACTIVE ANATOMICAL MORPHOSTATIC BODY MAP */}
      <div className="space-y-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
          {t("bodyMapTitle")}
        </h3>
        <KidsBodyMapSvg
          assessment={assessment}
          bodyZones={evaluation.bodyZones}
          compact
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
          }}
        />
      </div>

      {/* 6. 6-AXIS BIOMECHANICAL RADAR CHART */}
      <div className="space-y-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
          {t("radarTitle")}
        </h3>
        <KidsDomainRadarChart
          current={evaluation.domainScores}
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

      {/* 7. GROWTH & WHO ANTHROPOMETRY */}
      <div className="space-y-2.5">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
          {t("growthTitle")}
        </h3>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-white/10 bg-slate-950/70 p-2.5 text-center">
            <span className="text-[9px] uppercase font-semibold text-slate-400 block">
              {t("height")}
            </span>
            <span className="font-mono text-sm font-bold text-white" dir="ltr">
              {assessment.heightCm !== null ? `${assessment.heightCm} cm` : "-"}
            </span>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/70 p-2.5 text-center">
            <span className="text-[9px] uppercase font-semibold text-slate-400 block">
              {t("weight")}
            </span>
            <span className="font-mono text-sm font-bold text-white" dir="ltr">
              {assessment.weightKg !== null ? `${assessment.weightKg} kg` : "-"}
            </span>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/70 p-2.5 text-center">
            <span className="text-[9px] uppercase font-semibold text-slate-400 block">
              {t("armSpan")}
            </span>
            <span className="font-mono text-sm font-bold text-cyan-300" dir="ltr">
              {assessment.armSpanCm !== null ? `${assessment.armSpanCm} cm` : "-"}
            </span>
          </div>
        </div>

        {(evaluation.apeIndexCm !== null ||
          assessment.chestExpansionCm !== null ||
          evaluation.growthVelocityCmPerYear !== null) && (
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-white/5 bg-slate-800/40 p-2 text-center">
              <span className="text-[9px] uppercase text-slate-400 block">{t("apeIndex")}</span>
              <span className="font-mono text-xs font-bold text-slate-200" dir="ltr">
                {evaluation.apeIndexCm !== null
                  ? `${evaluation.apeIndexCm > 0 ? "+" : ""}${evaluation.apeIndexCm} cm`
                  : "-"}
              </span>
            </div>
            <div className="rounded-xl border border-white/5 bg-slate-800/40 p-2 text-center">
              <span className="text-[9px] uppercase text-slate-400 block">{t("chestExpansion")}</span>
              <span className="font-mono text-xs font-bold text-slate-200" dir="ltr">
                {assessment.chestExpansionCm !== null ? `${assessment.chestExpansionCm} cm` : "-"}
              </span>
            </div>
            <div className="rounded-xl border border-white/5 bg-slate-800/40 p-2 text-center">
              <span className="text-[9px] uppercase text-slate-400 block">{t("growthVelocity")}</span>
              <span className="font-mono text-xs font-bold text-sky-300" dir="ltr">
                {evaluation.growthVelocityCmPerYear !== null
                  ? `+${evaluation.growthVelocityCmPerYear} cm/yr`
                  : "-"}
              </span>
            </div>
          </div>
        )}

        <KidsWhoBmiGauge
          bmi={evaluation.bmi}
          zScore={evaluation.bmiZScore}
          band={evaluation.bmiBand}
          bandLabel={t(bmiBandKey(evaluation.bmiBand))}
          title={t("bmi")}
        />

        {/* Evolution Trend Charts when >= 2 bilans */}
        {assessments.length >= 2 && (
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
                unit="deg"
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
        )}
      </div>

      {/* 8. CLINICAL OBSERVATIONS & SCREENING ALERTS */}
      <div className="space-y-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
          {t("flagsTitle")}
        </h3>
        {evaluation.flags.length === 0 ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 space-y-1">
            <p className="text-xs font-bold text-emerald-300">{t("noFlagsTitle")}</p>
            <p className="text-[11px] text-slate-300 leading-relaxed">{t("noFlagsDesc")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {evaluation.flags.map((flag, idx) => {
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

      {/* 9. DETAILED KINESITHERAPIC BILAN (EXPANDABLE FOR PARENTS & DOCTORS) */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setShowFullBilan((prev) => !prev)}
          className="print:hidden w-full flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/70 px-3.5 py-2.5 text-xs font-bold text-white hover:border-cyan-500/40 transition-all"
        >
          <span>{t("screeningTitle")}</span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            className={`w-4 h-4 text-cyan-400 transition-transform ${showFullBilan ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <div className={`${showFullBilan ? "block" : "hidden print:block"} space-y-2.5`}>
          {/* A. Scoliosis / Frontal */}
          <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3 space-y-1.5 text-[11px]">
            <p className="font-bold text-cyan-300 text-[10px] uppercase tracking-wider">
              {t("scoliosisCard")}
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              <div><span className="text-slate-400 block text-[10px]">{t("adamsTest")}</span><span className="text-white font-semibold">{valLabel(assessment.adamsTest)}</span></div>
              <div><span className="text-slate-400 block text-[10px]">{t("scoliometerAtr")}</span><span className="font-mono text-white font-semibold">{assessment.scoliometerAtrDeg !== null ? `${assessment.scoliometerAtrDeg} deg` : "-"}</span></div>
              <div><span className="text-slate-400 block text-[10px]">{t("shouldersLevel")}</span><span className="text-slate-200">{valLabel(assessment.shouldersLevel)}</span></div>
              <div><span className="text-slate-400 block text-[10px]">{t("scapulaeSymmetry")}</span><span className="text-slate-200">{valLabel(assessment.scapulaeSymmetry)}</span></div>
              <div><span className="text-slate-400 block text-[10px]">{t("waistTriangles")}</span><span className="text-slate-200">{valLabel(assessment.waistTriangles)}</span></div>
              <div><span className="text-slate-400 block text-[10px]">{t("pelvisLevel")}</span><span className="text-slate-200">{valLabel(assessment.pelvisLevel)}</span></div>
            </div>
          </div>

          {/* B. Sagittal Spine */}
          <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3 space-y-1.5 text-[11px]">
            <p className="font-bold text-cyan-300 text-[10px] uppercase tracking-wider">
              {t("sagittalCard")}
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              <div><span className="text-slate-400 block text-[10px]">{t("headPosture")}</span><span className="text-slate-200">{valLabel(assessment.headPosture)}</span></div>
              <div><span className="text-slate-400 block text-[10px]">{t("thoracicKyphosis")}</span><span className="text-white font-semibold">{valLabel(assessment.thoracicKyphosis)}</span></div>
              <div><span className="text-slate-400 block text-[10px]">{t("lumbarLordosis")}</span><span className="text-white font-semibold">{valLabel(assessment.lumbarLordosis)}</span></div>
              <div><span className="text-slate-400 block text-[10px]">{t("thoracicReducibility")}</span><span className="text-slate-200">{valLabel(assessment.thoracicReducibility)}</span></div>
              {(assessment.sagittalArrowC7Mm !== null ||
                assessment.sagittalArrowT6Mm !== null ||
                assessment.sagittalArrowL3Mm !== null) && (
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[10px]">{t("sagittalArrows")}</span>
                  <span className="font-mono text-cyan-200" dir="ltr">
                    C7: {assessment.sagittalArrowC7Mm ?? "-"} mm · T6: {assessment.sagittalArrowT6Mm ?? "-"} mm · L3: {assessment.sagittalArrowL3Mm ?? "-"} mm
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* C. Lower Limbs & Knees */}
          <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3 space-y-1.5 text-[11px]">
            <p className="font-bold text-cyan-300 text-[10px] uppercase tracking-wider">
              {t("kneesCard")}
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              <div><span className="text-slate-400 block text-[10px]">{t("kneeAlignment")}</span><span className="text-white font-semibold">{valLabel(assessment.kneeAlignment)}</span></div>
              <div><span className="text-slate-400 block text-[10px]">{t("gaitPattern")}</span><span className="text-slate-200">{valLabel(assessment.gaitPattern)}</span></div>
              <div><span className="text-slate-400 block text-[10px]">{t("intermalleolarDist")}</span><span className="font-mono text-slate-200">{assessment.intermalleolarDistCm !== null ? `${assessment.intermalleolarDistCm} cm` : "-"}</span></div>
              <div><span className="text-slate-400 block text-[10px]">{t("intercondylarDist")}</span><span className="font-mono text-slate-200">{assessment.intercondylarDistCm !== null ? `${assessment.intercondylarDistCm} cm` : "-"}</span></div>
              <div><span className="text-slate-400 block text-[10px]">{t("kneeSagittal")}</span><span className="text-slate-200">{valLabel(assessment.kneeSagittal)}</span></div>
              <div><span className="text-slate-400 block text-[10px]">{t("limbLengthDiff")}</span><span className="font-mono text-slate-200">{assessment.limbLengthDiffMm !== null ? `${assessment.limbLengthDiffMm} mm` : "-"}</span></div>
            </div>
          </div>

          {/* D. Foot & Podology */}
          <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3 space-y-1.5 text-[11px]">
            <p className="font-bold text-cyan-300 text-[10px] uppercase tracking-wider">
              {t("feetCard")}
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              <div><span className="text-slate-400 block text-[10px]">{t("footArch")}</span><span className="text-white font-semibold">{valLabel(assessment.footArch)}</span></div>
              <div><span className="text-slate-400 block text-[10px]">{t("heelAlignment")}</span><span className="text-slate-200">{valLabel(assessment.heelAlignment)}</span></div>
              <div><span className="text-slate-400 block text-[10px]">{t("jackTest")}</span><span className="text-slate-200">{valLabel(assessment.jackTest)}</span></div>
              <div><span className="text-slate-400 block text-[10px]">{t("tiptoeTest")}</span><span className="text-slate-200">{valLabel(assessment.tiptoeTest)}</span></div>
              <div><span className="text-slate-400 block text-[10px]">{t("footPain")}</span><span className="text-slate-200">{assessment.footPainOrFatigue ? t("yes") : t("no")}</span></div>
            </div>
          </div>

          {/* E. Flexibility & Core */}
          <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3 space-y-1.5 text-[11px]">
            <p className="font-bold text-cyan-300 text-[10px] uppercase tracking-wider">
              {t("mobilityCard")}
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              <div><span className="text-slate-400 block text-[10px]">{t("fingerFloorDist")}</span><span className="font-mono text-slate-200">{assessment.fingerFloorDistCm !== null ? `${assessment.fingerFloorDistCm} cm` : "-"}</span></div>
              <div><span className="text-slate-400 block text-[10px]">{t("schoberTest")}</span><span className="font-mono text-slate-200">{assessment.schoberCm !== null ? `+${assessment.schoberCm} cm` : "-"}</span></div>
              <div><span className="text-slate-400 block text-[10px]">{t("shoulderMobility")}</span><span className="text-slate-200">{valLabel(assessment.shoulderMobility)}</span></div>
              <div><span className="text-slate-400 block text-[10px]">{t("beightonScore")}</span><span className="font-mono text-slate-200">{assessment.beightonScore !== null ? `${assessment.beightonScore} / 9` : "-"}</span></div>
              <div><span className="text-slate-400 block text-[10px]">{t("coreEndurance")}</span><span className="font-mono text-slate-200">{assessment.coreEnduranceSec !== null ? `${assessment.coreEnduranceSec} s` : "-"}</span></div>
              <div><span className="text-slate-400 block text-[10px]">{t("backExtensor")}</span><span className="font-mono text-slate-200">{assessment.backExtensorSec !== null ? `${assessment.backExtensorSec} s` : "-"}</span></div>
              <div><span className="text-slate-400 block text-[10px]">{t("singleLegBalance")}</span><span className="font-mono text-slate-200">{assessment.singleLegBalanceSec !== null ? `${assessment.singleLegBalanceSec} s` : "-"}</span></div>
              <div><span className="text-slate-400 block text-[10px]">{t("breathingPattern")}</span><span className="text-slate-200">{valLabel(assessment.breathingPattern)}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* 10. TAILORED AQA AQUATIC CORRECTIVE PLAN */}
      <div className="space-y-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
          {t("recsTitle")}
        </h3>
        <div className="space-y-2">
          {evaluation.recommendations.map((rec) => (
            <div
              key={rec.code}
              className="rounded-xl border border-sky-500/25 bg-gradient-to-br from-sky-950/40 to-slate-950/70 p-3 space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-white">{t(`rec_${rec.code}_title`)}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase border ${
                    rec.priority === "high"
                      ? "bg-cyan-500/20 text-cyan-200 border-cyan-400/40"
                      : rec.priority === "medium"
                        ? "bg-sky-500/15 text-sky-300 border-sky-400/30"
                        : "bg-emerald-500/15 text-emerald-300 border-emerald-400/30"
                  }`}
                >
                  {rec.priority}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {t(`rec_${rec.code}_desc`)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 11. EVALUATOR SYNTHESIS & HOME ADVICE */}
      {(assessment.clinicalSummary || assessment.parentAdvice) && (
        <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3.5 space-y-2.5">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
            {t("evaluatorNotesTitle")}
          </h3>
          {assessment.clinicalSummary && (
            <div className="space-y-0.5">
              <span className="text-[10px] font-semibold uppercase text-slate-400 block">
                {t("clinicalSummaryLabel")}
              </span>
              <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                {assessment.clinicalSummary}
              </p>
            </div>
          )}
          {assessment.parentAdvice && (
            <div className="space-y-0.5 pt-2 border-t border-white/5">
              <span className="text-[10px] font-semibold uppercase text-emerald-400 block">
                {t("parentAdviceLabel")}
              </span>
              <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                {assessment.parentAdvice}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 12. MEDICAL DISCLAIMER */}
      <p className="text-[10px] text-slate-500 leading-relaxed pt-2 border-t border-white/5">
        {t("disclaimer")}
      </p>
    </section>
  );
}

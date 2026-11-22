"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "@/lib/i18n";
import { ConfirmModal } from "@/components/admin/ui";
import {
  createDefaultChildProfile,
  createEmptyAssessmentDraft,
  evaluateKidsAssessment,
  type ChildSex,
  type DominantSide,
  type KidsChildProfile,
  type KidsPhysicalAssessment,
  type OverallStatus,
  type WhoBmiBand,
} from "@/lib/swim-kids-physical";
import type { EvaluatedKidsAssessment } from "@/lib/swim-kids-physical-server";
import { KidsBodyMapSvg } from "@/components/swim/KidsBodyMapSvg";
import { KidsDomainRadarChart, KidsWhoBmiGauge } from "@/components/swim/KidsPhysicalCharts";
import { SwimKidsKineGuideModal } from "./SwimKidsKineGuideModal";
import type { KineGuideSectionId } from "./kine-protocol-data";

interface DeskKidRow {
  id: string;
  swimId: string;
  fullName: string;
  phone: string;
  category: string;
  level: string;
  formula: string;
  duration: string | null;
  groupStatus: string;
  group: { id: string; name: string; coachName: string | null; schedule: string } | null;
  card: { cardCode: string; publicToken: string; status: string } | null;
  childProfile: KidsChildProfile;
  assessments: EvaluatedKidsAssessment[];
  latest: EvaluatedKidsAssessment | null;
  first: EvaluatedKidsAssessment | null;
  totalAssessments: number;
  publishedCount: number;
}

interface DeskResponse {
  members: DeskKidRow[];
  coaches: { id: string; name: string }[];
}

type FormStep = 1 | 2 | 3 | 4 | 5 | 6;
type FilterStatus = "all" | "not_assessed" | OverallStatus;

type DraftAssessment = Omit<KidsPhysicalAssessment, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

const inputCls =
  "min-h-[38px] w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs text-white outline-none focus:border-[var(--accent)] transition-colors";
const labelCls = "block text-[11px] font-semibold text-slate-300 mb-1";
const hintCls = "text-[10px] text-slate-500 mt-0.5";

function parseNullableNum(val: string): number | null {
  const trimmed = val.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
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

export function SwimKidsPhysicalDesk() {
  const { t } = useTranslations("swimKidsPhysical");
  const { locale, setLocale } = useLocale();

  const [data, setData] = useState<DeskResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");

  // Active child dossier / bilan editor modal state
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<"history" | "form">("history");
  const [step, setStep] = useState<FormStep>(1);
  const [profileDraft, setProfileDraft] = useState<KidsChildProfile>(createDefaultChildProfile());
  const [bilanDraft, setBilanDraft] = useState<DraftAssessment>(createEmptyAssessmentDraft());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ memberId: string; assessmentId: string } | null>(null);
  const [guideSection, setGuideSection] = useState<KineGuideSectionId | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/swim/kids-suivi", { cache: "no-store" });
      if (!res.ok) throw new Error("load_failed");
      setData(await res.json());
      setError(null);
    } catch {
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const activeMember = useMemo(
    () => data?.members.find((m) => m.id === activeMemberId) ?? null,
    [data, activeMemberId]
  );

  // Live clinical evaluation preview inside the form
  const livePreview = useMemo(() => {
    const fakeFull: KidsPhysicalAssessment = {
      ...bilanDraft,
      id: bilanDraft.id ?? "preview",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const existingList = activeMember?.assessments.map((a) => a.assessment) ?? [];
    const combined = [
      ...existingList.filter((a) => a.id !== fakeFull.id),
      fakeFull,
    ];
    return {
      assessment: fakeFull,
      evaluation: evaluateKidsAssessment(fakeFull, profileDraft, combined),
    };
  }, [bilanDraft, profileDraft, activeMember]);

  // KPI metrics
  const kpis = useMemo(() => {
    const members = data?.members ?? [];
    let assessed = 0;
    let optimal = 0;
    let watch = 0;
    let referral = 0;
    for (const m of members) {
      if (!m.latest) continue;
      assessed += 1;
      if (m.latest.evaluation.overallStatus === "referral") referral += 1;
      else if (m.latest.evaluation.overallStatus === "watch") watch += 1;
      else optimal += 1;
    }
    return { total: members.length, assessed, optimal, watch, referral };
  }, [data]);

  const filteredMembers = useMemo(() => {
    const members = data?.members ?? [];
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      const matchSearch =
        !q ||
        m.fullName.toLowerCase().includes(q) ||
        m.swimId.toLowerCase().includes(q) ||
        (m.group?.name && m.group.name.toLowerCase().includes(q));
      if (!matchSearch) return false;

      if (statusFilter === "all") return true;
      if (statusFilter === "not_assessed") return !m.latest;
      return m.latest?.evaluation.overallStatus === statusFilter;
    });
  }, [data, search, statusFilter]);

  function openNewBilan(member: DeskKidRow) {
    setActiveMemberId(member.id);
    setProfileDraft({ ...member.childProfile });
    const latest = member.latest?.assessment;
    const base = createEmptyAssessmentDraft(
      latest?.evaluatorName || member.group?.coachName || "Kinesitherapeute AQA"
    );
    // Pre-fill evaluator & child's previous standing info where helpful, keeping new date
    setBilanDraft({
      ...base,
      label: `${t("bilanDefaultPrefix")} #${member.totalAssessments + 1}`,
      evaluatorTitle: latest?.evaluatorTitle ?? base.evaluatorTitle,
      heightCm: latest?.heightCm ?? null,
      weightKg: latest?.weightKg ?? null,
      armSpanCm: latest?.armSpanCm ?? null,
    });
    setStep(1);
    setEditorMode("form");
    setNotice(null);
  }

  function openEditBilan(member: DeskKidRow, assessment: KidsPhysicalAssessment) {
    setActiveMemberId(member.id);
    setProfileDraft({ ...member.childProfile });
    const { createdAt: _c, updatedAt: _u, ...rest } = assessment;
    void _c;
    void _u;
    setBilanDraft(rest);
    setStep(1);
    setEditorMode("form");
    setNotice(null);
  }

  function openHistory(member: DeskKidRow) {
    setActiveMemberId(member.id);
    setProfileDraft({ ...member.childProfile });
    setEditorMode("history");
    setNotice(null);
  }

  async function handleSaveBilan(e: React.FormEvent) {
    e.preventDefault();
    if (!activeMemberId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/swim/kids-suivi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_assessment",
          memberId: activeMemberId,
          childProfile: profileDraft,
          assessment: bilanDraft,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "save_failed");
      }
      await load();
      setNotice(t("bilanSaved"));
      setEditorMode("history");
    } catch {
      setError(t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePublish(memberId: string, assessmentId: string, nextVal: boolean) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/swim/kids-suivi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_publish",
          memberId,
          assessmentId,
          publishedToPortal: nextVal,
        }),
      });
      if (res.ok) await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/swim/kids-suivi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_assessment",
          memberId: deleteTarget.memberId,
          assessmentId: deleteTarget.assessmentId,
        }),
      });
      if (res.ok) {
        setDeleteTarget(null);
        await load();
      }
    } finally {
      setSaving(false);
    }
  }

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === "ar" ? "ar-DZ-u-nu-latn" : "fr-DZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const statusPill = (status: OverallStatus | null) => {
    if (!status) {
      return (
        <span className="inline-flex items-center rounded-full border border-white/10 bg-slate-800 px-2.5 py-0.5 text-[10px] font-semibold text-slate-400">
          {t("notAssessedYet")}
        </span>
      );
    }
    if (status === "referral") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-950/70 px-2.5 py-0.5 text-[10px] font-bold text-rose-300">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          {t("statusReferral")}
        </span>
      );
    }
    if (status === "watch") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-950/70 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          {t("statusWatch")}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-950/70 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        {t("statusOptimal")}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[360px]">
        <div className="h-7 w-7 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">{t("adminTitle")}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{t("adminSubtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setGuideSection("prep")}
            className="min-h-[38px] inline-flex items-center gap-1.5 rounded-[10px] border border-cyan-500/40 bg-cyan-950/60 hover:bg-cyan-900/70 px-3.5 text-xs font-bold text-cyan-200 shadow-[0_0_14px_rgba(0,242,255,0.14)] transition-all cursor-pointer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 shrink-0">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              <line x1="9" y1="7" x2="16" y2="7" />
              <line x1="9" y1="11" x2="16" y2="11" />
            </svg>
            <span>{t("openKineGuide")}</span>
          </button>
          <div className="flex items-center gap-0.5 rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] p-1">
            {(["fr", "ar", "en"] as const).map((lng) => (
              <button
                key={lng}
                type="button"
                onClick={() => setLocale(lng)}
                className={`rounded-md px-2 py-1 text-[11px] font-bold uppercase transition-all ${
                  locale === lng
                    ? "bg-cyan-500 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {lng}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => load()}
            className="min-h-[38px] rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] px-3.5 text-xs font-semibold text-slate-300 hover:text-white transition-all"
          >
            {t("refresh")}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-2.5 text-xs text-rose-300">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-4 py-2.5 text-xs text-emerald-300">
          {notice}
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-3.5">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{t("kpiTotalKids")}</p>
          <p className="font-mono text-2xl font-bold text-white mt-1">{kpis.total}</p>
        </div>
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-3.5">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{t("kpiAssessed")}</p>
          <p className="font-mono text-2xl font-bold text-cyan-300 mt-1">{kpis.assessed}</p>
        </div>
        <div className="rounded-[14px] border border-emerald-500/20 bg-emerald-950/20 p-3.5">
          <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">{t("kpiOptimal")}</p>
          <p className="font-mono text-2xl font-bold text-emerald-300 mt-1">{kpis.optimal}</p>
        </div>
        <div className="rounded-[14px] border border-amber-500/20 bg-amber-950/20 p-3.5">
          <p className="text-[10px] uppercase tracking-wider text-amber-400 font-semibold">{t("kpiWatch")}</p>
          <p className="font-mono text-2xl font-bold text-amber-300 mt-1">{kpis.watch}</p>
        </div>
        <div className="rounded-[14px] border border-rose-500/25 bg-rose-950/25 p-3.5">
          <p className="text-[10px] uppercase tracking-wider text-rose-400 font-semibold">{t("kpiReferral")}</p>
          <p className="font-mono text-2xl font-bold text-rose-300 mt-1">{kpis.referral}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="min-h-[40px] md:max-w-sm w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[var(--accent)]"
        />
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", t("filterAll")],
              ["not_assessed", t("filterNotAssessed")],
              ["optimal", t("filterOptimal")],
              ["watch", t("filterWatch")],
              ["referral", t("filterReferral")],
            ] as [FilterStatus, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${
                statusFilter === key
                  ? "bg-[var(--primary)] border-sky-400 text-white shadow-[0_0_12px_rgba(14,165,233,0.3)]"
                  : "bg-[var(--surface)] border-[var(--border)] text-slate-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Roster Table */}
      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        {filteredMembers.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">{t("noKidsFound")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-slate-950/60 text-[10px] uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">{t("colChild")}</th>
                  <th className="py-3 px-3">{t("colGroup")}</th>
                  <th className="py-3 px-3">{t("colGrowth")}</th>
                  <th className="py-3 px-3">{t("colStatus")}</th>
                  <th className="py-3 px-3">{t("colLocomotor")}</th>
                  <th className="py-3 px-3">{t("colBilans")}</th>
                  <th className="py-3 px-4 text-right">{t("colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredMembers.map((m) => {
                  const latest = m.latest;
                  return (
                    <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{m.fullName}</div>
                        <div className="font-mono text-[10px] text-cyan-400">
                          {m.swimId}
                          {latest?.evaluation.ageYears !== null && latest?.evaluation.ageYears !== undefined && (
                            <span className="text-slate-400 ms-1.5">
                              · {latest.evaluation.ageYears} {t("ageYears")}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-slate-200 font-medium">{m.group?.name || "-"}</span>
                        {m.group?.coachName && (
                          <span className="block text-[10px] text-slate-500">{m.group.coachName}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px]">
                        {latest ? (
                          <div className="space-y-0.5">
                            <span className="text-white">
                              {latest.assessment.heightCm ? `${latest.assessment.heightCm} cm` : "-"} /{" "}
                              {latest.assessment.weightKg ? `${latest.assessment.weightKg} kg` : "-"}
                            </span>
                            {latest.evaluation.bmi !== null && (
                              <span className="block text-[10px] text-cyan-300">
                                {t("bmiShort")} {latest.evaluation.bmi} · {t(bmiBandKey(latest.evaluation.bmiBand))}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-col items-start gap-1">
                          {statusPill(latest?.evaluation.overallStatus ?? null)}
                          {latest && (
                            <span className="font-mono text-[10px] text-slate-400">
                              {t("overallScore")}: <strong className="text-white">{latest.evaluation.overallScore}%</strong>
                              {" · "}
                              {fmtDate(latest.assessment.assessedAt)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {latest && latest.evaluation.flags.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {latest.evaluation.flags.slice(0, 3).map((fl, i) => (
                              <span
                                key={`${fl.code}-${i}`}
                                className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${
                                  fl.severity === "referral"
                                    ? "border-rose-500/40 bg-rose-950/60 text-rose-300"
                                    : fl.severity === "watch"
                                      ? "border-amber-500/40 bg-amber-950/60 text-amber-300"
                                      : "border-sky-500/30 bg-sky-950/50 text-sky-300"
                                }`}
                              >
                                {t(`flag_${fl.code}_title`)}
                              </span>
                            ))}
                            {latest.evaluation.flags.length > 3 && (
                              <span className="text-[10px] text-slate-400">
                                +{latest.evaluation.flags.length - 3}
                              </span>
                            )}
                          </div>
                        ) : latest ? (
                          <span className="text-[11px] text-emerald-400">{t("noAnomalyShort")}</span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-300">
                        {m.totalAssessments > 0 ? (
                          <div>
                            <span className="text-white font-bold">{m.totalAssessments}</span>
                            <span className="block text-[10px] text-cyan-400">
                              {m.publishedCount} {t("publishedShort")}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                          <button
                            type="button"
                            onClick={() => openNewBilan(m)}
                            className="rounded-lg bg-[var(--primary)] hover:bg-sky-400 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-all"
                          >
                            + {t("newBilan")}
                          </button>
                          {m.totalAssessments > 0 && (
                            <button
                              type="button"
                              onClick={() => openHistory(m)}
                              className="rounded-lg border border-white/10 bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 transition-all"
                            >
                              {t("assessmentHistory")}
                            </button>
                          )}
                          <a
                            href={`/swim/profile/${encodeURIComponent(m.swimId)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-cyan-500/30 bg-cyan-950/40 hover:bg-cyan-900/50 px-2.5 py-1.5 text-[11px] font-semibold text-cyan-300 transition-all"
                          >
                            {t("viewPortal")}
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── CHILD DOSSIER & GUIDED KINESITHERAPIC BILAN MODAL ─── */}
      {activeMember && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-6xl rounded-2xl border border-white/10 bg-slate-900 shadow-2xl my-auto overflow-hidden">
            {/* Modal Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-white/10 bg-slate-950/80">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">{activeMember.fullName}</h3>
                  <span className="font-mono text-xs text-cyan-300 bg-cyan-950/70 border border-cyan-500/30 px-2 py-0.5 rounded">
                    {activeMember.swimId}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {activeMember.group?.name || "AQA Kids"} · {t("bilansRecorded", { n: activeMember.totalAssessments })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditorMode("history")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${
                    editorMode === "history"
                      ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-200"
                      : "bg-slate-800 border-white/10 text-slate-300 hover:text-white"
                  }`}
                >
                  {t("assessmentHistory")} ({activeMember.totalAssessments})
                </button>
                <button
                  type="button"
                  onClick={() => openNewBilan(activeMember)}
                  className="rounded-lg bg-[var(--primary)] hover:bg-sky-400 px-3 py-1.5 text-xs font-semibold text-white transition-all"
                >
                  + {t("newBilan")}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMemberId(null)}
                  className="rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white"
                >
                  {t("cancel")}
                </button>
              </div>
            </div>

            {/* MODE A: ASSESSMENT HISTORY LIST */}
            {editorMode === "history" && (
              <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                {activeMember.assessments.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-slate-950/50 p-8 text-center space-y-3">
                    <p className="text-sm text-slate-300">{t("notAssessedYet")}</p>
                    <button
                      type="button"
                      onClick={() => openNewBilan(activeMember)}
                      className="rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white"
                    >
                      + {t("newBilan")}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeMember.assessments.map(({ assessment, evaluation }) => (
                      <div
                        key={assessment.id}
                        className="rounded-xl border border-white/10 bg-slate-950/60 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-sm">
                              {assessment.label || fmtDate(assessment.assessedAt)}
                            </span>
                            <span className="font-mono text-xs text-slate-400">
                              {fmtDate(assessment.assessedAt)}
                            </span>
                            {statusPill(evaluation.overallStatus)}
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                                assessment.publishedToPortal
                                  ? "bg-cyan-950/70 text-cyan-300 border-cyan-500/30"
                                  : "bg-slate-800 text-slate-400 border-white/10"
                              }`}
                            >
                              {assessment.publishedToPortal ? t("published") : t("draft")}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">
                            {t("evaluator")}: <span className="text-slate-200">{assessment.evaluatorName}</span>
                            {" · "}
                            {t("overallScore")}: <span className="font-mono text-white font-bold">{evaluation.overallScore}%</span>
                            {assessment.heightCm ? ` · ${assessment.heightCm} cm` : ""}
                            {assessment.weightKg ? ` · ${assessment.weightKg} kg` : ""}
                            {evaluation.bmi ? ` · IMC ${evaluation.bmi}` : ""}
                          </p>
                          {evaluation.flags.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {evaluation.flags.map((f, idx) => (
                                <span
                                  key={`${f.code}-${idx}`}
                                  className="rounded bg-slate-800 border border-white/10 px-2 py-0.5 text-[10px] text-slate-200"
                                >
                                  {t(`flag_${f.code}_title`)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              handleTogglePublish(
                                activeMember.id,
                                assessment.id,
                                !assessment.publishedToPortal
                              )
                            }
                            className="rounded-lg border border-white/10 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200"
                          >
                            {assessment.publishedToPortal ? t("draft") : t("published")}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditBilan(activeMember, assessment)}
                            className="rounded-lg bg-sky-600 hover:bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            {t("editBilan")}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({
                                memberId: activeMember.id,
                                assessmentId: assessment.id,
                              })
                            }
                            className="rounded-lg border border-rose-500/30 bg-rose-950/40 hover:bg-rose-900/60 px-3 py-1.5 text-xs font-semibold text-rose-300"
                          >
                            {t("deleteBilan")}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* MODE B: 6-STEP CLINICAL BILAN STUDIO + LIVE PREVIEW */}
            {editorMode === "form" && (
              <form onSubmit={handleSaveBilan} className="grid grid-cols-1 lg:grid-cols-12 max-h-[82vh] overflow-y-auto">
                {/* LEFT: 6-Step Guided Clinical Form */}
                <div className="lg:col-span-7 p-5 space-y-4 border-b lg:border-b-0 lg:border-r border-white/10">
                  {/* Step Navigation + Contextual Step Protocol Button */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        [
                          [1, t("stepProfile")],
                          [2, t("stepFrontal")],
                          [3, t("stepSagittal")],
                          [4, t("stepLimbs")],
                          [5, t("stepFeet")],
                          [6, t("stepMobility")],
                        ] as [FormStep, string][]
                      ).map(([sNum, sLabel]) => (
                        <button
                          key={sNum}
                          type="button"
                          onClick={() => setStep(sNum)}
                          className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold border transition-all ${
                            step === sNum
                              ? "bg-[var(--primary)] border-sky-400 text-white"
                              : "bg-slate-950/60 border-white/10 text-slate-400 hover:text-white"
                          }`}
                        >
                          {sLabel}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setGuideSection(`step${step}` as KineGuideSectionId)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/60 hover:bg-cyan-900/70 px-2.5 py-1.5 text-[11px] font-bold text-cyan-200 transition-all cursor-pointer shrink-0"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" className="h-3.5 w-3.5 shrink-0">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <span>{t("stepProtocolHelp", { n: step })}</span>
                    </button>
                  </div>

                  {/* STEP 1: PROFILE & GROWTH ANTHROPOMETRY */}
                  {step === 1 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className={labelCls}>{t("birthDate")}</label>
                          <input
                            type="date"
                            value={profileDraft.birthDate || ""}
                            onChange={(e) =>
                              setProfileDraft({ ...profileDraft, birthDate: e.target.value || null })
                            }
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>{t("sex")}</label>
                          <select
                            value={profileDraft.sex}
                            onChange={(e) =>
                              setProfileDraft({ ...profileDraft, sex: e.target.value as ChildSex })
                            }
                            className={inputCls}
                          >
                            <option value="male">{t("sexMale")}</option>
                            <option value="female">{t("sexFemale")}</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>{t("dominantSide")}</label>
                          <select
                            value={profileDraft.dominantSide}
                            onChange={(e) =>
                              setProfileDraft({
                                ...profileDraft,
                                dominantSide: e.target.value as DominantSide,
                              })
                            }
                            className={inputCls}
                          >
                            <option value="right">{t("domRight")}</option>
                            <option value="left">{t("domLeft")}</option>
                            <option value="ambidextrous">{t("domAmbi")}</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className={labelCls}>{t("assessedOn")}</label>
                          <input
                            type="date"
                            required
                            value={bilanDraft.assessedAt}
                            onChange={(e) =>
                              setBilanDraft({ ...bilanDraft, assessedAt: e.target.value })
                            }
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>{t("bilanLabel")}</label>
                          <input
                            type="text"
                            value={bilanDraft.label || ""}
                            onChange={(e) =>
                              setBilanDraft({ ...bilanDraft, label: e.target.value })
                            }
                            placeholder={t("bilanLabelPlaceholder")}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>{t("evaluatorNameLabel")}</label>
                          <input
                            type="text"
                            required
                            list="aqa-kids-evaluators"
                            value={bilanDraft.evaluatorName}
                            onChange={(e) =>
                              setBilanDraft({ ...bilanDraft, evaluatorName: e.target.value })
                            }
                            className={inputCls}
                          />
                          <datalist id="aqa-kids-evaluators">
                            {(data?.coaches ?? []).map((c) => (
                              <option key={c.id} value={c.name} />
                            ))}
                          </datalist>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-white/10">
                        <div>
                          <label className={labelCls}>{t("height")} (cm)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="60"
                            max="220"
                            value={bilanDraft.heightCm ?? ""}
                            onChange={(e) =>
                              setBilanDraft({
                                ...bilanDraft,
                                heightCm: parseNullableNum(e.target.value),
                              })
                            }
                            placeholder="132.5"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>{t("weight")} (kg)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="8"
                            max="150"
                            value={bilanDraft.weightKg ?? ""}
                            onChange={(e) =>
                              setBilanDraft({
                                ...bilanDraft,
                                weightKg: parseNullableNum(e.target.value),
                              })
                            }
                            placeholder="28.4"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>{t("armSpan")} (cm)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="60"
                            max="230"
                            value={bilanDraft.armSpanCm ?? ""}
                            onChange={(e) =>
                              setBilanDraft({
                                ...bilanDraft,
                                armSpanCm: parseNullableNum(e.target.value),
                              })
                            }
                            placeholder="135"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>{t("sittingHeight")} (cm)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="30"
                            max="120"
                            value={bilanDraft.sittingHeightCm ?? ""}
                            onChange={(e) =>
                              setBilanDraft({
                                ...bilanDraft,
                                sittingHeightCm: parseNullableNum(e.target.value),
                              })
                            }
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>{t("chestExpansion")} (cm)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="20"
                            value={bilanDraft.chestExpansionCm ?? ""}
                            onChange={(e) =>
                              setBilanDraft({
                                ...bilanDraft,
                                chestExpansionCm: parseNullableNum(e.target.value),
                              })
                            }
                            placeholder="4.5"
                            className={inputCls}
                          />
                          <p className={hintCls}>{t("hintChestRef")}</p>
                        </div>
                      </div>

                      <div>
                        <label className={labelCls}>{t("medicalNotes")}</label>
                        <textarea
                          rows={2}
                          value={profileDraft.medicalNotes || ""}
                          onChange={(e) =>
                            setProfileDraft({
                              ...profileDraft,
                              medicalNotes: e.target.value || null,
                            })
                          }
                          className={inputCls}
                        />
                      </div>
                    </div>
                  )}

                  {/* STEP 2: FRONTAL SPINE & SCOLIOSIS (SRS / SOSORT) */}
                  {step === 2 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className={labelCls}>{t("adamsTest")}</label>
                        <select
                          value={bilanDraft.adamsTest}
                          onChange={(e) =>
                            setBilanDraft({
                              ...bilanDraft,
                              adamsTest: e.target.value as KidsPhysicalAssessment["adamsTest"],
                            })
                          }
                          className={inputCls}
                        >
                          <option value="negative">{t("val_negative")}</option>
                          <option value="postural_asymmetry">{t("val_postural_asymmetry")}</option>
                          <option value="rib_hump_thoracic">{t("val_rib_hump_thoracic")}</option>
                          <option value="rib_hump_lumbar">{t("val_rib_hump_lumbar")}</option>
                          <option value="rib_hump_double">{t("val_rib_hump_double")}</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>{t("scoliometerAtr")} (deg)</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="45"
                          value={bilanDraft.scoliometerAtrDeg ?? ""}
                          onChange={(e) =>
                            setBilanDraft({
                              ...bilanDraft,
                              scoliometerAtrDeg: parseNullableNum(e.target.value),
                            })
                          }
                          className={inputCls}
                        />
                        <p className={hintCls}>{t("hintAtrRef")}</p>
                      </div>
                      <div>
                        <label className={labelCls}>{t("shouldersLevel")}</label>
                        <select
                          value={bilanDraft.shouldersLevel}
                          onChange={(e) =>
                            setBilanDraft({
                              ...bilanDraft,
                              shouldersLevel: e.target.value as KidsPhysicalAssessment["shouldersLevel"],
                            })
                          }
                          className={inputCls}
                        >
                          <option value="balanced">{t("val_balanced")}</option>
                          <option value="left_higher">{t("val_left_higher")}</option>
                          <option value="right_higher">{t("val_right_higher")}</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>{t("scapulaeSymmetry")}</label>
                        <select
                          value={bilanDraft.scapulaeSymmetry}
                          onChange={(e) =>
                            setBilanDraft({
                              ...bilanDraft,
                              scapulaeSymmetry: e.target.value as KidsPhysicalAssessment["scapulaeSymmetry"],
                            })
                          }
                          className={inputCls}
                        >
                          <option value="balanced">{t("val_balanced")}</option>
                          <option value="left_prominent">{t("val_left_prominent")}</option>
                          <option value="right_prominent">{t("val_right_prominent")}</option>
                          <option value="winged_bilateral">{t("val_winged_bilateral")}</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>{t("waistTriangles")}</label>
                        <select
                          value={bilanDraft.waistTriangles}
                          onChange={(e) =>
                            setBilanDraft({
                              ...bilanDraft,
                              waistTriangles: e.target.value as KidsPhysicalAssessment["waistTriangles"],
                            })
                          }
                          className={inputCls}
                        >
                          <option value="symmetric">{t("val_symmetric")}</option>
                          <option value="left_deeper">{t("val_left_deeper")}</option>
                          <option value="right_deeper">{t("val_right_deeper")}</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>{t("pelvisLevel")}</label>
                        <select
                          value={bilanDraft.pelvisLevel}
                          onChange={(e) =>
                            setBilanDraft({
                              ...bilanDraft,
                              pelvisLevel: e.target.value as KidsPhysicalAssessment["pelvisLevel"],
                            })
                          }
                          className={inputCls}
                        >
                          <option value="balanced">{t("val_balanced")}</option>
                          <option value="left_higher">{t("val_left_higher")}</option>
                          <option value="right_higher">{t("val_right_higher")}</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelCls}>{t("plumbLineC7")} (mm)</label>
                        <input
                          type="number"
                          step="1"
                          min="-80"
                          max="80"
                          value={bilanDraft.plumbLineC7DeviationMm ?? ""}
                          onChange={(e) =>
                            setBilanDraft({
                              ...bilanDraft,
                              plumbLineC7DeviationMm: parseNullableNum(e.target.value),
                            })
                          }
                          className={inputCls}
                        />
                        <p className={hintCls}>{t("hintPlumbRef")}</p>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: SAGITTAL SPINE (CYPHOSE / HYPERLORDOSE) */}
                  {step === 3 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className={labelCls}>{t("headPosture")}</label>
                        <select
                          value={bilanDraft.headPosture}
                          onChange={(e) =>
                            setBilanDraft({
                              ...bilanDraft,
                              headPosture: e.target.value as KidsPhysicalAssessment["headPosture"],
                            })
                          }
                          className={inputCls}
                        >
                          <option value="aligned">{t("val_aligned")}</option>
                          <option value="forward_mild">{t("val_forward_mild")}</option>
                          <option value="forward_marked">{t("val_forward_marked")}</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>{t("thoracicKyphosis")}</label>
                        <select
                          value={bilanDraft.thoracicKyphosis}
                          onChange={(e) =>
                            setBilanDraft({
                              ...bilanDraft,
                              thoracicKyphosis: e.target.value as KidsPhysicalAssessment["thoracicKyphosis"],
                            })
                          }
                          className={inputCls}
                        >
                          <option value="normal">{t("val_normal")}</option>
                          <option value="postural_round_back">{t("val_postural_round_back")}</option>
                          <option value="hyperkyphosis_reducible">{t("val_hyperkyphosis_reducible")}</option>
                          <option value="hyperkyphosis_rigid">{t("val_hyperkyphosis_rigid")}</option>
                          <option value="flat_back">{t("val_flat_back")}</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>{t("thoracicReducibility")}</label>
                        <select
                          value={bilanDraft.thoracicReducibility}
                          onChange={(e) =>
                            setBilanDraft({
                              ...bilanDraft,
                              thoracicReducibility: e.target.value as KidsPhysicalAssessment["thoracicReducibility"],
                            })
                          }
                          className={inputCls}
                        >
                          <option value="full">{t("val_full")}</option>
                          <option value="partial">{t("val_partial")}</option>
                          <option value="rigid">{t("val_rigid")}</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>{t("lumbarLordosis")}</label>
                        <select
                          value={bilanDraft.lumbarLordosis}
                          onChange={(e) =>
                            setBilanDraft({
                              ...bilanDraft,
                              lumbarLordosis: e.target.value as KidsPhysicalAssessment["lumbarLordosis"],
                            })
                          }
                          className={inputCls}
                        >
                          <option value="normal">{t("val_normal")}</option>
                          <option value="hyperlordosis">{t("val_hyperlordosis")}</option>
                          <option value="hypolordosis">{t("val_hypolordosis")}</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2 grid grid-cols-3 gap-3 pt-2 border-t border-white/10">
                        <div>
                          <label className={labelCls}>C7 (mm)</label>
                          <input
                            type="number"
                            min="0"
                            max="150"
                            value={bilanDraft.sagittalArrowC7Mm ?? ""}
                            onChange={(e) =>
                              setBilanDraft({
                                ...bilanDraft,
                                sagittalArrowC7Mm: parseNullableNum(e.target.value),
                              })
                            }
                            placeholder="25"
                            className={inputCls}
                          />
                          <p className={hintCls}>{t("refC7")}</p>
                        </div>
                        <div>
                          <label className={labelCls}>T6 (mm)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={bilanDraft.sagittalArrowT6Mm ?? ""}
                            onChange={(e) =>
                              setBilanDraft({
                                ...bilanDraft,
                                sagittalArrowT6Mm: parseNullableNum(e.target.value),
                              })
                            }
                            placeholder="0"
                            className={inputCls}
                          />
                          <p className={hintCls}>{t("refT6")}</p>
                        </div>
                        <div>
                          <label className={labelCls}>L3 (mm)</label>
                          <input
                            type="number"
                            min="0"
                            max="120"
                            value={bilanDraft.sagittalArrowL3Mm ?? ""}
                            onChange={(e) =>
                              setBilanDraft({
                                ...bilanDraft,
                                sagittalArrowL3Mm: parseNullableNum(e.target.value),
                              })
                            }
                            placeholder="32"
                            className={inputCls}
                          />
                          <p className={hintCls}>{t("refL3")}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 4: LOWER LIMBS & GAIT */}
                  {step === 4 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className={labelCls}>{t("kneeAlignment")}</label>
                        <select
                          value={bilanDraft.kneeAlignment}
                          onChange={(e) =>
                            setBilanDraft({
                              ...bilanDraft,
                              kneeAlignment: e.target.value as KidsPhysicalAssessment["kneeAlignment"],
                            })
                          }
                          className={inputCls}
                        >
                          <option value="normal">{t("val_normal")}</option>
                          <option value="genu_valgum">{t("val_genu_valgum")}</option>
                          <option value="genu_varum">{t("val_genu_varum")}</option>
                          <option value="asymmetric">{t("val_asymmetric")}</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>{t("kneeSagittal")}</label>
                        <select
                          value={bilanDraft.kneeSagittal}
                          onChange={(e) =>
                            setBilanDraft({
                              ...bilanDraft,
                              kneeSagittal: e.target.value as KidsPhysicalAssessment["kneeSagittal"],
                            })
                          }
                          className={inputCls}
                        >
                          <option value="normal">{t("val_normal")}</option>
                          <option value="genu_recurvatum">{t("val_genu_recurvatum")}</option>
                          <option value="genu_flexum">{t("val_genu_flexum")}</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>{t("intermalleolarDist")} (cm)</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="30"
                          value={bilanDraft.intermalleolarDistCm ?? ""}
                          onChange={(e) =>
                            setBilanDraft({
                              ...bilanDraft,
                              intermalleolarDistCm: parseNullableNum(e.target.value),
                            })
                          }
                          className={inputCls}
                        />
                        <p className={hintCls}>{t("hintDimRef")}</p>
                      </div>
                      <div>
                        <label className={labelCls}>{t("intercondylarDist")} (cm)</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="30"
                          value={bilanDraft.intercondylarDistCm ?? ""}
                          onChange={(e) =>
                            setBilanDraft({
                              ...bilanDraft,
                              intercondylarDistCm: parseNullableNum(e.target.value),
                            })
                          }
                          className={inputCls}
                        />
                        <p className={hintCls}>{t("hintDicRef")}</p>
                      </div>
                      <div>
                        <label className={labelCls}>{t("limbLengthDiff")} (mm)</label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="60"
                          value={bilanDraft.limbLengthDiffMm ?? ""}
                          onChange={(e) =>
                            setBilanDraft({
                              ...bilanDraft,
                              limbLengthDiffMm: parseNullableNum(e.target.value),
                            })
                          }
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>{t("gaitPattern")}</label>
                        <select
                          value={bilanDraft.gaitPattern}
                          onChange={(e) =>
                            setBilanDraft({
                              ...bilanDraft,
                              gaitPattern: e.target.value as KidsPhysicalAssessment["gaitPattern"],
                            })
                          }
                          className={inputCls}
                        >
                          <option value="normal">{t("val_normal")}</option>
                          <option value="intoeing">{t("val_intoeing")}</option>
                          <option value="outtoeing">{t("val_outtoeing")}</option>
                          <option value="toe_walking">{t("val_toe_walking")}</option>
                          <option value="limping">{t("val_limping")}</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* STEP 5: PODOLOGY & FOOT ARCH */}
                  {step === 5 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className={labelCls}>{t("footArch")}</label>
                        <select
                          value={bilanDraft.footArch}
                          onChange={(e) =>
                            setBilanDraft({
                              ...bilanDraft,
                              footArch: e.target.value as KidsPhysicalAssessment["footArch"],
                            })
                          }
                          className={inputCls}
                        >
                          <option value="normal">{t("val_normal")}</option>
                          <option value="flat_flexible">{t("val_flat_flexible")}</option>
                          <option value="flat_rigid">{t("val_flat_rigid")}</option>
                          <option value="high_arch">{t("val_high_arch")}</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>{t("heelAlignment")}</label>
                        <select
                          value={bilanDraft.heelAlignment}
                          onChange={(e) =>
                            setBilanDraft({
                              ...bilanDraft,
                              heelAlignment: e.target.value as KidsPhysicalAssessment["heelAlignment"],
                            })
                          }
                          className={inputCls}
                        >
                          <option value="neutral">{t("val_neutral")}</option>
                          <option value="valgus_mild">{t("val_valgus_mild")}</option>
                          <option value="valgus_marked">{t("val_valgus_marked")}</option>
                          <option value="varus">{t("val_varus")}</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>{t("jackTest")}</label>
                        <select
                          value={bilanDraft.jackTest}
                          onChange={(e) =>
                            setBilanDraft({
                              ...bilanDraft,
                              jackTest: e.target.value as KidsPhysicalAssessment["jackTest"],
                            })
                          }
                          className={inputCls}
                        >
                          <option value="positive_reducible">{t("val_positive_reducible")}</option>
                          <option value="negative_rigid">{t("val_negative_rigid")}</option>
                          <option value="not_tested">{t("val_not_tested")}</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>{t("tiptoeTest")}</label>
                        <select
                          value={bilanDraft.tiptoeTest}
                          onChange={(e) =>
                            setBilanDraft({
                              ...bilanDraft,
                              tiptoeTest: e.target.value as KidsPhysicalAssessment["tiptoeTest"],
                            })
                          }
                          className={inputCls}
                        >
                          <option value="arch_forms">{t("val_arch_forms")}</option>
                          <option value="arch_absent">{t("val_arch_absent")}</option>
                          <option value="not_tested">{t("val_not_tested")}</option>
                        </select>
                      </div>
                      <label className="sm:col-span-2 flex items-center gap-2.5 rounded-xl border border-white/10 bg-slate-950/60 p-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={bilanDraft.footPainOrFatigue}
                          onChange={(e) =>
                            setBilanDraft({ ...bilanDraft, footPainOrFatigue: e.target.checked })
                          }
                          className="h-4 w-4 accent-cyan-500"
                        />
                        <span className="text-xs font-semibold text-slate-200">{t("footPain")}</span>
                      </label>
                    </div>
                  )}

                  {/* STEP 6: MOBILITY, CORE & CLINICAL SYNTHESIS */}
                  {step === 6 && (
                    <div className="space-y-3.5">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className={labelCls}>{t("fingerFloorDist")} (cm)</label>
                          <input
                            type="number"
                            step="1"
                            min="-25"
                            max="60"
                            value={bilanDraft.fingerFloorDistCm ?? ""}
                            onChange={(e) =>
                              setBilanDraft({
                                ...bilanDraft,
                                fingerFloorDistCm: parseNullableNum(e.target.value),
                              })
                            }
                            placeholder="0"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>{t("schoberTest")} (+cm)</label>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="12"
                            value={bilanDraft.schoberCm ?? ""}
                            onChange={(e) =>
                              setBilanDraft({
                                ...bilanDraft,
                                schoberCm: parseNullableNum(e.target.value),
                              })
                            }
                            placeholder="5"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>{t("beightonScore")} (0-9)</label>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            max="9"
                            value={bilanDraft.beightonScore ?? ""}
                            onChange={(e) =>
                              setBilanDraft({
                                ...bilanDraft,
                                beightonScore: parseNullableNum(e.target.value),
                              })
                            }
                            placeholder="2"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>{t("coreEndurance")} (s)</label>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            max="600"
                            value={bilanDraft.coreEnduranceSec ?? ""}
                            onChange={(e) =>
                              setBilanDraft({
                                ...bilanDraft,
                                coreEnduranceSec: parseNullableNum(e.target.value),
                              })
                            }
                            placeholder="40"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>{t("backExtensor")} (s)</label>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            max="600"
                            value={bilanDraft.backExtensorSec ?? ""}
                            onChange={(e) =>
                              setBilanDraft({
                                ...bilanDraft,
                                backExtensorSec: parseNullableNum(e.target.value),
                              })
                            }
                            placeholder="35"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>{t("singleLegBalance")} (s)</label>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            max="300"
                            value={bilanDraft.singleLegBalanceSec ?? ""}
                            onChange={(e) =>
                              setBilanDraft({
                                ...bilanDraft,
                                singleLegBalanceSec: parseNullableNum(e.target.value),
                              })
                            }
                            placeholder="25"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>{t("shoulderMobility")}</label>
                          <select
                            value={bilanDraft.shoulderMobility}
                            onChange={(e) =>
                              setBilanDraft({
                                ...bilanDraft,
                                shoulderMobility: e.target.value as KidsPhysicalAssessment["shoulderMobility"],
                              })
                            }
                            className={inputCls}
                          >
                            <option value="optimal">{t("val_optimal")}</option>
                            <option value="mild_restriction">{t("val_mild_restriction")}</option>
                            <option value="restricted">{t("val_restricted")}</option>
                            <option value="hyperlax">{t("val_hyperlax")}</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>{t("breathingPattern")}</label>
                          <select
                            value={bilanDraft.breathingPattern}
                            onChange={(e) =>
                              setBilanDraft({
                                ...bilanDraft,
                                breathingPattern: e.target.value as KidsPhysicalAssessment["breathingPattern"],
                              })
                            }
                            className={inputCls}
                          >
                            <option value="diaphragmatic_balanced">{t("val_diaphragmatic_balanced")}</option>
                            <option value="thoracic_shallow">{t("val_thoracic_shallow")}</option>
                            <option value="mouth_breathing">{t("val_mouth_breathing")}</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/10">
                        <div>
                          <label className={labelCls}>{t("clinicalSummaryLabel")}</label>
                          <textarea
                            rows={3}
                            value={bilanDraft.clinicalSummary || ""}
                            onChange={(e) =>
                              setBilanDraft({ ...bilanDraft, clinicalSummary: e.target.value })
                            }
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>{t("parentAdviceLabel")}</label>
                          <textarea
                            rows={3}
                            value={bilanDraft.parentAdvice || ""}
                            onChange={(e) =>
                              setBilanDraft({ ...bilanDraft, parentAdvice: e.target.value })
                            }
                            className={inputCls}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                        <div>
                          <label className={labelCls}>{t("nextCheckup")}</label>
                          <input
                            type="date"
                            value={bilanDraft.nextCheckupDate || ""}
                            onChange={(e) =>
                              setBilanDraft({
                                ...bilanDraft,
                                nextCheckupDate: e.target.value || null,
                              })
                            }
                            className={inputCls}
                          />
                        </div>
                        <label className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/20 px-3 py-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={bilanDraft.referralRecommended}
                            onChange={(e) =>
                              setBilanDraft({
                                ...bilanDraft,
                                referralRecommended: e.target.checked,
                              })
                            }
                            className="h-4 w-4 accent-rose-500"
                          />
                          <span className="text-[11px] font-semibold text-rose-200">
                            {t("referralRecommendedLabel")}
                          </span>
                        </label>
                        <label className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-950/20 px-3 py-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={bilanDraft.publishedToPortal}
                            onChange={(e) =>
                              setBilanDraft({
                                ...bilanDraft,
                                publishedToPortal: e.target.checked,
                              })
                            }
                            className="h-4 w-4 accent-cyan-400"
                          />
                          <span className="text-[11px] font-semibold text-cyan-200">
                            {t("publishToggle")}
                          </span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Step Footer Controls */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      {step > 1 && (
                        <button
                          type="button"
                          onClick={() => setStep((s) => (s - 1) as FormStep)}
                          className="rounded-lg border border-white/10 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:text-white"
                        >
                          &larr; {t("prevStep")}
                        </button>
                      )}
                      {step < 6 && (
                        <button
                          type="button"
                          onClick={() => setStep((s) => (s + 1) as FormStep)}
                          className="rounded-lg border border-cyan-500/40 bg-cyan-950/60 px-3.5 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-900/60"
                        >
                          {t("nextStep")} &rarr;
                        </button>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 hover:from-sky-400 hover:to-cyan-300 px-5 py-2 text-xs font-bold text-slate-950 shadow-[0_0_16px_rgba(0,242,255,0.3)] disabled:opacity-50"
                    >
                      {saving ? t("saving") : t("saveBilan")}
                    </button>
                  </div>
                </div>

                {/* RIGHT: LIVE CLINICAL PREVIEW */}
                <div className="lg:col-span-5 p-4 bg-slate-950/50 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                      {t("livePreview")}
                    </span>
                    <div className="flex items-center gap-2">
                      {statusPill(livePreview.evaluation.overallStatus)}
                      <span className="font-mono text-sm font-black text-white">
                        {livePreview.evaluation.overallScore}%
                      </span>
                    </div>
                  </div>

                  <KidsBodyMapSvg
                    assessment={livePreview.assessment}
                    bodyZones={livePreview.evaluation.bodyZones}
                    compact
                    formatValue={(v) => t(`val_${v}`)}
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

                  <KidsWhoBmiGauge
                    bmi={livePreview.evaluation.bmi}
                    zScore={livePreview.evaluation.bmiZScore}
                    band={livePreview.evaluation.bmiBand}
                    bandLabel={t(bmiBandKey(livePreview.evaluation.bmiBand))}
                    title={t("bmi")}
                    optimalZoneLabel={t("whoOptimalShort")}
                    zScoreLabel={t("zScoreLabel")}
                    unitLabel={t("unitBmi")}
                  />

                  <KidsDomainRadarChart
                    current={livePreview.evaluation.domainScores}
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

                  {/* Auto-detected Flags Preview */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      {t("flagsTitle")} ({livePreview.evaluation.flags.length})
                    </span>
                    {livePreview.evaluation.flags.length === 0 ? (
                      <p className="text-[11px] text-emerald-400">{t("noFlagsTitle")}</p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {livePreview.evaluation.flags.map((f, i) => (
                          <span
                            key={`${f.code}-${i}`}
                            className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
                              f.severity === "referral"
                                ? "border-rose-500/40 bg-rose-950/60 text-rose-300"
                                : f.severity === "watch"
                                  ? "border-amber-500/40 bg-amber-950/60 text-amber-300"
                                  : "border-sky-500/30 bg-sky-950/50 text-sky-300"
                            }`}
                          >
                            {t(`flag_${f.code}_title`)}
                            {f.metricValue ? ` (${f.metricValue})` : ""}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title={t("deleteBilan")}
        message={t("confirmDeleteBilan")}
        confirmLabel={t("deleteBilan")}
        cancelLabel={t("cancel")}
        isDanger
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Full Clinical Documentation & Protocol Guide for the Physiotherapist */}
      <SwimKidsKineGuideModal
        open={Boolean(guideSection)}
        initialSection={guideSection ?? "prep"}
        onClose={() => setGuideSection(null)}
      />
    </div>
  );
}

"use client";

import React from "react";
import type {
  KidsPhysicalAssessment,
  OverallStatus,
} from "@/lib/swim-kids-physical";

// ─── 1. Hero Aquatic-Morphostatic Emblem Illustration ────────────────────────

export function KidsHeroSuiviIllustration({
  status = "optimal",
  className = "w-24 h-24",
}: {
  status?: OverallStatus | "pending";
  className?: string;
}) {
  const accent =
    status === "referral"
      ? "#ef4444"
      : status === "watch"
        ? "#f59e0b"
        : status === "pending"
          ? "#38bdf8"
          : "#00f2ff";

  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      fill="none"
      role="img"
      aria-label="AQA Kids Suivi Physique"
    >
      <defs>
        <radialGradient id="kidsHeroGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.32" />
          <stop offset="70%" stopColor="#0ea5e9" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#030712" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="kidsSpineGrad" x1="60" y1="22" x2="60" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor={accent} />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>

      {/* Ambient radial aura */}
      <circle cx="60" cy="60" r="56" fill="url(#kidsHeroGlow)" />
      {/* Precision scan rings */}
      <circle cx="60" cy="60" r="46" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="4 4" />
      <circle cx="60" cy="60" r="34" stroke="rgba(0,242,255,0.18)" strokeWidth="1" />

      {/* Subtle aquatic waves at bottom */}
      <path
        d="M22 86 Q34 80 46 86 T70 86 T98 86"
        stroke="rgba(56,189,248,0.45)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M28 94 Q40 89 52 94 T76 94 T92 94"
        stroke="rgba(0,242,255,0.28)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* Stylized child swimmer/posture silhouette */}
      <circle cx="60" cy="28" r="8.5" fill="rgba(15,23,42,0.9)" stroke={accent} strokeWidth="1.8" />
      {/* Raised streamline / balanced posture shoulders & torso */}
      <path
        d="M36 46 Q48 40 60 40 Q72 40 84 46"
        stroke="#38bdf8"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M48 44 L51 74 L69 74 L72 44"
        fill="rgba(14,165,233,0.12)"
        stroke="rgba(148,163,184,0.35)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Luminous vertebral alignment axis */}
      <path
        d="M60 39 L60 80"
        stroke="url(#kidsSpineGrad)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      {/* Vertebrae nodes */}
      {[44, 53, 62, 71, 79].map((y) => (
        <circle key={y} cx="60" cy={y} r="2.6" fill="#030712" stroke={accent} strokeWidth="1.6" />
      ))}

      {/* Alignment crosshair ticks */}
      <line x1="20" y1="60" x2="28" y2="60" stroke={accent} strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
      <line x1="92" y1="60" x2="100" y2="60" stroke={accent} strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

// ─── 2. Scoliosis & Adams Forward Bend Illustration ──────────────────────────

export function ScoliosisAdamsIllustration({
  assessment,
  labels,
}: {
  assessment?: KidsPhysicalAssessment | null;
  labels: {
    normal: string;
    curved: string;
    adams: string;
    yourChild: string;
  };
}) {
  const hasRibHump =
    assessment &&
    (assessment.adamsTest === "rib_hump_thoracic" ||
      assessment.adamsTest === "rib_hump_lumbar" ||
      assessment.adamsTest === "rib_hump_double" ||
      (assessment.scoliometerAtrDeg !== null && assessment.scoliometerAtrDeg >= 7));
  const hasWatch =
    assessment &&
    !hasRibHump &&
    (assessment.adamsTest === "postural_asymmetry" ||
      (assessment.scoliometerAtrDeg !== null && assessment.scoliometerAtrDeg >= 4) ||
      assessment.shouldersLevel !== "balanced" ||
      assessment.pelvisLevel !== "balanced");

  const activeIdx = !assessment ? -1 : hasRibHump ? 2 : hasWatch ? 1 : 0;

  return (
    <div className="grid grid-cols-3 gap-2" dir="ltr">
      {/* Panel 0: Aligned Spine */}
      <div
        className={`rounded-xl border p-2 flex flex-col items-center text-center transition-all ${
          activeIdx === 0
            ? "border-emerald-400/70 bg-emerald-950/30 shadow-[0_0_14px_rgba(16,185,129,0.2)]"
            : "border-white/10 bg-slate-950/60 opacity-75"
        }`}
      >
        <svg viewBox="0 0 80 96" className="w-16 h-20">
          <line x1="40" y1="10" x2="40" y2="86" stroke="rgba(16,185,129,0.35)" strokeWidth="1" strokeDasharray="3 2" />
          <circle cx="40" cy="16" r="8" fill="rgba(30,41,59,0.8)" stroke="#94a3b8" strokeWidth="1.2" />
          <path d="M24 30 L56 30 L52 72 L28 72 Z" fill="rgba(30,41,59,0.6)" stroke="#64748b" strokeWidth="1.1" strokeLinejoin="round" />
          <line x1="25" y1="30" x2="55" y2="30" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
          <line x1="40" y1="26" x2="40" y2="76" stroke="#10b981" strokeWidth="2.6" strokeLinecap="round" />
          <line x1="28" y1="72" x2="52" y2="72" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span className="text-[10px] font-bold text-slate-200 leading-tight">{labels.normal}</span>
        {activeIdx === 0 && (
          <span className="mt-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-1.5 py-0.5 text-[8px] font-bold uppercase text-emerald-300">
            {labels.yourChild}
          </span>
        )}
      </div>

      {/* Panel 1: Scoliotic Attitude / Curve */}
      <div
        className={`rounded-xl border p-2 flex flex-col items-center text-center transition-all ${
          activeIdx === 1
            ? "border-amber-400/70 bg-amber-950/30 shadow-[0_0_14px_rgba(245,158,11,0.2)]"
            : "border-white/10 bg-slate-950/60 opacity-75"
        }`}
      >
        <svg viewBox="0 0 80 96" className="w-16 h-20">
          <line x1="40" y1="10" x2="40" y2="86" stroke="rgba(148,163,184,0.25)" strokeWidth="1" strokeDasharray="3 2" />
          <circle cx="40" cy="16" r="8" fill="rgba(30,41,59,0.8)" stroke="#94a3b8" strokeWidth="1.2" />
          <path d="M24 33 L56 27 L52 74 L28 70 Z" fill="rgba(30,41,59,0.6)" stroke="#64748b" strokeWidth="1.1" strokeLinejoin="round" />
          <line x1="25" y1="33" x2="55" y2="27" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
          <path d="M40 26 Q51 44 40 56 Q32 66 40 76" fill="none" stroke="#f59e0b" strokeWidth="2.6" strokeLinecap="round" />
          <line x1="28" y1="70" x2="52" y2="74" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span className="text-[10px] font-bold text-slate-200 leading-tight">{labels.curved}</span>
        {activeIdx === 1 && (
          <span className="mt-1 rounded-full bg-amber-500/20 border border-amber-400/40 px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-300">
            {labels.yourChild}
          </span>
        )}
      </div>

      {/* Panel 2: Adams Forward Bend Test (Rib Hump / Scoliometer) */}
      <div
        className={`rounded-xl border p-2 flex flex-col items-center text-center transition-all ${
          activeIdx === 2
            ? "border-rose-400/70 bg-rose-950/30 shadow-[0_0_14px_rgba(239,68,68,0.25)]"
            : "border-white/10 bg-slate-950/60 opacity-75"
        }`}
      >
        <svg viewBox="0 0 80 96" className="w-16 h-20">
          {/* Bent back ribcage contour showing rib hump */}
          <path
            d="M14 54 Q26 42 40 44 Q55 32 66 54 L62 76 L18 76 Z"
            fill="rgba(30,41,59,0.7)"
            stroke="#94a3b8"
            strokeWidth="1.2"
          />
          {/* Scoliometer level bar tilted on rib hump */}
          <line x1="16" y1="42" x2="64" y2="30" stroke="#ef4444" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="52" cy="39" r="6" fill="rgba(239,68,68,0.28)" stroke="#ef4444" strokeWidth="1.4" />
          {/* Horizontal reference */}
          <line x1="14" y1="38" x2="66" y2="38" stroke="rgba(0,242,255,0.35)" strokeWidth="1" strokeDasharray="2 2" />
          <text x="40" y="21" textAnchor="middle" fontSize="8" fontFamily="monospace" fill="#fda4af">ATR</text>
        </svg>
        <span className="text-[10px] font-bold text-slate-200 leading-tight">{labels.adams}</span>
        {activeIdx === 2 && (
          <span className="mt-1 rounded-full bg-rose-500/20 border border-rose-400/40 px-1.5 py-0.5 text-[8px] font-bold uppercase text-rose-300">
            {labels.yourChild}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── 3. Sagittal Profile Illustration (Cyphose & Hyperlordose) ───────────────

export function SagittalSpineIllustration({
  assessment,
  labels,
}: {
  assessment?: KidsPhysicalAssessment | null;
  labels: {
    ideal: string;
    kyphosis: string;
    lordosis: string;
    yourChild: string;
  };
}) {
  const isKyphosis =
    assessment &&
    (assessment.thoracicKyphosis === "hyperkyphosis_rigid" ||
      assessment.thoracicKyphosis === "hyperkyphosis_reducible" ||
      assessment.thoracicKyphosis === "postural_round_back");
  const isLordosis = assessment && assessment.lumbarLordosis === "hyperlordosis";

  const activeIdx = !assessment ? -1 : isKyphosis ? 1 : isLordosis ? 2 : 0;

  return (
    <div className="grid grid-cols-3 gap-2" dir="ltr">
      {/* Panel 0: Balanced Profile */}
      <div
        className={`rounded-xl border p-2 flex flex-col items-center text-center ${
          activeIdx === 0
            ? "border-emerald-400/70 bg-emerald-950/30 shadow-[0_0_14px_rgba(16,185,129,0.2)]"
            : "border-white/10 bg-slate-950/60 opacity-75"
        }`}
      >
        <svg viewBox="0 0 80 96" className="w-16 h-20">
          <line x1="38" y1="8" x2="38" y2="88" stroke="rgba(16,185,129,0.35)" strokeWidth="1" strokeDasharray="3 2" />
          <circle cx="40" cy="16" r="7.5" fill="rgba(30,41,59,0.8)" stroke="#94a3b8" strokeWidth="1.2" />
          <path d="M40 25 Q35 45 40 60 Q43 70 39 82" fill="none" stroke="#10b981" strokeWidth="2.8" strokeLinecap="round" />
        </svg>
        <span className="text-[10px] font-bold text-slate-200 leading-tight">{labels.ideal}</span>
        {activeIdx === 0 && (
          <span className="mt-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-1.5 py-0.5 text-[8px] font-bold uppercase text-emerald-300">
            {labels.yourChild}
          </span>
        )}
      </div>

      {/* Panel 1: Cyphose / Dos Rond */}
      <div
        className={`rounded-xl border p-2 flex flex-col items-center text-center ${
          activeIdx === 1
            ? "border-amber-400/70 bg-amber-950/30 shadow-[0_0_14px_rgba(245,158,11,0.2)]"
            : "border-white/10 bg-slate-950/60 opacity-75"
        }`}
      >
        <svg viewBox="0 0 80 96" className="w-16 h-20">
          <line x1="38" y1="8" x2="38" y2="88" stroke="rgba(148,163,184,0.25)" strokeWidth="1" strokeDasharray="3 2" />
          <circle cx="48" cy="18" r="7.5" fill="rgba(30,41,59,0.8)" stroke="#f59e0b" strokeWidth="1.3" />
          <path d="M44 26 Q22 44 39 62 Q43 72 39 82" fill="none" stroke="#f59e0b" strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="30" cy="44" r="5" fill="rgba(245,158,11,0.25)" stroke="#f59e0b" strokeWidth="1.2" />
        </svg>
        <span className="text-[10px] font-bold text-slate-200 leading-tight">{labels.kyphosis}</span>
        {activeIdx === 1 && (
          <span className="mt-1 rounded-full bg-amber-500/20 border border-amber-400/40 px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-300">
            {labels.yourChild}
          </span>
        )}
      </div>

      {/* Panel 2: Hyperlordose */}
      <div
        className={`rounded-xl border p-2 flex flex-col items-center text-center ${
          activeIdx === 2
            ? "border-amber-400/70 bg-amber-950/30 shadow-[0_0_14px_rgba(245,158,11,0.2)]"
            : "border-white/10 bg-slate-950/60 opacity-75"
        }`}
      >
        <svg viewBox="0 0 80 96" className="w-16 h-20">
          <line x1="38" y1="8" x2="38" y2="88" stroke="rgba(148,163,184,0.25)" strokeWidth="1" strokeDasharray="3 2" />
          <circle cx="40" cy="16" r="7.5" fill="rgba(30,41,59,0.8)" stroke="#94a3b8" strokeWidth="1.2" />
          <path d="M40 25 Q35 42 40 54 Q55 68 38 82" fill="none" stroke="#f59e0b" strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="47" cy="67" r="5" fill="rgba(245,158,11,0.25)" stroke="#f59e0b" strokeWidth="1.2" />
        </svg>
        <span className="text-[10px] font-bold text-slate-200 leading-tight">{labels.lordosis}</span>
        {activeIdx === 2 && (
          <span className="mt-1 rounded-full bg-amber-500/20 border border-amber-400/40 px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-300">
            {labels.yourChild}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── 4. Knees & Lower-Limb Axes Illustration (Salenius-Vankka) ───────────────

export function KneeAlignmentIllustration({
  assessment,
  labels,
}: {
  assessment?: KidsPhysicalAssessment | null;
  labels: {
    normal: string;
    valgum: string;
    varum: string;
    yourChild: string;
  };
}) {
  const activeIdx = !assessment
    ? -1
    : assessment.kneeAlignment === "genu_valgum"
      ? 1
      : assessment.kneeAlignment === "genu_varum"
        ? 2
        : assessment.kneeAlignment === "normal"
          ? 0
          : -1;

  return (
    <div className="grid grid-cols-3 gap-2" dir="ltr">
      {/* Normal */}
      <div
        className={`rounded-xl border p-2 flex flex-col items-center text-center ${
          activeIdx === 0
            ? "border-emerald-400/70 bg-emerald-950/30 shadow-[0_0_14px_rgba(16,185,129,0.2)]"
            : "border-white/10 bg-slate-950/60 opacity-75"
        }`}
      >
        <svg viewBox="0 0 80 96" className="w-16 h-20">
          <rect x="24" y="10" width="32" height="12" rx="5" fill="rgba(30,41,59,0.8)" stroke="#64748b" strokeWidth="1.1" />
          <polyline points="32,22 33,54 33,86" fill="none" stroke="#10b981" strokeWidth="3.2" strokeLinecap="round" />
          <polyline points="48,22 47,54 47,86" fill="none" stroke="#10b981" strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="33" cy="54" r="3" fill="#030712" stroke="#10b981" strokeWidth="1.5" />
          <circle cx="47" cy="54" r="3" fill="#030712" stroke="#10b981" strokeWidth="1.5" />
        </svg>
        <span className="text-[10px] font-bold text-slate-200 leading-tight">{labels.normal}</span>
        {activeIdx === 0 && (
          <span className="mt-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-1.5 py-0.5 text-[8px] font-bold uppercase text-emerald-300">
            {labels.yourChild}
          </span>
        )}
      </div>

      {/* Genu Valgum (X) */}
      <div
        className={`rounded-xl border p-2 flex flex-col items-center text-center ${
          activeIdx === 1
            ? "border-amber-400/70 bg-amber-950/30 shadow-[0_0_14px_rgba(245,158,11,0.2)]"
            : "border-white/10 bg-slate-950/60 opacity-75"
        }`}
      >
        <svg viewBox="0 0 80 96" className="w-16 h-20">
          <rect x="24" y="10" width="32" height="12" rx="5" fill="rgba(30,41,59,0.8)" stroke="#64748b" strokeWidth="1.1" />
          <polyline points="30,22 38,54 24,86" fill="none" stroke="#f59e0b" strokeWidth="3.2" strokeLinecap="round" />
          <polyline points="50,22 42,54 56,86" fill="none" stroke="#f59e0b" strokeWidth="3.2" strokeLinecap="round" />
          <line x1="27" y1="84" x2="53" y2="84" stroke="#38bdf8" strokeWidth="1.4" strokeDasharray="2 2" />
          <text x="40" y="93" textAnchor="middle" fontSize="7.5" fontFamily="monospace" fill="#38bdf8">DIM</text>
        </svg>
        <span className="text-[10px] font-bold text-slate-200 leading-tight">{labels.valgum}</span>
        {activeIdx === 1 && (
          <span className="mt-1 rounded-full bg-amber-500/20 border border-amber-400/40 px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-300">
            {labels.yourChild}
          </span>
        )}
      </div>

      {/* Genu Varum ( ) */}
      <div
        className={`rounded-xl border p-2 flex flex-col items-center text-center ${
          activeIdx === 2
            ? "border-amber-400/70 bg-amber-950/30 shadow-[0_0_14px_rgba(245,158,11,0.2)]"
            : "border-white/10 bg-slate-950/60 opacity-75"
        }`}
      >
        <svg viewBox="0 0 80 96" className="w-16 h-20">
          <rect x="24" y="10" width="32" height="12" rx="5" fill="rgba(30,41,59,0.8)" stroke="#64748b" strokeWidth="1.1" />
          <polyline points="32,22 23,54 35,86" fill="none" stroke="#f59e0b" strokeWidth="3.2" strokeLinecap="round" />
          <polyline points="48,22 57,54 45,86" fill="none" stroke="#f59e0b" strokeWidth="3.2" strokeLinecap="round" />
          <line x1="26" y1="54" x2="54" y2="54" stroke="#38bdf8" strokeWidth="1.4" strokeDasharray="2 2" />
          <text x="40" y="51" textAnchor="middle" fontSize="7.5" fontFamily="monospace" fill="#38bdf8">DIC</text>
        </svg>
        <span className="text-[10px] font-bold text-slate-200 leading-tight">{labels.varum}</span>
        {activeIdx === 2 && (
          <span className="mt-1 rounded-full bg-amber-500/20 border border-amber-400/40 px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-300">
            {labels.yourChild}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── 5. Plantar Arch & Jack Windlass Test Illustration ───────────────────────

export function FootArchIllustration({
  assessment,
  labels,
}: {
  assessment?: KidsPhysicalAssessment | null;
  labels: {
    normal: string;
    flat: string;
    jack: string;
    yourChild: string;
  };
}) {
  const isFlat =
    assessment && (assessment.footArch === "flat_flexible" || assessment.footArch === "flat_rigid");
  const isJackPositiveFlat = isFlat && assessment?.jackTest === "positive_reducible";
  const activeIdx = !assessment
    ? -1
    : isJackPositiveFlat
      ? 2
      : isFlat
        ? 1
        : assessment.footArch === "normal"
          ? 0
          : -1;

  return (
    <div className="grid grid-cols-3 gap-2" dir="ltr">
      {/* Normal Arch */}
      <div
        className={`rounded-xl border p-2 flex flex-col items-center text-center ${
          activeIdx === 0
            ? "border-emerald-400/70 bg-emerald-950/30 shadow-[0_0_14px_rgba(16,185,129,0.2)]"
            : "border-white/10 bg-slate-950/60 opacity-75"
        }`}
      >
        <svg viewBox="0 0 86 64" className="w-20 h-14">
          <line x1="8" y1="52" x2="78" y2="52" stroke="rgba(148,163,184,0.35)" strokeWidth="1.2" />
          <path
            d="M16 51 L16 32 Q22 24 30 34 Q46 36 68 42 Q76 45 74 51 L56 51 Q40 40 28 51 Z"
            fill="rgba(16,185,129,0.2)"
            stroke="#10b981"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-[10px] font-bold text-slate-200 leading-tight">{labels.normal}</span>
        {activeIdx === 0 && (
          <span className="mt-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-1.5 py-0.5 text-[8px] font-bold uppercase text-emerald-300">
            {labels.yourChild}
          </span>
        )}
      </div>

      {/* Flatfoot */}
      <div
        className={`rounded-xl border p-2 flex flex-col items-center text-center ${
          activeIdx === 1
            ? "border-amber-400/70 bg-amber-950/30 shadow-[0_0_14px_rgba(245,158,11,0.2)]"
            : "border-white/10 bg-slate-950/60 opacity-75"
        }`}
      >
        <svg viewBox="0 0 86 64" className="w-20 h-14">
          <line x1="8" y1="52" x2="78" y2="52" stroke="rgba(148,163,184,0.35)" strokeWidth="1.2" />
          <path
            d="M16 51 L16 32 Q22 24 30 35 Q46 38 68 43 Q76 46 74 51 L16 51 Z"
            fill="rgba(245,158,11,0.22)"
            stroke="#f59e0b"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-[10px] font-bold text-slate-200 leading-tight">{labels.flat}</span>
        {activeIdx === 1 && (
          <span className="mt-1 rounded-full bg-amber-500/20 border border-amber-400/40 px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-300">
            {labels.yourChild}
          </span>
        )}
      </div>

      {/* Jack Windlass Test (Big Toe Lift -> Arch Reforms) */}
      <div
        className={`rounded-xl border p-2 flex flex-col items-center text-center ${
          activeIdx === 2
            ? "border-sky-400/70 bg-sky-950/30 shadow-[0_0_14px_rgba(56,189,248,0.22)]"
            : "border-white/10 bg-slate-950/60 opacity-75"
        }`}
      >
        <svg viewBox="0 0 86 64" className="w-20 h-14">
          <line x1="8" y1="52" x2="78" y2="52" stroke="rgba(148,163,184,0.35)" strokeWidth="1.2" />
          <path
            d="M16 51 L16 32 Q22 24 30 34 Q46 35 62 42 L74 32 L76 38 L62 50 L54 51 Q40 40 28 51 Z"
            fill="rgba(56,189,248,0.22)"
            stroke="#38bdf8"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          {/* Upward arrow on big toe & arch */}
          <path d="M42 50 L42 43 M39 46 L42 43 L45 46" stroke="#00f2ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-[10px] font-bold text-slate-200 leading-tight">{labels.jack}</span>
        {activeIdx === 2 && (
          <span className="mt-1 rounded-full bg-sky-500/20 border border-sky-400/40 px-1.5 py-0.5 text-[8px] font-bold uppercase text-sky-300">
            {labels.yourChild}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── 6. Aquatic Corrective Swim Drill Illustrations ──────────────────────────

export function AquaticCorrectiveIllustration({ code }: { code: string }) {
  return (
    <div
      className="w-16 h-12 rounded-xl border border-cyan-500/25 bg-slate-950/80 flex items-center justify-center shrink-0"
      dir="ltr"
    >
      <svg viewBox="0 0 64 44" className="w-14 h-10" fill="none">
        {/* Water surface wave */}
        <path d="M4 32 Q14 28 24 32 T44 32 T60 32" stroke="rgba(56,189,248,0.45)" strokeWidth="1.4" strokeLinecap="round" />

        {code.includes("kyphosis") || code.includes("scapular") ? (
          /* Backstroke chest opening */
          <>
            <circle cx="16" cy="24" r="4.5" stroke="#00f2ff" strokeWidth="1.6" />
            <line x1="21" y1="25" x2="48" y2="27" stroke="#38bdf8" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M26 24 L36 10" stroke="#00f2ff" strokeWidth="2" strokeLinecap="round" />
            <path d="M48 27 L58 23 M48 27 L58 31" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />
          </>
        ) : code.includes("flatfoot") || code.includes("genu_valgum") ? (
          /* Straight flutter kick with pointed toes */
          <>
            <line x1="10" y1="22" x2="36" y2="22" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M36 22 L54 17 M36 22 L54 27" stroke="#00f2ff" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M56 14 L56 29" stroke="#10b981" strokeWidth="1.3" strokeDasharray="2 2" />
          </>
        ) : code.includes("respiratory") ? (
          /* Bubbles & thoracic expansion */
          <>
            <circle cx="24" cy="24" r="7" stroke="#00f2ff" strokeWidth="1.8" />
            <circle cx="38" cy="18" r="2.5" stroke="#38bdf8" strokeWidth="1.4" />
            <circle cx="45" cy="12" r="3.5" stroke="#00f2ff" strokeWidth="1.4" />
            <circle cx="52" cy="19" r="2" stroke="#38bdf8" strokeWidth="1.2" />
          </>
        ) : (
          /* Streamline axial elongation & balanced swimming */
          <>
            <circle cx="22" cy="21" r="4.2" stroke="#00f2ff" strokeWidth="1.6" />
            <line x1="8" y1="20" x2="54" y2="24" stroke="#00f2ff" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M8 20 L14 16 M8 20 L14 24" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M54 24 L59 21 M54 24 L59 27" stroke="#38bdf8" strokeWidth="1.6" strokeLinecap="round" />
          </>
        )}
      </svg>
    </div>
  );
}

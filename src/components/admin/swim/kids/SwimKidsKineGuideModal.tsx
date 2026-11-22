"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/lib/i18n";
import {
  KINE_PROTOCOL_BOOKS,
  type KineGuideSection,
  type KineGuideSectionId,
  type KineThresholdChip,
} from "./kine-protocol-data";

interface SwimKidsKineGuideModalProps {
  open: boolean;
  initialSection?: KineGuideSectionId;
  onClose: () => void;
}

const CHIP_STYLES: Record<KineThresholdChip["tone"], string> = {
  emerald: "border-emerald-500/35 bg-emerald-950/50 text-emerald-200",
  sky: "border-sky-500/35 bg-sky-950/50 text-sky-200",
  amber: "border-amber-500/40 bg-amber-950/50 text-amber-200",
  rose: "border-rose-500/45 bg-rose-950/55 text-rose-200",
};

const CHIP_DOT: Record<KineThresholdChip["tone"], string> = {
  emerald: "bg-emerald-400",
  sky: "bg-sky-400",
  amber: "bg-amber-400",
  rose: "bg-rose-400",
};

function matchesQuery(section: KineGuideSection, q: string): boolean {
  if (!q) return true;
  const hay = [
    section.title,
    section.subtitle,
    section.intro,
    ...(section.checklist ?? []),
    ...(section.references ?? []),
    ...(section.tests ?? []).flatMap((t) => [
      t.title,
      t.formField,
      t.position,
      t.pitfall,
      ...t.steps,
      ...t.thresholds.map((c) => c.label),
    ]),
    ...(section.beightonTable ?? []).flatMap((r) => [r.criterion, r.side, r.points]),
    ...(section.redFlagMatrix ?? []).flatMap((r) => [r.domain, r.optimal, r.watch, r.referral]),
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export function SwimKidsKineGuideModal({
  open,
  initialSection = "prep",
  onClose,
}: SwimKidsKineGuideModalProps) {
  const { locale, setLocale, dir } = useLocale();
  const [activeId, setActiveId] = useState<KineGuideSectionId>(initialSection);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) {
      setActiveId(initialSection);
      setQuery("");
    }
  }, [open, initialSection]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const book = KINE_PROTOCOL_BOOKS[locale] ?? KINE_PROTOCOL_BOOKS.fr;
  const normalizedQuery = query.trim().toLowerCase();

  const visibleSections = useMemo(() => {
    if (!normalizedQuery) return book.sections;
    return book.sections
      .filter((s) => matchesQuery(s, normalizedQuery))
      .map((s) => {
        if (!s.tests) return s;
        const filteredTests = s.tests.filter((t) =>
          [t.title, t.formField, t.position, t.pitfall, ...t.steps, ...t.thresholds.map((c) => c.label)]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery)
        );
        return filteredTests.length > 0 ? { ...s, tests: filteredTests } : s;
      });
  }, [book.sections, normalizedQuery]);

  const activeIdx = book.sections.findIndex((s) => s.id === activeId);

  if (!open) return null;

  return (
    <div
      id="aqa-kine-guide-print"
      dir={dir}
      className="fixed inset-0 z-[60] flex flex-col bg-[#030712]/96 backdrop-blur-xl text-slate-100 print:static print:bg-white print:text-slate-900"
    >
      {/* Subtle Dark Ocean ambient orbs */}
      <div className="pointer-events-none fixed -top-24 -left-24 h-80 w-80 rounded-full bg-sky-500/12 blur-[120px] print:hidden" />
      <div className="pointer-events-none fixed -bottom-24 -right-24 h-80 w-80 rounded-full bg-cyan-400/10 blur-[120px] print:hidden" />

      {/* Sticky Top Header */}
      <header className="relative z-10 border-b border-white/10 bg-[#030712]/92 px-4 sm:px-6 py-3.5 backdrop-blur-xl print:border-slate-300 print:bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-cyan-400/40 bg-cyan-950/70 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-300 print:border-slate-400 print:bg-transparent print:text-slate-700">
                AQA KIDS · KINE
              </span>
              <h2 className="truncate text-sm sm:text-base font-extrabold text-white print:text-slate-900">
                {book.modalTitle}
              </h2>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-400 print:text-slate-600">
              {book.modalSubtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {/* Search Box */}
            <div className="relative">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={book.searchPlaceholder}
                className="min-h-[36px] w-56 sm:w-72 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-xs text-white placeholder-slate-500 outline-none focus:border-[var(--accent)]"
              />
            </div>

            {/* FR / AR / EN Switcher */}
            <div className="flex items-center gap-0.5 rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] p-1">
              {(["fr", "ar", "en"] as const).map((lng) => (
                <button
                  key={lng}
                  type="button"
                  onClick={() => setLocale(lng)}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase transition-all cursor-pointer ${
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
              onClick={() => window.print()}
              className="min-h-[36px] inline-flex items-center gap-1.5 rounded-[10px] border border-cyan-500/35 bg-cyan-950/60 px-3 text-xs font-semibold text-cyan-200 hover:bg-cyan-900/70 transition-all cursor-pointer"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              <span className="hidden sm:inline">{book.printBtn}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="min-h-[36px] rounded-[10px] border border-white/15 bg-slate-800 px-3.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-all cursor-pointer"
            >
              {book.closeBtn}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area: Sidebar + Protocol Reader */}
      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col lg:flex-row overflow-hidden print:overflow-visible">
        {/* Desktop Sidebar / Mobile Horizontal Section Pills */}
        <aside className="shrink-0 border-b lg:border-b-0 lg:border-e border-white/10 bg-slate-950/65 lg:w-72 overflow-x-auto lg:overflow-y-auto p-3 print:hidden">
          <nav className="flex lg:flex-col gap-1.5">
            {book.sections.map((sec) => {
              const isActive = !normalizedQuery && sec.id === activeId;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setActiveId(sec.id);
                  }}
                  className={`flex shrink-0 items-center gap-2.5 rounded-xl border px-3 py-2 text-start text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "border-cyan-400/55 bg-gradient-to-r from-sky-500/20 to-cyan-400/15 text-white shadow-[0_0_14px_rgba(0,242,255,0.16)]"
                      : "border-white/5 bg-slate-900/55 text-slate-400 hover:border-white/15 hover:text-slate-100"
                  }`}
                >
                  <span
                    className={`font-mono text-[10px] font-bold rounded-md px-1.5 py-0.5 ${
                      isActive ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-cyan-300"
                    }`}
                  >
                    {sec.badge}
                  </span>
                  <span className="truncate">{sec.title}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Scrollable Protocol Canvas */}
        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 print:overflow-visible print:p-0">
          {visibleSections.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-10 text-center text-xs text-slate-400">
              {book.noSearchResults}
            </div>
          ) : (
            visibleSections.map((sec) => {
              const isShownOnScreen = normalizedQuery ? true : sec.id === activeId;
              return (
                <section
                  key={sec.id}
                  className={`${isShownOnScreen ? "block" : "hidden print:block"} space-y-5 print:break-inside-avoid-page`}
                >
                  {/* Section Title Card */}
                  <div className="rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-slate-900/95 to-slate-950/95 p-5 space-y-2.5 shadow-[0_0_24px_rgba(0,242,255,0.08)] print:border-slate-300 print:bg-white print:shadow-none">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="rounded-lg bg-cyan-400/15 border border-cyan-400/40 px-2.5 py-0.5 font-mono text-xs font-extrabold text-cyan-300 print:text-slate-800">
                        {sec.badge}
                      </span>
                      <h3 className="text-base sm:text-lg font-extrabold text-white print:text-slate-900">
                        {sec.title}
                      </h3>
                    </div>
                    <p className="text-xs font-medium text-cyan-200/85 print:text-slate-700">
                      {sec.subtitle}
                    </p>
                    <p className="text-xs leading-relaxed text-slate-300 print:text-slate-700">
                      {sec.intro}
                    </p>

                    {sec.image && (
                      <div className="pt-2">
                        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#030712] max-w-2xl">
                          <img
                            src={sec.image}
                            alt={sec.title}
                            className="w-full aspect-[16/9] object-cover select-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Checklist (Section 00) */}
                  {sec.checklist && sec.checklist.length > 0 && (
                    <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 space-y-3 print:border-slate-300 print:bg-white">
                      <ul className="space-y-2.5">
                        {sec.checklist.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-xs leading-relaxed text-slate-200 print:text-slate-800">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-cyan-500/40 bg-cyan-950/60 font-mono text-[10px] font-bold text-cyan-300 print:border-slate-400 print:bg-transparent print:text-slate-800">
                              {idx + 1}
                            </span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Detailed Clinical Tests Cards */}
                  {sec.tests && sec.tests.length > 0 && (
                    <div className="space-y-4">
                      {sec.tests.map((test) => (
                        <article
                          key={test.id}
                          className="rounded-2xl border border-white/10 bg-slate-900/85 p-4 sm:p-5 space-y-3.5 print:border-slate-300 print:bg-white print:break-inside-avoid"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-white/10 pb-3 print:border-slate-200">
                            <h4 className="text-sm font-bold text-white print:text-slate-900">
                              {test.title}
                            </h4>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="rounded-lg border border-sky-500/30 bg-sky-950/50 px-2.5 py-0.5 text-[10px] font-semibold text-sky-200 print:border-slate-300 print:bg-slate-100 print:text-slate-800">
                                {book.labelField}: {test.formField}
                              </span>
                              {test.unit && (
                                <span className="rounded-lg border border-white/10 bg-slate-950/80 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-300 print:text-slate-800">
                                  {test.unit}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Position */}
                          <div className="rounded-xl border border-white/5 bg-slate-950/60 px-3.5 py-2.5 print:border-slate-200 print:bg-slate-50">
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-600">
                              {book.labelPosition}
                            </span>
                            <p className="mt-0.5 text-xs text-slate-200 leading-relaxed print:text-slate-800">
                              {test.position}
                            </p>
                          </div>

                          {/* Execution Steps */}
                          <div className="space-y-1.5">
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-cyan-300 print:text-slate-700">
                              {book.labelExecution}
                            </span>
                            <ol className="space-y-1.5">
                              {test.steps.map((st, idx) => (
                                <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-200 leading-relaxed print:text-slate-800">
                                  <span className="mt-0.5 font-mono text-[10px] font-bold text-cyan-400 print:text-slate-700">
                                    {idx + 1}.
                                  </span>
                                  <span>{st}</span>
                                </li>
                              ))}
                            </ol>
                          </div>

                          {/* Thresholds & Auto Cutoffs */}
                          <div className="space-y-1.5">
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-600">
                              {book.labelThresholds}
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {test.thresholds.map((chip, idx) => (
                                <span
                                  key={idx}
                                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold print:border-slate-300 print:bg-white print:text-slate-900 ${CHIP_STYLES[chip.tone]}`}
                                >
                                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${CHIP_DOT[chip.tone]}`} />
                                  <span>{chip.label}</span>
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Clinical Pitfall */}
                          <div className="rounded-xl border border-amber-500/25 bg-amber-950/20 px-3.5 py-2.5 print:border-amber-400 print:bg-amber-50">
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-300 print:text-amber-900">
                              {book.labelPitfall}
                            </span>
                            <p className="mt-0.5 text-xs text-amber-100/90 leading-relaxed print:text-slate-800">
                              {test.pitfall}
                            </p>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}

                  {/* Beighton 9-Point Reference Table */}
                  {sec.beightonTable && (
                    <div className="rounded-2xl border border-cyan-500/25 bg-slate-900/85 p-4 sm:p-5 space-y-3 print:border-slate-300 print:bg-white print:break-inside-avoid">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300 print:text-slate-900">
                        {book.labelBeightonTitle}
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-start text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-400 print:border-slate-300 print:text-slate-700">
                              <th className="py-2 pe-3 text-start">{book.labelColCriterion}</th>
                              <th className="py-2 px-3 text-start">{book.labelColSide}</th>
                              <th className="py-2 ps-3 text-end">{book.labelColPoints}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 print:divide-slate-200">
                            {sec.beightonTable.map((row, idx) => (
                              <tr key={idx}>
                                <td className="py-2.5 pe-3 text-slate-200 print:text-slate-800">{row.criterion}</td>
                                <td className="py-2.5 px-3 text-slate-400 print:text-slate-700">{row.side}</td>
                                <td className="py-2.5 ps-3 text-end font-mono font-bold text-cyan-300 print:text-slate-900">
                                  {row.points}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Red-Flag Escalation Matrix */}
                  {sec.redFlagMatrix && (
                    <div className="rounded-2xl border border-white/10 bg-slate-900/85 overflow-hidden print:border-slate-300 print:bg-white">
                      <div className="overflow-x-auto">
                        <table className="w-full text-start text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-white/10 bg-slate-950/75 text-[10px] uppercase tracking-wider text-slate-300 print:bg-slate-100 print:text-slate-800">
                              <th className="py-3 px-4 text-start">{book.labelMatrixDomain}</th>
                              <th className="py-3 px-3 text-start text-emerald-300 print:text-emerald-800">{book.labelMatrixOptimal}</th>
                              <th className="py-3 px-3 text-start text-amber-300 print:text-amber-800">{book.labelMatrixWatch}</th>
                              <th className="py-3 px-4 text-start text-rose-300 print:text-rose-800">{book.labelMatrixReferral}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 print:divide-slate-200">
                            {sec.redFlagMatrix.map((row, idx) => (
                              <tr key={idx} className="align-top">
                                <td className="py-3 px-4 font-bold text-white print:text-slate-900">{row.domain}</td>
                                <td className="py-3 px-3 text-emerald-200/90 print:text-slate-800">{row.optimal}</td>
                                <td className="py-3 px-3 text-amber-200/90 print:text-slate-800">{row.watch}</td>
                                <td className="py-3 px-4 font-semibold text-rose-200 print:text-rose-900">{row.referral}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Scientific References */}
                  {sec.references && sec.references.length > 0 && (
                    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 sm:p-5 space-y-2.5 print:border-slate-300 print:bg-white">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300 print:text-slate-900">
                        {book.labelReferences}
                      </h4>
                      <ul className="space-y-1.5 text-[11px] leading-relaxed text-slate-300 print:text-slate-700">
                        {sec.references.map((ref, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="font-mono text-cyan-400 print:text-slate-700">[{idx + 1}]</span>
                            <span>{ref}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              );
            })
          )}

          {/* Section Stepper Footer (hidden when searching or printing) */}
          {!normalizedQuery && activeIdx >= 0 && (
            <div className="flex items-center justify-between border-t border-white/10 pt-4 pb-6 print:hidden">
              <div>
                {activeIdx > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveId(book.sections[activeIdx - 1].id)}
                    className="rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-400/40 hover:text-white transition-all cursor-pointer"
                  >
                    &larr; {book.sections[activeIdx - 1].badge} · {book.sections[activeIdx - 1].title}
                  </button>
                )}
              </div>
              <div>
                {activeIdx < book.sections.length - 1 && (
                  <button
                    type="button"
                    onClick={() => setActiveId(book.sections[activeIdx + 1].id)}
                    className="rounded-xl border border-cyan-500/40 bg-cyan-950/60 px-3.5 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-900/60 transition-all cursor-pointer"
                  >
                    {book.sections[activeIdx + 1].badge} · {book.sections[activeIdx + 1].title} &rarr;
                  </button>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

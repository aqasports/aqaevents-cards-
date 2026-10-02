"use client";

import React from "react";
import {
  PoolCorrespondenceMode,
  PoolSwimmerRow,
  PoolSlotReservation,
} from "@/lib/swim-pool-dispatch";

interface PoolPrintTemplateProps {
  mode: PoolCorrespondenceMode;
  monthLabel?: string;
  rows: PoolSwimmerRow[];
  selectedIds: Set<string>;
  totalDuePoolDA: number;
  slotReservations?: PoolSlotReservation[];
  selectedReservationIds?: Set<string>;
  meta?: {
    title: string;
    referenceNumber: string;
    date: string;
    year: string;
  };
  isScreenPreview?: boolean;
}

export function PoolPrintTemplate({
  mode,
  monthLabel = "Juillet",
  rows,
  selectedIds,
  totalDuePoolDA,
  slotReservations = [],
  selectedReservationIds = new Set(),
  meta = {
    title: "Demande d'accès",
    referenceNumber: "n:0010/26",
    date: "02/10/2026",
    year: "2026",
  },
  isScreenPreview = false,
}: PoolPrintTemplateProps) {
  // Method 2 (RealFinalPool) visible rows
  const visibleRows = rows.filter(
    (r) => selectedIds.has(r.swimId) || selectedIds.has(r.memberId)
  );

  // Method 1 (Pre-reservation) visible reservations:
  // Rule: ONLY show selected groups and NEVER show with value = 0 (reservedPlaces > 0)
  const visibleReservations = slotReservations.filter((r) => {
    return selectedReservationIds.has(r.id) && r.reservedPlaces > 0;
  });

  const totalReservedPlaces = visibleReservations.reduce(
    (sum, r) => sum + r.reservedPlaces,
    0
  );

  const containerClass = isScreenPreview
    ? "w-full max-w-[850px] mx-auto bg-white text-black font-sans shadow-2xl border border-slate-300 p-8 text-xs my-4"
    : "hidden print:block print:w-full print:p-0 bg-white text-black font-sans text-xs";

  return (
    <div className={containerClass}>
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            background: white !important;
            color: black !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .page-break {
            page-break-before: always;
          }
        }
      `}</style>

      {/* ─── PAGE 1 ───────────────────────────────────────────────────────────── */}
      <div className="w-full">
        {mode === "preview" ? (
          /* PRE-RESERVATION OFFICIAL EXCEL GRID - ONLY THE TABLE, NO HERO, NO AFFLUENCE, NO GROUP NAME, NO CATEGORY, NEVER 0 */
          <table className="w-full border-collapse border border-[#93c5fd] text-xs font-sans">
            <colgroup>
              <col style={{ width: "42px" }} /> {/* Col 1: N */}
              <col style={{ width: "180px" }} /> {/* Col 2: Jour */}
              <col style={{ width: "180px" }} /> {/* Col 3: Horaire */}
              <col style={{ width: "45px" }} /> {/* Col 4: Grid spacer */}
              <col style={{ width: "45px" }} /> {/* Col 5: Grid spacer */}
              <col style={{ width: "45px" }} /> {/* Col 6: Grid spacer */}
              <col style={{ width: "45px" }} /> {/* Col 7: Grid spacer */}
              <col style={{ width: "100px" }} /> {/* Col 8: Places Réservées */}
              <col style={{ width: "85px" }} /> {/* Col 9: Mois */}
              <col style={{ width: "45px" }} /> {/* Col 10: Grid spacer */}
            </colgroup>

            <thead>
              {/* Row 1: Official Logo & Dynamic Year */}
              <tr className="h-10 border-b border-[#93c5fd]">
                <td colSpan={3} className="border-r border-[#93c5fd] px-3 py-1.5 align-middle">
                  <div className="flex items-center gap-1.5">
                    {/* Official AQA Logo extracted from PDF */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/aqa-logo.png"
                      alt="AQA"
                      className="h-7 w-auto object-contain"
                    />
                  </div>
                </td>
                <td
                  colSpan={4}
                  className="border-r border-[#93c5fd] text-center font-bold text-base text-black align-middle"
                >
                  {meta.year}
                </td>
                <td colSpan={3} className="border-b border-[#93c5fd]"></td>
              </tr>

              {/* Row 2: Cyan Banner with Demande d'accès, Dynamic Date, Dynamic Ref */}
              <tr className="h-8 border-b border-[#93c5fd]">
                <td
                  colSpan={3}
                  className="border-r border-[#93c5fd] bg-[#00c0f0] text-black font-bold px-3 py-1 text-xs align-middle"
                >
                  {meta.title || "Demande d'accès"}
                </td>
                <td colSpan={4} className="border-r border-[#93c5fd] bg-slate-100/50"></td>
                <td
                  colSpan={1}
                  className="border-r border-[#93c5fd] text-center font-bold text-[11px] text-black align-middle"
                >
                  {meta.date}
                </td>
                <td
                  colSpan={2}
                  className="text-center font-bold text-[11px] text-black align-middle"
                >
                  {meta.referenceNumber}
                </td>
              </tr>

              {/* Row 3: Table Header Row - No category, No group name, No affluence */}
              <tr className="h-7 border-b border-[#93c5fd] bg-slate-100 text-[11px] font-bold text-slate-900">
                <th className="border-r border-[#93c5fd] text-center">N</th>
                <th className="border-r border-[#93c5fd] px-3 text-left">Jour</th>
                <th className="border-r border-[#93c5fd] px-3 text-left">Horaire</th>
                <th colSpan={4} className="border-r border-[#93c5fd]"></th>
                <th className="border-r border-[#93c5fd] bg-[#00c0f0] text-black text-center font-bold">
                  Places
                </th>
                <th className="border-r border-[#93c5fd] text-center">Mois</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {/* Dynamic consecutively numbered rows: 1, 2, 3... Never with value = 0 */}
              {visibleReservations.map((r, idx) => (
                <tr
                  key={r.id}
                  className="h-6 border-b border-[#93c5fd] text-xs hover:bg-cyan-50/20"
                >
                  {/* Col 1: Dynamic Consecutive Number */}
                  <td className="border-r border-[#93c5fd] text-center font-normal text-slate-800 align-middle">
                    {idx + 1}
                  </td>

                  {/* Col 2: Jour */}
                  <td className="border-r border-[#93c5fd] px-3 font-bold text-slate-950 align-middle">
                    {r.day}
                  </td>

                  {/* Col 3: Horaire */}
                  <td className="border-r border-[#93c5fd] px-3 font-mono font-semibold text-slate-900 align-middle">
                    {r.time}
                  </td>

                  {/* Col 4-7: Empty Grid spacers */}
                  <td className="border-r border-[#93c5fd]"></td>
                  <td className="border-r border-[#93c5fd]"></td>
                  <td className="border-r border-[#93c5fd]"></td>
                  <td className="border-r border-[#93c5fd]"></td>

                  {/* Col 8: Places Réservées (never 0) */}
                  <td className="border-r border-[#93c5fd] bg-cyan-100/60 px-2 text-center font-mono font-black text-sm text-slate-950 align-middle">
                    {r.reservedPlaces}
                  </td>

                  {/* Col 9: Mois */}
                  <td className="border-r border-[#93c5fd] text-center font-semibold text-slate-900 align-middle">
                    {monthLabel}
                  </td>

                  {/* Col 10: Grid spacer */}
                  <td className="border-b border-[#93c5fd]"></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          /* REALFINALPOOL OFFICIAL EXCEL GRID - 100% IDENTICAL TO UPLOADED PDF */
          <table className="w-full border-collapse border border-[#93c5fd] text-xs font-sans">
            <colgroup>
              <col style={{ width: "42px" }} /> {/* Col 1: N */}
              <col style={{ width: "230px" }} /> {/* Col 2: Nom */}
              <col style={{ width: "45px" }} /> {/* Col 3: Grid spacer */}
              <col style={{ width: "45px" }} /> {/* Col 4: Grid spacer */}
              <col style={{ width: "45px" }} /> {/* Col 5: Grid spacer */}
              <col style={{ width: "45px" }} /> {/* Col 6: Grid spacer */}
              <col style={{ width: "45px" }} /> {/* Col 7: Grid spacer */}
              <col style={{ width: "85px" }} /> {/* Col 8: prix */}
              <col style={{ width: "75px" }} /> {/* Col 9: Mois */}
              <col style={{ width: "45px" }} /> {/* Col 10: Grid spacer */}
            </colgroup>

            <thead>
              {/* Row 1: Logo & Dynamic Year */}
              <tr className="h-10 border-b border-[#93c5fd]">
                <td colSpan={2} className="border-r border-[#93c5fd] px-3 py-1.5 align-middle">
                  <div className="flex items-center gap-1.5">
                    {/* Official AQA Logo extracted from PDF */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/aqa-logo.png"
                      alt="AQA"
                      className="h-7 w-auto object-contain"
                    />
                  </div>
                </td>
                <td
                  colSpan={4}
                  className="border-r border-[#93c5fd] text-center font-bold text-base text-black align-middle"
                >
                  {meta.year}
                </td>
                <td colSpan={4} className="border-b border-[#93c5fd]"></td>
              </tr>

              {/* Row 2: Cyan Banner with Demande d'accès, Dynamic Date and Ref */}
              <tr className="h-8 border-b border-[#93c5fd]">
                <td
                  colSpan={2}
                  className="border-r border-[#93c5fd] bg-[#00c0f0] text-black font-bold px-3 py-1 text-xs align-middle"
                >
                  {meta.title || "Demande d'accès"}
                </td>
                <td colSpan={4} className="border-r border-[#93c5fd] bg-slate-100/50"></td>
                <td
                  colSpan={2}
                  className="border-r border-[#93c5fd] text-center font-bold text-[11px] text-black align-middle"
                >
                  {meta.date}
                </td>
                <td
                  colSpan={2}
                  className="text-center font-bold text-[11px] text-black align-middle"
                >
                  {meta.referenceNumber}
                </td>
              </tr>

              {/* Row 3: prix header in bright green */}
              <tr className="h-6 border-b border-[#93c5fd]">
                <td colSpan={7} className="border-r border-[#93c5fd]"></td>
                <td className="border-r border-[#93c5fd] bg-[#4ade80] text-black text-center font-bold lowercase text-xs align-middle">
                  prix
                </td>
                <td colSpan={2}></td>
              </tr>
            </thead>

            <tbody>
              {/* Dynamic consecutively numbered rows: 1, 2, 3... */}
              {visibleRows.map((r, idx) => (
                <tr
                  key={r.swimId || r.memberId}
                  className="h-6 border-b border-[#93c5fd] text-xs hover:bg-cyan-50/20"
                >
                  {/* Col 1: Dynamic Consecutive Number */}
                  <td className="border-r border-[#93c5fd] text-center font-normal text-slate-800 align-middle">
                    {idx + 1}
                  </td>

                  {/* Col 2: Name */}
                  <td className="border-r border-[#93c5fd] px-2 font-bold text-slate-950 truncate align-middle">
                    {r.fullName}
                  </td>

                  {/* Col 3-7: Empty Grid cells */}
                  <td className="border-r border-[#93c5fd]"></td>
                  <td className="border-r border-[#93c5fd]"></td>
                  <td className="border-r border-[#93c5fd]"></td>
                  <td className="border-r border-[#93c5fd]"></td>
                  <td className="border-r border-[#93c5fd]"></td>

                  {/* Col 8: prix with green tinted background */}
                  <td className="border-r border-[#93c5fd] bg-[#86efac]/35 px-2 text-right font-mono font-bold text-slate-950 align-middle">
                    {r.poolPriceDA}
                  </td>

                  {/* Col 9: Mois */}
                  <td className="border-r border-[#93c5fd] text-center font-semibold text-slate-900 align-middle">
                    {r.currentMonth}
                  </td>

                  {/* Col 10: Grid spacer */}
                  <td className="border-b border-[#93c5fd]"></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ─── PAGE 2: TOTAL ROW (100% IDENTICAL TO UPLOADED PDF PAGE 2) ─────────── */}
      <div className="page-break pt-8">
        <table className="w-full border-collapse border border-[#93c5fd] text-xs font-sans">
          <colgroup>
            <col style={{ width: "42px" }} />
            <col style={{ width: mode === "preview" ? "180px" : "230px" }} />
            <col style={{ width: mode === "preview" ? "180px" : "45px" }} />
            <col style={{ width: "45px" }} />
            <col style={{ width: "45px" }} />
            <col style={{ width: "45px" }} />
            <col style={{ width: "45px" }} />
            <col style={{ width: mode === "preview" ? "100px" : "85px" }} />
            <col style={{ width: mode === "preview" ? "85px" : "75px" }} />
            <col style={{ width: "45px" }} />
          </colgroup>

          <tbody>
            {/* Top empty grid spacer rows matching Page 2 of uploaded PDF */}
            <tr className="h-6 border-b border-[#93c5fd]">
              <td colSpan={10} className="h-6"></td>
            </tr>

            {/* Official Grand Total Row */}
            <tr className="h-8 border-b-2 border-[#93c5fd]">
              {/* Gray spanning block across columns 1-7 */}
              <td colSpan={7} className="border-r border-[#93c5fd] bg-slate-300"></td>

              {/* Cyan Grand Total Box on Column 8 */}
              <td className="border-r border-[#93c5fd] bg-[#00c0f0] text-black text-center font-mono font-extrabold text-sm align-middle">
                {mode === "real_final" ? totalDuePoolDA : totalReservedPlaces}
              </td>

              {/* Remaining grid cells */}
              <td className="border-r border-[#93c5fd] bg-slate-100/30"></td>
              <td className="bg-slate-100/30"></td>
            </tr>

            {/* Empty grid continuation rows below matching Excel sheet */}
            <tr className="h-6 border-b border-[#93c5fd]">
              <td colSpan={10} className="h-6 bg-cyan-50/10"></td>
            </tr>
            <tr className="h-6 border-b border-[#93c5fd]">
              <td colSpan={10} className="h-6 bg-cyan-50/10"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

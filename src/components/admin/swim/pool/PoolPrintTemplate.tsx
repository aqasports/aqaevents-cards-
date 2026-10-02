"use client";

import React from "react";
import {
  PoolCorrespondenceMode,
  PoolSwimmerRow,
  PoolSlotReservation,
} from "@/lib/swim-pool-dispatch";

interface PoolPrintTemplateProps {
  mode: PoolCorrespondenceMode;
  monthLabel: string;
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
  rows,
  selectedIds,
  totalDuePoolDA,
  slotReservations = [],
  selectedReservationIds = new Set(),
  meta = {
    title: "Demande d'accès",
    referenceNumber: "n:0031/26",
    date: "10/07/2026",
    year: "2026",
  },
  isScreenPreview = false,
}: PoolPrintTemplateProps) {
  // Visible rows for Method 2 (RealFinalPool)
  const visibleRows = rows.filter(
    (r) => selectedIds.has(r.swimId) || selectedIds.has(r.memberId)
  );

  // Visible reservations for Method 1 (Pre-reservation)
  const visibleReservations = slotReservations.filter((r) =>
    selectedReservationIds.size === 0 ? true : selectedReservationIds.has(r.id)
  );
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
        {mode === "real_final" ? (
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
              {/* Row 1: Logo & Year 2026 */}
              <tr className="h-10 border-b border-[#93c5fd]">
                <td colSpan={2} className="border-r border-[#93c5fd] px-3 py-1.5 align-middle">
                  <div className="flex items-center gap-1.5">
                    {/* Stylized AQA cyan logo matching uploaded PDF */}
                    <svg viewBox="0 0 110 30" className="h-7 w-auto">
                      <polygon points="12,2 2,26 8,26 12,16 16,26 22,26" fill="#00c0f0" />
                      <polygon points="12,7 8,17 16,17" fill="#ffffff" />
                      <path
                        d="M32 4 C24 4, 19 9, 19 15 C19 21, 24 26, 32 26 C37 26, 41 23, 43 19 L40 18 C38 21, 35 23, 32 23 C26 23, 22 19, 22 15 C22 10, 26 7, 32 7 C35 7, 38 9, 40 11 L43 10 C40 6, 36 4, 32 4 Z"
                        fill="#00c0f0"
                      />
                      <polygon points="56,2 46,26 52,26 56,16 60,26 66,26" fill="#00c0f0" />
                      <polygon points="56,7 52,17 60,17" fill="#ffffff" />
                    </svg>
                  </div>
                </td>
                <td
                  colSpan={4}
                  className="border-r border-[#93c5fd] text-center font-bold text-base text-black align-middle"
                >
                  {meta.year || "2026"}
                </td>
                <td colSpan={4} className="border-b border-[#93c5fd]"></td>
              </tr>

              {/* Row 2: Cyan Banner with Demande d'accès, Date and Ref */}
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
                  {meta.date || "10/07/2026"}
                </td>
                <td
                  colSpan={2}
                  className="text-center font-bold text-[11px] text-black align-middle"
                >
                  {meta.referenceNumber || "n:0031/26"}
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
              {/* Rows 1 to 49 (or all visible rows) matching uploaded PDF */}
              {visibleRows.map((r, idx) => (
                <tr
                  key={r.swimId || r.memberId}
                  className="h-6 border-b border-[#93c5fd] text-xs hover:bg-cyan-50/20"
                >
                  {/* Col 1: Number */}
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
        ) : (
          /* PRE-RESERVATION OFFICIAL EXCEL GRID - NO CLIENT NAMES, NO PRICING */
          <table className="w-full border-collapse border border-[#93c5fd] text-xs font-sans">
            <colgroup>
              <col style={{ width: "42px" }} />
              <col style={{ width: "120px" }} />
              <col style={{ width: "100px" }} />
              <col style={{ width: "230px" }} />
              <col style={{ width: "90px" }} />
              <col style={{ width: "110px" }} />
              <col style={{ width: "100px" }} />
            </colgroup>

            <thead>
              <tr className="h-10 border-b border-[#93c5fd]">
                <td colSpan={2} className="border-r border-[#93c5fd] px-3 py-1.5 align-middle">
                  <div className="flex items-center gap-1.5">
                    <svg viewBox="0 0 110 30" className="h-7 w-auto">
                      <polygon points="12,2 2,26 8,26 12,16 16,26 22,26" fill="#00c0f0" />
                      <polygon points="12,7 8,17 16,17" fill="#ffffff" />
                      <path
                        d="M32 4 C24 4, 19 9, 19 15 C19 21, 24 26, 32 26 C37 26, 41 23, 43 19 L40 18 C38 21, 35 23, 32 23 C26 23, 22 19, 22 15 C22 10, 26 7, 32 7 C35 7, 38 9, 40 11 L43 10 C40 6, 36 4, 32 4 Z"
                        fill="#00c0f0"
                      />
                      <polygon points="56,2 46,26 52,26 56,16 60,26 66,26" fill="#00c0f0" />
                      <polygon points="56,7 52,17 60,17" fill="#ffffff" />
                    </svg>
                  </div>
                </td>
                <td
                  colSpan={3}
                  className="border-r border-[#93c5fd] text-center font-bold text-base text-black align-middle"
                >
                  {meta.year || "2026"}
                </td>
                <td className="border-r border-[#93c5fd] text-center font-bold text-[11px] align-middle">
                  {meta.date || "10/07/2026"}
                </td>
                <td className="text-center font-bold text-[11px] align-middle">
                  {meta.referenceNumber || "n:0031/26"}
                </td>
              </tr>

              <tr className="h-8 border-b border-[#93c5fd]">
                <td
                  colSpan={4}
                  className="border-r border-[#93c5fd] bg-[#00c0f0] text-black font-bold px-3 py-1 text-xs align-middle"
                >
                  Demande d&apos;accès - Pré-réservation des Places (Sans tarifs)
                </td>
                <td colSpan={3} className="bg-slate-100/50"></td>
              </tr>

              <tr className="h-7 border-b border-[#93c5fd] bg-slate-100 text-[11px] font-bold text-slate-900">
                <th className="border-r border-[#93c5fd] text-center">N</th>
                <th className="border-r border-[#93c5fd] px-2 text-left">Jour</th>
                <th className="border-r border-[#93c5fd] px-2 text-left">Horaire</th>
                <th className="border-r border-[#93c5fd] px-2 text-left">Groupe d&apos;Entrainement</th>
                <th className="border-r border-[#93c5fd] text-center">Catégorie</th>
                <th className="border-r border-[#93c5fd] bg-cyan-100 text-cyan-950 text-center">Places Réservées</th>
                <th className="text-center">Affluence</th>
              </tr>
            </thead>

            <tbody>
              {visibleReservations.map((r, idx) => (
                <tr key={r.id} className="h-6 border-b border-[#93c5fd] text-xs">
                  <td className="border-r border-[#93c5fd] text-center font-normal">{idx + 1}</td>
                  <td className="border-r border-[#93c5fd] px-2 font-bold">{r.day}</td>
                  <td className="border-r border-[#93c5fd] px-2 font-mono">{r.time}</td>
                  <td className="border-r border-[#93c5fd] px-2 font-medium">{r.groupName}</td>
                  <td className="border-r border-[#93c5fd] text-center uppercase text-[10px]">{r.category}</td>
                  <td className="border-r border-[#93c5fd] bg-cyan-50/50 text-center font-mono font-bold text-sm">
                    {r.reservedPlaces} places
                  </td>
                  <td className="text-center text-[10px] font-semibold">
                    {r.isPeak ? "Heure de Pointe" : "Normal"}
                  </td>
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
            <col style={{ width: "230px" }} />
            <col style={{ width: "45px" }} />
            <col style={{ width: "45px" }} />
            <col style={{ width: "45px" }} />
            <col style={{ width: "45px" }} />
            <col style={{ width: "45px" }} />
            <col style={{ width: "85px" }} />
            <col style={{ width: "75px" }} />
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

        {/* Dual Signatures and Stamps */}
        <div className="grid grid-cols-2 gap-8 pt-8 text-xs">
          <div className="border border-slate-300 p-4 rounded min-h-[100px] flex flex-col justify-between">
            <p className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">
              Direction Technique - AQA Sports
            </p>
            <div className="text-slate-400 text-[10px] italic">Cachet et Signature</div>
          </div>
          <div className="border border-slate-300 p-4 rounded min-h-[100px] flex flex-col justify-between">
            <p className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">
              Accusé de Réception - Direction de la Piscine
            </p>
            <div className="text-slate-400 text-[10px] italic">Visa et Date</div>
          </div>
        </div>
      </div>
    </div>
  );
}

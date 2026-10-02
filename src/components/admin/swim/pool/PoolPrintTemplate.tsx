"use client";

import React from "react";
import {
  PoolCorrespondenceMode,
  PoolColumnConfig,
  PoolSwimmerRow,
  PoolSlotReservation,
} from "@/lib/swim-pool-dispatch";

interface PoolPrintTemplateProps {
  mode: PoolCorrespondenceMode;
  monthLabel: string;
  rows: PoolSwimmerRow[];
  selectedIds: Set<string>;
  columnConfig: PoolColumnConfig;
  totalSwimmersCount: number;
  totalDuePoolDA: number;
  slotReservations?: PoolSlotReservation[];
  selectedReservationIds?: Set<string>;
  meta?: {
    title: string;
    referenceNumber: string;
    date: string;
    year: string;
  };
}

export function PoolPrintTemplate({
  mode,
  monthLabel,
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
}: PoolPrintTemplateProps) {
  // Method 2 visible rows
  const visibleRows = rows.filter(
    (r) => selectedIds.has(r.swimId) || selectedIds.has(r.memberId)
  );

  // Method 1 visible reservations (No client names)
  const visibleReservations = slotReservations.filter((r) =>
    selectedReservationIds.size === 0 ? true : selectedReservationIds.has(r.id)
  );
  const totalReservedPlaces = visibleReservations.reduce(
    (sum, r) => sum + r.reservedPlaces,
    0
  );
  const peakReservedPlaces = visibleReservations
    .filter((r) => r.isPeak)
    .reduce((sum, r) => sum + r.reservedPlaces, 0);

  return (
    <div className="hidden print:block print:w-full print:p-8 bg-white text-black font-sans">
      {/* Official AQA Grid Header matching correspondence */}
      <div className="border border-slate-300 mb-0">
        {/* Top Header Row: Logo, Year, Date & Ref */}
        <div className="grid grid-cols-12 border-b border-slate-300 items-center">
          <div className="col-span-3 p-3 flex items-center gap-2 border-r border-slate-300">
            <div className="flex items-center gap-1">
              <svg viewBox="0 0 110 32" className="h-8 w-auto">
                <text
                  x="2"
                  y="24"
                  fontFamily="Inter, system-ui, sans-serif"
                  fontSize="24"
                  fontWeight="900"
                  fill="#0284c7"
                  letterSpacing="1"
                >
                  AQA
                </text>
              </svg>
            </div>
          </div>
          <div className="col-span-5 p-2 text-center border-r border-slate-300">
            <span className="font-extrabold text-xl tracking-wider text-slate-900 font-mono">
              {meta.year || "2026"}
            </span>
          </div>
          <div className="col-span-4 p-2 text-right text-xs font-mono pr-4 text-slate-800 space-y-0.5">
            <div>
              <span className="text-slate-500 font-sans">Date: </span>
              <span className="font-bold">{meta.date || "10/07/2026"}</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans">Ref: </span>
              <span className="font-bold text-slate-900">{meta.referenceNumber || "n:0031/26"}</span>
            </div>
          </div>
        </div>

        {/* Title Banner Row */}
        <div className="grid grid-cols-12 items-center bg-cyan-100/90 text-cyan-950 font-bold border-b border-slate-300">
          <div className="col-span-8 px-4 py-2 text-sm uppercase tracking-wide">
            {mode === "preview"
              ? "BORDEREAU PREVISIONNEL DE RESERVATION DES PLACES"
              : meta.title || "Demande d'acces"}
          </div>
          <div className="col-span-4 px-4 py-2 text-right text-xs font-mono text-cyan-900">
            {monthLabel}
          </div>
        </div>
      </div>

      {/* TABLE SECTION */}
      {mode === "preview" ? (
        /* METHOD ONE TABLE: Simple Place Reservations (NO CLIENT NAMES) */
        <table className="w-full text-left text-xs border-collapse border border-slate-300 mb-8 font-sans">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300 text-slate-900 font-bold uppercase text-[11px]">
              <th className="p-2 border border-slate-300 w-12 text-center">N</th>
              <th className="p-2 border border-slate-300 w-28">Jour</th>
              <th className="p-2 border border-slate-300 w-28">Horaire</th>
              <th className="p-2 border border-slate-300">Groupe d&apos;Entrainement</th>
              <th className="p-2 border border-slate-300 w-24">Categorie</th>
              <th className="p-2 border border-slate-300 w-36 text-center bg-cyan-100 text-cyan-950 font-extrabold">
                Places Reservees
              </th>
              <th className="p-2 border border-slate-300 w-28 text-center">Affluence</th>
            </tr>
          </thead>
          <tbody>
            {visibleReservations.map((r, idx) => (
              <tr key={r.id} className="border-b border-slate-300 hover:bg-slate-50">
                <td className="p-2 border border-slate-300 text-center font-mono font-medium">
                  {idx + 1}
                </td>
                <td className="p-2 border border-slate-300 font-bold text-slate-900">
                  {r.day}
                </td>
                <td className="p-2 border border-slate-300 font-mono text-slate-800">
                  {r.time}
                </td>
                <td className="p-2 border border-slate-300 font-medium text-slate-900">
                  {r.groupName}
                </td>
                <td className="p-2 border border-slate-300 uppercase text-[10px] text-slate-600">
                  {r.category}
                </td>
                <td className="p-2 border border-slate-300 text-center font-mono font-extrabold text-sm text-slate-900 bg-cyan-50/50">
                  {r.reservedPlaces} places
                </td>
                <td className="p-2 border border-slate-300 text-center text-[10px] font-bold">
                  {r.isPeak ? "Heure de Pointe" : "Normal"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-400 bg-slate-100 font-bold">
              <td colSpan={5} className="p-3 text-right text-xs uppercase text-slate-800">
                Total Places Reservees :
              </td>
              <td className="p-3 text-center font-mono font-extrabold text-base bg-cyan-300 text-cyan-950 border-2 border-cyan-500">
                {totalReservedPlaces} places
              </td>
              <td className="p-3 border border-slate-300 text-center font-mono text-xs font-semibold text-slate-700">
                {peakReservedPlaces > 0 ? `${peakReservedPlaces} en pointe` : "-"}
              </td>
            </tr>
          </tfoot>
        </table>
      ) : (
        /* METHOD TWO TABLE: Official Spreadsheet Correspondence matching uploaded PDF */
        <table className="w-full text-left text-xs border-collapse border border-slate-300 mb-8 font-sans">
          <thead>
            <tr className="border-b border-slate-300 text-slate-900 font-bold uppercase text-[11px] bg-slate-50">
              <th className="p-2 border border-slate-300 w-10 text-center">N</th>
              <th className="p-2 border border-slate-300">Nom & Prenom</th>
              <th className="p-2 border border-slate-300 w-44">Groupe / Note</th>
              <th className="p-2 border border-slate-300 w-32 text-right bg-emerald-400 text-slate-950 font-extrabold text-xs">
                prix
              </th>
              <th className="p-2 border border-slate-300 w-24 text-center">Mois</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((r, idx) => (
              <tr key={r.swimId || r.memberId} className="border-b border-slate-300">
                <td className="p-2 border border-slate-300 text-center font-mono text-slate-800 font-medium">
                  {idx + 1}
                </td>
                <td className="p-2 border border-slate-300 font-bold text-slate-900">
                  {r.fullName}
                  {r.isCustom && (
                    <span className="ml-2 text-[9px] font-normal uppercase px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded">
                      Section
                    </span>
                  )}
                </td>
                <td className="p-2 border border-slate-300 text-slate-600 text-[11px]">
                  {r.assignedGroupNames.join(" + ") || r.groupOrNote || ""}
                </td>
                <td className="p-2 border border-slate-300 text-right font-mono font-bold text-slate-900 bg-emerald-50/40">
                  {r.poolPriceDA.toLocaleString("fr-DZ")}
                </td>
                <td className="p-2 border border-slate-300 text-center font-semibold text-slate-800 text-xs">
                  {r.currentMonth || monthLabel}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-400 bg-slate-200">
              <td colSpan={3} className="p-3 text-right font-bold text-xs uppercase text-slate-800">
                Total :
              </td>
              <td className="p-3 text-right font-mono font-extrabold text-base bg-cyan-300 text-cyan-950 border-2 border-cyan-500 shadow-sm">
                {totalDuePoolDA.toLocaleString("fr-DZ")}
              </td>
              <td className="p-3 border border-slate-300"></td>
            </tr>
          </tfoot>
        </table>
      )}

      {/* Signature & Stamp Boxes */}
      <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-300 mt-8 text-xs">
        <div className="border border-slate-300 p-4 rounded min-h-[110px] flex flex-col justify-between">
          <p className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">
            Pour AQA Sports - Direction Technique
          </p>
          <div className="text-slate-400 text-[10px] italic">
            Cachet et Signature autorisee
          </div>
        </div>

        <div className="border border-slate-300 p-4 rounded min-h-[110px] flex flex-col justify-between">
          <p className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">
            Accuse de Reception - Direction de la Piscine
          </p>
          <div className="text-slate-400 text-[10px] italic">
            Date de reception, Visa et Signature
          </div>
        </div>
      </div>
    </div>
  );
}

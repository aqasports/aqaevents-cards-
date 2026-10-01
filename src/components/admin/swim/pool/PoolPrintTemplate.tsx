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
}

export function PoolPrintTemplate({
  mode,
  monthLabel,
  rows,
  selectedIds,
  columnConfig,
  totalSwimmersCount,
  totalDuePoolDA,
  slotReservations = [],
  selectedReservationIds = new Set(),
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
    <div className="hidden print:block print:w-full print:p-6 bg-white text-black font-sans">
      {/* Document Header */}
      <div className="border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
              AQA Sports Club
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              Direction Technique & Coordination des Bassins
            </p>
            <p className="text-[11px] text-slate-500">
              Algerie · Contact: aqasports.pro@gmail.com
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 text-xs font-bold border border-slate-800 uppercase tracking-wide">
              {mode === "preview" ? "Bordereau Previsionnel de Places" : "RealFinalPool - Definitif"}
            </span>
            <p className="text-xs text-slate-600 mt-1">
              Date d&apos;emission : {new Date().toLocaleDateString("fr-DZ")}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-300 flex justify-between items-end">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {mode === "preview"
                ? "BORDEREAU PREVISIONNEL DE RESERVATION DES PLACES (PAR CRENEAU & GROUPE)"
                : "BORDEREAU RECAPITULATIF DEFINITIF DES ADHERENTS AYANT FREQUENTE LE BASSIN"}
            </h2>
            <p className="text-xs text-slate-700">
              Destinataire : Direction de la Piscine Hote
            </p>
          </div>
          <div className="text-right font-mono text-xs">
            <span className="font-bold">Periode : </span>
            <span className="text-slate-900">{monthLabel}</span>
          </div>
        </div>
      </div>

      {/* Summary Info Box */}
      {mode === "preview" ? (
        /* METHOD ONE SUMMARY: Places count only, no client names */
        <div className="grid grid-cols-3 gap-3 border border-slate-300 p-3 mb-6 bg-slate-50 text-xs">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">
              Total Places Reservees
            </span>
            <span className="font-bold font-mono text-base text-slate-900">
              {totalReservedPlaces} Places
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">
              Places en Heures de Pointe
            </span>
            <span className="font-bold font-mono text-base text-amber-700">
              {peakReservedPlaces} Places
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 block text-[10px] uppercase">
              Nombre de Creneaux
            </span>
            <span className="font-bold font-mono text-base text-slate-900">
              {visibleReservations.length} Creneaux
            </span>
          </div>
        </div>
      ) : (
        /* METHOD TWO SUMMARY: Full billing & settlement */
        <div className="grid grid-cols-3 gap-3 border border-slate-300 p-3 mb-6 bg-slate-50 text-xs">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">
              Effectif Adherents Retenus
            </span>
            <span className="font-bold font-mono text-base text-slate-900">
              {totalSwimmersCount}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">
              Tarif Moyen par Adherent
            </span>
            <span className="font-bold font-mono text-base text-slate-900">
              {totalSwimmersCount > 0
                ? Math.round(totalDuePoolDA / totalSwimmersCount).toLocaleString("fr-DZ")
                : 0}{" "}
              DA
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 block text-[10px] uppercase">
              Montant Total Redevance Piscine
            </span>
            <span className="font-bold font-mono text-base text-slate-900">
              {totalDuePoolDA.toLocaleString("fr-DZ")} DA
            </span>
          </div>
        </div>
      )}

      {/* TABLE SECTION */}
      {mode === "preview" ? (
        /* METHOD ONE TABLE: Simple Place Reservations (NO CLIENT NAMES) */
        <table className="w-full text-left text-[11px] border-collapse border border-slate-400 mb-8">
          <thead>
            <tr className="bg-slate-200 border-b border-slate-400 text-slate-900 font-bold uppercase text-[10px]">
              <th className="p-2 border border-slate-300 w-12 text-center">N</th>
              <th className="p-2 border border-slate-300 w-28">Jour</th>
              <th className="p-2 border border-slate-300 w-28">Creneau</th>
              <th className="p-2 border border-slate-300">Groupe d&apos;Entrainement</th>
              <th className="p-2 border border-slate-300 w-24">Categorie</th>
              <th className="p-2 border border-slate-300 w-32 text-center">Places Reservees</th>
              <th className="p-2 border border-slate-300 w-28 text-center">Affluence</th>
            </tr>
          </thead>
          <tbody>
            {visibleReservations.map((r, idx) => (
              <tr key={r.id} className="border-b border-slate-300">
                <td className="p-2 border border-slate-300 text-center font-mono font-bold">
                  {idx + 1}
                </td>
                <td className="p-2 border border-slate-300 font-semibold text-slate-900">
                  {r.day}
                </td>
                <td className="p-2 border border-slate-300 font-mono text-slate-800">
                  {r.time}
                </td>
                <td className="p-2 border border-slate-300 font-medium">
                  {r.groupName}
                </td>
                <td className="p-2 border border-slate-300 uppercase text-[10px]">
                  {r.category}
                </td>
                <td className="p-2 border border-slate-300 text-center font-mono font-bold text-sm text-slate-900">
                  {r.reservedPlaces} places
                </td>
                <td className="p-2 border border-slate-300 text-center text-[10px] font-bold">
                  {r.isPeak ? "Heure de Pointe" : "Normal"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold border-t-2 border-slate-500">
              <td colSpan={5} className="p-2.5 text-right uppercase text-xs text-slate-800">
                Total Places Reservees Pour le Mois :
              </td>
              <td className="p-2.5 text-center font-mono text-sm text-slate-900 border border-slate-400 font-extrabold">
                {totalReservedPlaces} places
              </td>
              <td className="p-2 border border-slate-300"></td>
            </tr>
          </tfoot>
        </table>
      ) : (
        /* METHOD TWO TABLE: RealFinalPool with individual Swimmer Names, Groups, and Pool Price */
        <table className="w-full text-left text-[11px] border-collapse border border-slate-400 mb-8">
          <thead>
            <tr className="bg-slate-200 border-b border-slate-400 text-slate-900 font-bold uppercase text-[10px]">
              {columnConfig.number && <th className="p-2 border border-slate-300 w-10 text-center">N</th>}
              {columnConfig.name && <th className="p-2 border border-slate-300">Nom & Prenom</th>}
              {columnConfig.swimId && <th className="p-2 border border-slate-300 w-24">ID Adherent</th>}
              {columnConfig.groups && <th className="p-2 border border-slate-300">Groupe(s) Assigne(s)</th>}
              {columnConfig.schedule && <th className="p-2 border border-slate-300">Creneau / Horaire</th>}
              {columnConfig.category && <th className="p-2 border border-slate-300 w-20">Categorie</th>}
              {columnConfig.poolPrice && (
                <th className="p-2 border border-slate-300 w-28 text-right">Tarif Piscine</th>
              )}
              {columnConfig.currentMonth && <th className="p-2 border border-slate-300 w-24">Mois</th>}
              {columnConfig.phone && <th className="p-2 border border-slate-300 w-24">Telephone</th>}
              {columnConfig.paymentStatus && <th className="p-2 border border-slate-300 w-20">Paiement</th>}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((r, idx) => (
              <tr key={r.swimId || r.memberId} className="border-b border-slate-300">
                {columnConfig.number && (
                  <td className="p-2 border border-slate-300 text-center font-mono">
                    {idx + 1}
                  </td>
                )}
                {columnConfig.name && (
                  <td className="p-2 border border-slate-300 font-semibold">
                    {r.fullName}
                  </td>
                )}
                {columnConfig.swimId && (
                  <td className="p-2 border border-slate-300 font-mono text-[10px]">
                    {r.swimId}
                  </td>
                )}
                {columnConfig.groups && (
                  <td className="p-2 border border-slate-300">
                    {r.assignedGroupNames.join(" + ") || "Non assigne"}
                  </td>
                )}
                {columnConfig.schedule && (
                  <td className="p-2 border border-slate-300">
                    {r.assignedSchedules.join(" | ") || "-"}
                  </td>
                )}
                {columnConfig.category && (
                  <td className="p-2 border border-slate-300 capitalize">
                    {r.category}
                  </td>
                )}
                {columnConfig.poolPrice && (
                  <td className="p-2 border border-slate-300 text-right font-mono font-bold">
                    {r.poolPriceDA.toLocaleString("fr-DZ")} DA
                  </td>
                )}
                {columnConfig.currentMonth && (
                  <td className="p-2 border border-slate-300">
                    {monthLabel}
                  </td>
                )}
                {columnConfig.phone && (
                  <td className="p-2 border border-slate-300 font-mono">
                    {r.phone}
                  </td>
                )}
                {columnConfig.paymentStatus && (
                  <td className="p-2 border border-slate-300 capitalize text-[10px]">
                    {r.paymentStatus}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold border-t-2 border-slate-500">
              <td
                colSpan={
                  (columnConfig.number ? 1 : 0) +
                  (columnConfig.name ? 1 : 0) +
                  (columnConfig.swimId ? 1 : 0) +
                  (columnConfig.groups ? 1 : 0) +
                  (columnConfig.schedule ? 1 : 0) +
                  (columnConfig.category ? 1 : 0) -
                  1
                }
                className="p-2.5 text-right uppercase text-xs text-slate-800"
              >
                Total Net Payable a la Direction de la Piscine :
              </td>
              <td className="p-2.5 text-right font-mono text-sm text-slate-900 border border-slate-400 font-bold">
                {totalDuePoolDA.toLocaleString("fr-DZ")} DA
              </td>
              {columnConfig.currentMonth && <td className="p-2 border border-slate-300"></td>}
              {columnConfig.phone && <td className="p-2 border border-slate-300"></td>}
              {columnConfig.paymentStatus && <td className="p-2 border border-slate-300"></td>}
            </tr>
          </tfoot>
        </table>
      )}

      {/* Signature & Stamp Boxes */}
      <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-400 mt-12 text-xs">
        <div className="border border-slate-400 p-4 rounded min-h-[120px] flex flex-col justify-between">
          <p className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">
            Pour AQA Sports - Direction Technique
          </p>
          <div className="text-slate-400 text-[10px] italic">
            Cachet et Signature autorisee
          </div>
        </div>

        <div className="border border-slate-400 p-4 rounded min-h-[120px] flex flex-col justify-between">
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

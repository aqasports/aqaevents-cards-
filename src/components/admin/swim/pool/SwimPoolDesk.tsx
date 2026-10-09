"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslations } from "@/lib/i18n";
import {
  PoolCorrespondenceMode,
  PoolOption,
  DEFAULT_POOLS,
  SwimmerBillingConfig,
  PoolSwimmerRow,
  PoolSlotReservation,
  CustomPoolRow,
  PoolDocumentMeta,
  DEFAULT_DOCUMENT_META,
  STORAGE_KEYS,
  buildPoolDispatchRows,
  buildPoolSlotReservations,
  computeRealFinalPoolSummary,
  computeSlotReservationsSummary,
  exportOfficialCorrespondenceToCSV,
  exportSlotReservationsToCSV,
  formatMonthLabel,
  SwimMemberReference,
  SwimGroupReference,
  PoolBordereau,
  createDefaultBordereau,
  getProposedBordereauTitle,
  getSwimmerDispatchGroupDisplay,
  FRENCH_MONTHS,
  getCurrentFrenchMonth,
  resolveMemberGroups,
} from "@/lib/swim-pool-dispatch";
import { isMemberPoolPaid, encodePoolPaidNotes } from "@/lib/swim-groups";
import { PoolCustomRowModal } from "./PoolCustomRowModal";
import { PoolPrintTemplate } from "./PoolPrintTemplate";
import { PoolAddBordereauModal } from "./PoolAddBordereauModal";
import { PoolAddClientModal } from "./PoolAddClientModal";
import { PoolAddGroupBulkModal } from "./PoolAddGroupBulkModal";
import { PoolPaymentConfirmationModal } from "./PoolPaymentConfirmationModal";

interface SwimPoolDeskProps {
  members?: SwimMemberReference[];
  groups?: SwimGroupReference[];
}

export function SwimPoolDesk({
  members: propMembers,
  groups: propGroups,
}: SwimPoolDeskProps) {
  const { locale, t } = useTranslations("swimPool");

  // ─── 1. POOL SELECTION ───────────────────────────────────────────────────────
  const [selectedPoolId, setSelectedPoolId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_POOL);
        if (saved) return saved;
      } catch {
        // ignore
      }
    }
    return "azal";
  });

  const activePool: PoolOption = useMemo(() => {
    const found = DEFAULT_POOLS.find((p) => p.id === selectedPoolId);
    return found || DEFAULT_POOLS[0];
  }, [selectedPoolId]);

  const handleSelectPool = (poolId: string) => {
    setSelectedPoolId(poolId);
    try {
      localStorage.setItem(STORAGE_KEYS.SELECTED_POOL, poolId);
    } catch {
      // ignore
    }
  };

  // ─── 2. MODE SELECTION ───────────────────────────────────────────────────────
  // Mode: "preview" (Pre-reservation: places without pricing) or "real_final" (RealFinalPool with auto pricing)
  const [mode, setMode] = useState<PoolCorrespondenceMode>("real_final");

  // ─── 3. RAW DATA & STANDALONE FETCHING ───────────────────────────────────────
  const [rawMembers, setRawMembers] = useState<SwimMemberReference[]>(propMembers || []);
  const [rawGroups, setRawGroups] = useState<SwimGroupReference[]>(propGroups || []);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (propMembers !== undefined) setRawMembers(propMembers);
    if (propGroups !== undefined) setRawGroups(propGroups);

    // Only run standalone network fetch if neither prop was provided
    if (propMembers === undefined && propGroups === undefined) {
      setLoadingData(true);
      Promise.all([
        fetch("/api/admin/swim/members?includePayments=true").then((r) =>
          r.ok ? r.json() : []
        ),
        fetch("/api/admin/swim/groups").then((r) => (r.ok ? r.json() : [])),
      ])
        .then(([mems, grps]) => {
          if (Array.isArray(mems)) setRawMembers(mems);
          if (Array.isArray(grps)) setRawGroups(grps);
        })
        .finally(() => setLoadingData(false));
    }
  }, [propMembers, propGroups]);

  // ─── 4. BORDEREAUX MANAGEMENT (ACTIVE BORDEREAU WORKFLOW) ───────────────────
  const [bordereaux, setBordereaux] = useState<PoolBordereau[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.BORDEREAUX);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {
        // ignore
      }
    }
    return [createDefaultBordereau(DEFAULT_DOCUMENT_META, "azal")];
  });

  const [activeBordereauId, setActiveBordereauId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_BORDEREAU_ID);
        if (saved) return saved;
      } catch {
        // ignore
      }
    }
    return bordereaux[0]?.id || "bord_default";
  });

  // Active bordereau instance
  const activeBordereau: PoolBordereau = useMemo(() => {
    const found = bordereaux.find((b) => b.id === activeBordereauId);
    return found || bordereaux[0] || createDefaultBordereau(DEFAULT_DOCUMENT_META, selectedPoolId);
  }, [bordereaux, activeBordereauId, selectedPoolId]);

  // ─── 4b. DATE & MONTH CONTEXT & DUPLICATE PROTECTION ────────────────────────
  const [targetDate] = useState<Date>(() => new Date());
  const monthLabel = useMemo(() => {
    return (
      activeBordereau.month ||
      formatMonthLabel(targetDate.getFullYear(), targetDate.getMonth(), locale)
    );
  }, [activeBordereau.month, targetDate, locale]);

  // Strict duplicate pool payment prevention for the same month
  const alreadyPoolPaidIdsThisMonth = useMemo(() => {
    const currentMonth = (activeBordereau.month || monthLabel || "").trim().toLowerCase();
    const set = new Set<string>();

    // 1. Members whose profile notes contain [POOLPAID] for this month
    for (const m of rawMembers) {
      if (isMemberPoolPaid(m.notes, activeBordereau.month || monthLabel)) {
        set.add(m.id);
        set.add(m.swimId);
      }
    }

    // 2. Members belonging to any already-paid bordereau for the same month
    for (const b of bordereaux) {
      if (b.paymentStatus === "paid") {
        const bMonth = (b.month || "").trim().toLowerCase();
        if (!currentMonth || !bMonth || bMonth === currentMonth) {
          (b.memberIds || []).forEach((id) => {
            set.add(id);
          });
        }
      }
    }

    return set;
  }, [activeBordereau.month, monthLabel, rawMembers, bordereaux]);

  const saveBordereaux = useCallback((updatedList: PoolBordereau[]) => {
    setBordereaux(updatedList);
    try {
      localStorage.setItem(STORAGE_KEYS.BORDEREAUX, JSON.stringify(updatedList));
    } catch {
      // ignore
    }
    fetch("/api/admin/swim/pool/bordereaux", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bordereaux: updatedList }),
    }).catch(() => {});
  }, []);

  // Fetch persisted bordereaux from server on mount
  useEffect(() => {
    fetch("/api/admin/swim/pool/bordereaux")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.bordereaux) && data.bordereaux.length > 0) {
          setBordereaux(data.bordereaux);
          try {
            localStorage.setItem(STORAGE_KEYS.BORDEREAUX, JSON.stringify(data.bordereaux));
          } catch {
            // ignore
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectBordereau = (id: string) => {
    setActiveBordereauId(id);
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_BORDEREAU_ID, id);
    } catch {
      // ignore
    }
    const target = bordereaux.find((b) => b.id === id);
    if (target?.poolId) {
      setSelectedPoolId(target.poolId);
    }
  };

  const handleCreateBordereau = (data: {
    title: string;
    referenceNumber: string;
    poolId: string;
    date: string;
    month: string;
    year: string;
  }) => {
    const newB: PoolBordereau = {
      id: `bord_${Date.now()}`,
      title: data.title,
      referenceNumber: data.referenceNumber,
      poolId: data.poolId,
      date: data.date,
      month: data.month,
      year: data.year,
      memberIds: [],
      customRows: [],
      paymentStatus: "unpaid",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newB, ...bordereaux];
    saveBordereaux(updated);
    setActiveBordereauId(newB.id);
    setSelectedPoolId(data.poolId);
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_BORDEREAU_ID, newB.id);
    } catch {
      // ignore
    }
    showToast(`Bordereau "${data.referenceNumber}" créé`);
  };

  const handleDeleteBordereau = (idToDelete: string) => {
    if (bordereaux.length <= 1) {
      showToast("Impossible de supprimer le seul bordereau restant");
      return;
    }
    const remaining = bordereaux.filter((b) => b.id !== idToDelete);
    saveBordereaux(remaining);
    if (activeBordereauId === idToDelete) {
      const nextActive = remaining[0]?.id || "";
      setActiveBordereauId(nextActive);
      try {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_BORDEREAU_ID, nextActive);
      } catch {
        // ignore
      }
    }
    showToast("Bordereau supprimé");
  };

  const handleUpdateActiveBordereauMeta = <K extends keyof PoolBordereau>(
    field: K,
    value: PoolBordereau[K]
  ) => {
    const updated = bordereaux.map((b) => {
      if (b.id === activeBordereau.id) {
        return { ...b, [field]: value, updatedAt: new Date().toISOString() };
      }
      return b;
    });
    saveBordereaux(updated);
  };

  const handleAddMembersToActiveBordereau = (newIds: string[]) => {
    // Strictly filter out any members that are unassigned (forbidden)
    // AND any members that are already poolpaid this month
    const unassignedIds = new Set<string>();
    const poolPaidIds = new Set<string>();

    for (const id of newIds) {
      const member = rawMembers.find((m) => m.id === id || m.swimId === id);
      if (!member) continue;
      const assigned = resolveMemberGroups(member, rawGroups);
      if (assigned.length === 0) {
        unassignedIds.add(id);
      }
      if (alreadyPoolPaidIdsThisMonth.has(id)) {
        poolPaidIds.add(id);
      }
    }

    const validIds = newIds.filter(
      (id) => !unassignedIds.has(id) && !poolPaidIds.has(id)
    );
    const set = new Set(activeBordereau.memberIds || []);
    validIds.forEach((id) => set.add(id));
    const updated = bordereaux.map((b) => {
      if (b.id === activeBordereau.id) {
        return {
          ...b,
          memberIds: Array.from(set),
          updatedAt: new Date().toISOString(),
        };
      }
      return b;
    });
    saveBordereaux(updated);

    const unassignedCount = unassignedIds.size;
    const poolPaidCount = poolPaidIds.size;

    if (unassignedCount > 0 && validIds.length === 0) {
      showToast(
        `${unassignedCount} adhérent${unassignedCount > 1 ? "s" : ""} non assigné${unassignedCount > 1 ? "s" : ""} exclu${unassignedCount > 1 ? "s" : ""} (ajout interdit)`
      );
    } else if (unassignedCount > 0 || poolPaidCount > 0) {
      const parts: string[] = [];
      if (unassignedCount > 0) {
        parts.push(`${unassignedCount} non assigné${unassignedCount > 1 ? "s" : ""} (interdit)`);
      }
      if (poolPaidCount > 0) {
        parts.push(`${poolPaidCount} déjà poolpaid`);
      }
      showToast(
        `${validIds.length} adhérent${validIds.length > 1 ? "s" : ""} ajouté${validIds.length > 1 ? "s" : ""} (${parts.join(", ")} exclu${unassignedCount + poolPaidCount > 1 ? "s" : ""})`
      );
    } else {
      showToast(
        `${validIds.length} adhérent${validIds.length > 1 ? "s" : ""} ajouté${validIds.length > 1 ? "s" : ""} au bordereau`
      );
    }
  };

  const handleRemoveMemberFromActiveBordereau = (memberId: string) => {
    const updated = bordereaux.map((b) => {
      if (b.id === activeBordereau.id) {
        return {
          ...b,
          memberIds: (b.memberIds || []).filter((id) => id !== memberId),
          updatedAt: new Date().toISOString(),
        };
      }
      return b;
    });
    saveBordereaux(updated);
    showToast("Adhérent retiré du bordereau");
  };

  const handleAddCustomRowToActiveBordereau = (newRow: {
    fullName: string;
    groupOrNote: string;
    poolPriceDA: number;
    month: string;
  }) => {
    const item: CustomPoolRow = {
      id: `cust_${Date.now()}`,
      fullName: newRow.fullName,
      groupOrNote: newRow.groupOrNote,
      poolPriceDA: newRow.poolPriceDA,
      month: newRow.month,
    };
    const updated = bordereaux.map((b) => {
      if (b.id === activeBordereau.id) {
        return {
          ...b,
          customRows: [...(b.customRows || []), item],
          updatedAt: new Date().toISOString(),
        };
      }
      return b;
    });
    saveBordereaux(updated);
    showToast("Ligne collective ajoutée");
  };

  const handleDeleteCustomRowFromActiveBordereau = (rowId: string) => {
    const updated = bordereaux.map((b) => {
      if (b.id === activeBordereau.id) {
        return {
          ...b,
          customRows: (b.customRows || []).filter((r) => r.id !== rowId),
          updatedAt: new Date().toISOString(),
        };
      }
      return b;
    });
    saveBordereaux(updated);
    showToast("Ligne collective supprimée");
  };

  const handleConfirmActiveBordereauPayment = async () => {
    if (!activeBordereau.memberIds || activeBordereau.memberIds.length === 0) {
      showToast("Aucun adhérent dans ce bordereau à confirmer");
      return;
    }
    const activeMonth = activeBordereau.month || monthLabel;
    const res = await fetch("/api/admin/swim/pool/confirm-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberIds: activeBordereau.memberIds,
        bordereauId: activeBordereau.id,
        bordereauRef: activeBordereau.referenceNumber,
        poolId: activeBordereau.poolId,
        month: activeMonth,
        action: "confirm",
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      showToast(d.error || "Erreur lors de la confirmation du paiement");
      return;
    }

    const nowIso = new Date().toISOString();
    const updated = bordereaux.map((b) => {
      if (b.id === activeBordereau.id) {
        return {
          ...b,
          paymentStatus: "paid" as const,
          paidAt: nowIso,
          updatedAt: nowIso,
        };
      }
      return b;
    });
    saveBordereaux(updated);

    // Reflect [POOLPAID:Month] on rawMembers in state
    setRawMembers((prev) =>
      prev.map((m) => {
        if (
          activeBordereau.memberIds.includes(m.id) ||
          activeBordereau.memberIds.includes(m.swimId)
        ) {
          return {
            ...m,
            notes: encodePoolPaidNotes(m.notes, true, activeMonth),
          };
        }
        return m;
      })
    );

    showToast("Paiement validé ! Label 'poolpaid' appliqué aux adhérents du bordereau.");
  };

  // Derive document metadata from active bordereau
  const docMeta: PoolDocumentMeta = useMemo(() => {
    return {
      title: activeBordereau.title || "Demande d'accès",
      referenceNumber: activeBordereau.referenceNumber || "n:0010/26",
      date: activeBordereau.date || "08/10/2026",
      year: activeBordereau.year || "2026",
    };
  }, [activeBordereau]);

  const handleUpdateDocMeta = (field: keyof PoolDocumentMeta, value: string) => {
    handleUpdateActiveBordereauMeta(field, value);
  };

  // ─── 5. BILLING CONFIGS (MONTHLY VS SESSION CONVERTOR) ───────────────────────
  const [billingConfigs, setBillingConfigs] = useState<Record<string, SwimmerBillingConfig>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.BILLING_CONFIGS);
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return {};
  });

  const saveBillingConfigs = (updated: Record<string, SwimmerBillingConfig>) => {
    setBillingConfigs(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.BILLING_CONFIGS, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Toggle member between monthly and session settlement
  const handleToggleBillingMode = (rowId: string) => {
    const current = billingConfigs[rowId];
    const isCurrentlySession = current?.mode === "session";
    const updated = {
      ...billingConfigs,
      [rowId]: {
        ...current,
        mode: (isCurrentlySession ? "monthly" : "session") as "monthly" | "session",
        sessionsConsumed: current?.sessionsConsumed || 1,
        hoursConsumed: undefined,
      },
    };
    saveBillingConfigs(updated);
    showToast(isCurrentlySession ? "Passé au forfait mensuel" : "Passé à la séance (500 DA/h)");
  };

  // Adjust sessions consumed (1 session = 2h = 1000 DA)
  const handleSetSessionsConsumed = (rowId: string, sessions: number) => {
    const current = billingConfigs[rowId] || { mode: "session" };
    const updated = {
      ...billingConfigs,
      [rowId]: {
        ...current,
        mode: "session" as const,
        sessionsConsumed: Math.max(1, sessions),
        hoursConsumed: undefined,
        manualPriceOverride: undefined,
      },
    };
    saveBillingConfigs(updated);
  };

  // ─── 6. PER-ROW MONTH OVERRIDES ──────────────────────────────────────────────
  const [monthOverrides, setMonthOverrides] = useState<Record<string, string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.ROW_MONTH_OVERRIDES);
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return {};
  });

  const [editingMonthRowId, setEditingMonthRowId] = useState<string | null>(null);

  const handleSaveRowMonth = (rowId: string, monthVal: string) => {
    const updated = { ...monthOverrides, [rowId]: monthVal.trim() };
    setMonthOverrides(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.ROW_MONTH_OVERRIDES, JSON.stringify(updated));
    } catch {
      // ignore
    }
    setEditingMonthRowId(null);
  };

  // ─── 7. INLINE MANUAL PRICE OVERRIDES ────────────────────────────────────────
  const [inlinePriceRowId, setInlinePriceRowId] = useState<string | null>(null);
  const [inlinePriceInput, setInlinePriceInput] = useState<string>("");

  const handleSaveInlinePrice = (rowId: string, price: number) => {
    // Check if it's a custom collective row
    const custIndex = (activeBordereau.customRows || []).findIndex((c) => c.id === rowId);
    if (custIndex !== -1) {
      const updatedCustom = [...(activeBordereau.customRows || [])];
      updatedCustom[custIndex].poolPriceDA = price;
      handleUpdateActiveBordereauMeta("customRows", updatedCustom);
      setInlinePriceRowId(null);
      showToast("Prix modifié");
      return;
    }

    const current = billingConfigs[rowId] || { mode: "monthly" };
    const updated = {
      ...billingConfigs,
      [rowId]: {
        ...current,
        manualPriceOverride: price,
      },
    };
    saveBillingConfigs(updated);
    setInlinePriceRowId(null);
    showToast("Prix modifié");
  };

  const handleResetPriceToAuto = (rowId: string) => {
    const current = billingConfigs[rowId];
    if (!current) return;
    const updatedCurrent = { ...current };
    delete updatedCurrent.manualPriceOverride;
    const updated = { ...billingConfigs, [rowId]: updatedCurrent };
    saveBillingConfigs(updated);
    showToast("Prix réinitialisé au calcul automatique");
  };

  // ─── 8. PRE-RESERVATION OVERRIDES (PLACES COUNT) ─────────────────────────────
  const [placeOverrides, setPlaceOverrides] = useState<Record<string, number>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.RESERVATION_OVERRIDES);
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return {};
  });

  const handleUpdatePlaceCount = (resId: string, delta: number) => {
    const current = placeOverrides[resId] ?? 0;
    const nextVal = Math.max(0, current + delta);
    const updated = { ...placeOverrides, [resId]: nextVal };
    setPlaceOverrides(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.RESERVATION_OVERRIDES, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // ─── 9. DATE & MONTH CONTEXT (DEFINED ABOVE IN 4b) ──────────────────────────

  // ─── 10. BUILD REALFINALPOOL ROWS (SELECTED CLIENTS IN ACTIVE BORDEREAU) ─────
  const activeBordereauMembers = useMemo(() => {
    const idSet = new Set(activeBordereau.memberIds || []);
    return rawMembers.filter((m) => idSet.has(m.id) || idSet.has(m.swimId));
  }, [rawMembers, activeBordereau.memberIds]);

  const finalRows: PoolSwimmerRow[] = useMemo(() => {
    return buildPoolDispatchRows(
      activeBordereauMembers,
      rawGroups,
      billingConfigs,
      activeBordereau.month || monthLabel,
      monthOverrides,
      activeBordereau.customRows || [],
      {},
      activePool.defaultRules
    );
  }, [
    activeBordereauMembers,
    rawGroups,
    billingConfigs,
    activeBordereau.month,
    monthLabel,
    monthOverrides,
    activeBordereau.customRows,
    activePool,
  ]);

  // Selected row IDs for filtering / printing
  const [selectedSwimmerIds, setSelectedSwimmerIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelectedSwimmerIds(new Set(finalRows.map((r) => r.swimId || r.memberId)));
  }, [finalRows]);

  // Summary statistics
  const summary = useMemo(() => {
    return computeRealFinalPoolSummary(finalRows, selectedSwimmerIds);
  }, [finalRows, selectedSwimmerIds]);

  // ─── 11. BUILD PRE-RESERVATION SLOTS (WITHOUT PRICING) ───────────────────────
  const slotReservations: PoolSlotReservation[] = useMemo(() => {
    return buildPoolSlotReservations(rawGroups, rawMembers, placeOverrides);
  }, [rawGroups, rawMembers, placeOverrides]);

  const [selectedReservationIds, setSelectedReservationIds] = useState<Set<string>>(new Set());
  const [hasInitializedResIds, setHasInitializedResIds] = useState(false);

  // Option: show names in pre-reservation
  const [showNamesInPreview, setShowNamesInPreview] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.PREVIEW_SHOW_NAMES);
        if (saved !== null) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return false;
  });

  const handleToggleShowNamesInPreview = (val: boolean) => {
    setShowNamesInPreview(val);
    try {
      localStorage.setItem(STORAGE_KEYS.PREVIEW_SHOW_NAMES, JSON.stringify(val));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!hasInitializedResIds && slotReservations.length > 0) {
      const activeIds = slotReservations
        .filter((r) => r.reservedPlaces > 0)
        .map((r) => r.id);
      setSelectedReservationIds(new Set(activeIds));
      setHasInitializedResIds(true);
    }
  }, [slotReservations, hasInitializedResIds]);

  const handleToggleReservation = (resId: string) => {
    setSelectedReservationIds((prev) => {
      const next = new Set(prev);
      if (next.has(resId)) {
        next.delete(resId);
      } else {
        next.add(resId);
      }
      return next;
    });
  };

  const handleSelectAllReservations = () => {
    const activeFiltered = filteredReservations.filter((r) => r.reservedPlaces > 0);
    const allSelected =
      activeFiltered.length > 0 &&
      activeFiltered.every((r) => selectedReservationIds.has(r.id));
    if (allSelected) {
      setSelectedReservationIds((prev) => {
        const next = new Set(prev);
        activeFiltered.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      setSelectedReservationIds((prev) => {
        const next = new Set(prev);
        activeFiltered.forEach((r) => next.add(r.id));
        return next;
      });
    }
  };

  const resSummary = useMemo(() => {
    return computeSlotReservationsSummary(slotReservations, selectedReservationIds);
  }, [slotReservations, selectedReservationIds]);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFinalRows = useMemo(() => {
    if (!searchQuery.trim()) return finalRows;
    const q = searchQuery.toLowerCase().trim();
    return finalRows.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        r.assignedGroupNames.some((g) => g.toLowerCase().includes(q))
    );
  }, [finalRows, searchQuery]);

  const filteredReservations = useMemo(() => {
    if (!searchQuery.trim()) return slotReservations;
    const q = searchQuery.toLowerCase().trim();
    return slotReservations.filter(
      (r) =>
        r.groupName.toLowerCase().includes(q) ||
        r.day.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        (showNamesInPreview && r.memberNames?.some((name) => name.toLowerCase().includes(q)))
    );
  }, [slotReservations, searchQuery, showNamesInPreview]);

  // ─── 12. MODALS & PREVIEW CONTROLS ───────────────────────────────────────────
  const [isAddBordereauModalOpen, setIsAddBordereauModalOpen] = useState(false);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isAddGroupBulkModalOpen, setIsAddGroupBulkModalOpen] = useState(false);
  const [isPaymentConfirmationModalOpen, setIsPaymentConfirmationModalOpen] = useState(false);
  const [isAddCustomRowModalOpen, setIsAddCustomRowModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // ─── 13. EXPORT & PRINT HANDLERS ─────────────────────────────────────────────
  const handlePrint = () => {
    const originalTitle = typeof document !== "undefined" ? document.title : "";
    const proposedName =
      activeBordereau.title ||
      getProposedBordereauTitle(
        activeBordereau.poolId,
        bordereaux.findIndex((b) => b.id === activeBordereau.id) + 1
      );
    if (typeof document !== "undefined") {
      document.title = proposedName;
    }
    window.print();
    setTimeout(() => {
      if (typeof document !== "undefined") {
        document.title = originalTitle;
      }
    }, 1000);
  };

  const handleExportCSV = () => {
    if (mode === "preview") {
      const csv = exportSlotReservationsToCSV(
        slotReservations,
        monthLabel,
        true,
        selectedReservationIds,
        showNamesInPreview
      );
      downloadBlob(csv, `PreReservation_AQA_${docMeta.year}.csv`);
    } else {
      const csv = exportOfficialCorrespondenceToCSV(
        finalRows,
        docMeta,
        true,
        selectedSwimmerIds
      );
      const filename = `${(activeBordereau.title || `Bordereau_${docMeta.referenceNumber}`).replace(/[^a-zA-Z0-9_\-]/g, "_")}.csv`;
      downloadBlob(csv, filename);
    }
    showToast("Fichier CSV téléchargé");
  };

  const downloadBlob = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 border border-cyan-500/50 text-white text-xs font-semibold shadow-xl animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}

      {/* ─── TOP CONTROL BAR (CLEAN & INTUITIVE) ──────────────────────────────── */}
      <div className="print:hidden rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 sm:p-5 space-y-4 shadow-sm">
        {/* Row 1: Pool Selection & Mode Segmented Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
          {/* Step 1: Select the Pool */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Piscine :
            </label>
            <div className="relative">
              <select
                value={selectedPoolId}
                onChange={(e) => {
                  handleSelectPool(e.target.value);
                  if (mode === "real_final") {
                    handleUpdateActiveBordereauMeta("poolId", e.target.value);
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-cyan-500/30 text-white font-semibold text-xs focus:outline-none focus:border-cyan-400 cursor-pointer pr-8"
              >
                {DEFAULT_POOLS.map((pool) => (
                  <option key={pool.id} value={pool.id}>
                    {pool.name} {pool.id === "azal" ? "(Tarifs Azal actifs)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Step 2: Select Mode */}
          <div className="inline-flex p-1 rounded-xl bg-slate-950 border border-white/10">
            <button
              type="button"
              onClick={() => setMode("preview")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mode === "preview"
                  ? "bg-cyan-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              1. Pré-réservation (Sans tarifs)
            </button>
            <button
              type="button"
              onClick={() => setMode("real_final")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mode === "real_final"
                  ? "bg-cyan-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              2. RealFinalPool (Bordereau Réel)
            </button>
          </div>
        </div>

        {/* RealFinalPool Dedicated Bordereau Selection Bar */}
        {mode === "real_final" && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950/80 border border-cyan-500/20">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {t("activeBordereau")} :
              </span>
              <select
                value={activeBordereau.id}
                onChange={(e) => handleSelectBordereau(e.target.value)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-cyan-500/40 text-white font-bold text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                {bordereaux.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.referenceNumber} - {b.title} ({b.month}) [{(b.memberIds || []).length} adh
                    {b.paymentStatus === "paid" ? " - poolpaid" : ""}]
                  </option>
                ))}
              </select>

              {/* Payment status badge */}
              {activeBordereau.paymentStatus === "paid" ? (
                <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>poolpaid</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  {t("pendingPayment")}
                </span>
              )}

              {/* Add Bordereau button */}
              <button
                type="button"
                onClick={() => setIsAddBordereauModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs border border-cyan-500/30 transition-colors"
              >
                + {t("addBordereau")}
              </button>

              {/* Delete bordereau button if multiple exist */}
              {bordereaux.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDeleteBordereau(activeBordereau.id)}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/80 text-rose-400 font-semibold text-xs border border-rose-800/30 transition-colors"
                  title="Supprimer ce bordereau"
                >
                  Supprimer
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPaymentConfirmationModalOpen(true)}
                className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all shadow-sm flex items-center gap-1.5 ${
                  activeBordereau.paymentStatus === "paid"
                    ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900"
                    : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="w-3.5 h-3.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>
                  {activeBordereau.paymentStatus === "paid"
                    ? t("paymentConfirmed")
                    : t("confirmPayment")}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Row 2: Document Metadata Bar (Title, Ref, Date, Year) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-3 rounded-xl border border-white/5 text-xs">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Titre Document
            </label>
            <input
              type="text"
              value={docMeta.title}
              onChange={(e) => handleUpdateDocMeta("title", e.target.value)}
              className="w-full px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-cyan-400"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              N° Référence
            </label>
            <input
              type="text"
              value={docMeta.referenceNumber}
              onChange={(e) => handleUpdateDocMeta("referenceNumber", e.target.value)}
              className="w-full px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-white text-xs font-mono font-bold focus:outline-none focus:border-cyan-400"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Date d&apos;émission
            </label>
            <input
              type="text"
              value={docMeta.date}
              onChange={(e) => handleUpdateDocMeta("date", e.target.value)}
              className="w-full px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-white text-xs font-mono font-bold focus:outline-none focus:border-cyan-400"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              {mode === "real_final" ? "Mois de Référence" : "Année"}
            </label>
            {mode === "real_final" ? (
              <select
                value={activeBordereau.month || getCurrentFrenchMonth()}
                onChange={(e) => handleUpdateActiveBordereauMeta("month", e.target.value)}
                className="w-full px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-cyan-400"
              >
                {FRENCH_MONTHS.map((m) => (
                  <option key={m} value={m} className="bg-slate-900 text-white">
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={docMeta.year}
                onChange={(e) => handleUpdateDocMeta("year", e.target.value)}
                className="w-full px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-white text-xs font-mono font-bold focus:outline-none focus:border-cyan-400"
              />
            )}
          </div>
        </div>

        {/* Row 3: Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">
              Piscine active : <strong className="text-white">{activePool.name}</strong>
            </span>
            <span className="text-xs text-slate-600">|</span>
            <span className="text-xs text-slate-400 font-medium">
              Tarif séance : <strong className="text-emerald-400">500 DA / heure</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {mode === "real_final" && (
              <>
                <button
                  type="button"
                  onClick={() => setIsAddClientModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs transition-colors shadow-sm"
                >
                  + {t("addClient")}
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddGroupBulkModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-400 hover:text-slate-950 text-teal-300 font-bold text-xs border border-teal-500/30 transition-colors"
                >
                  + {t("addGroupBulk")}
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddCustomRowModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs border border-cyan-500/20 transition-colors"
                >
                  {t("collectiveCustomRow")}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setIsPreviewModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-white/10 transition-colors"
            >
              Aperçu 100% PDF
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs transition-colors shadow-sm"
            >
              Imprimer / PDF
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs border border-white/10 transition-colors"
            >
              Exporter CSV
            </button>
          </div>
        </div>
      </div>

      {/* ─── LOADING STATE ────────────────────────────────────────────────────── */}
      {loadingData && (
        <div className="p-8 text-center text-slate-400 text-sm">
          Chargement des adhérents et créneaux...
        </div>
      )}

      {/* ─── WORKSPACE: METHOD ONE (PRE-RESERVATION - NO PRICING) ─────────────── */}
      {!loadingData && mode === "preview" && (
        <div className="print:hidden space-y-4">
          <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-sm">
            <div className="p-3 sm:p-4 border-b border-[var(--border)] bg-slate-950/40 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold text-white">
                  Pré-réservation des Places par Créneau {showNamesInPreview ? "(Avec noms)" : "(Sans noms)"}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  {resSummary.totalReservedPlaces} places réservées ({resSummary.selectedReservationsCount} créneaux retenus)
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 px-3 py-1 rounded-lg border border-white/10 hover:border-cyan-500/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={showNamesInPreview}
                    onChange={(e) => handleToggleShowNamesInPreview(e.target.checked)}
                    className="rounded border-white/20 text-cyan-500 focus:ring-0 cursor-pointer"
                  />
                  <span>Afficher les noms</span>
                </label>
                <button
                  type="button"
                  onClick={handleSelectAllReservations}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 transition-colors"
                >
                  Tout cocher / décocher
                </button>
                <input
                  type="text"
                  placeholder="Filtrer créneau / groupe / nom..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-1 rounded-lg bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-[var(--border)] text-slate-400 font-bold uppercase text-[10px]">
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredReservations.filter((r) => r.reservedPlaces > 0).length > 0 &&
                          filteredReservations
                            .filter((r) => r.reservedPlaces > 0)
                            .every((r) => selectedReservationIds.has(r.id))
                        }
                        onChange={handleSelectAllReservations}
                        aria-label="Sélectionner tous les créneaux"
                        className="rounded border-white/20 text-cyan-500 focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="p-3 w-12 text-center">N</th>
                    <th className="p-3">Créneau (Jour & Heure)</th>
                    <th className="p-3">Groupe d&apos;Entrainement</th>
                    {showNamesInPreview && (
                      <th className="p-3 bg-slate-900/60 text-slate-200">Adhérents assignés</th>
                    )}
                    <th className="p-3 text-center bg-cyan-500/10 text-cyan-300">Places Réservées</th>
                    <th className="p-3 text-center">Inclusion PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredReservations.map((r, idx) => {
                    const isSelected = selectedReservationIds.has(r.id);
                    const isIncludedInPdf = isSelected && r.reservedPlaces > 0;
                    return (
                      <tr
                        key={r.id}
                        className={`transition-colors ${
                          isIncludedInPdf
                            ? "hover:bg-cyan-500/[0.04]"
                            : "opacity-60 bg-slate-950/20 hover:bg-slate-950/40"
                        }`}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleReservation(r.id)}
                            aria-label={`Sélectionner ${r.groupName}`}
                            className="rounded border-white/20 text-cyan-500 focus:ring-0 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 text-center font-mono text-slate-500">{idx + 1}</td>
                        <td className="p-3 font-bold text-white">
                          {r.day} <span className="font-mono text-cyan-300 font-semibold ml-1">{r.time}</span>
                        </td>
                        <td className="p-3 font-medium text-slate-300">{r.groupName}</td>
                        {showNamesInPreview && (
                          <td className="p-3">
                            {r.memberNames && r.memberNames.length > 0 ? (
                              <div className="space-y-1">
                                <div className="flex flex-wrap gap-1 max-w-sm">
                                  {r.memberNames.map((name, i) => (
                                    <span
                                      key={i}
                                      className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-200 border border-white/5 font-medium"
                                    >
                                      {name}
                                    </span>
                                  ))}
                                </div>
                                <span className="text-[10px] text-slate-400">
                                  {r.memberNames.length} adhérent{r.memberNames.length > 1 ? "s" : ""}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-500 italic text-[11px]">Aucun adhérent assigné</span>
                            )}
                          </td>
                        )}
                        <td className="p-3 text-center bg-cyan-500/5">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdatePlaceCount(r.id, -1)}
                              className="w-5 h-5 rounded bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center font-bold"
                              title="Diminuer d'une place"
                            >
                              -
                            </button>
                            <span className="font-mono font-extrabold text-sm text-cyan-300 min-w-[28px]">
                              {r.reservedPlaces}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdatePlaceCount(r.id, 1)}
                              className="w-5 h-5 rounded bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center font-bold"
                              title="Augmenter d'une place"
                            >
                              +
                            </button>
                          </div>
                          {r.reservedPlaces <= 0 && (
                            <span className="block text-[9px] text-amber-400 font-semibold mt-0.5">
                              0 place (exclu du PDF)
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {isIncludedInPdf ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Inclus au PDF
                            </span>
                          ) : r.reservedPlaces <= 0 ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              0 place (Exclu)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-white/10">
                              Décoché
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── WORKSPACE: METHOD TWO (REALFINALPOOL - OFFICIAL TARIFFS) ─────────── */}
      {!loadingData && mode === "real_final" && (
        <div className="print:hidden space-y-4">
          {/* Summary KPIs for the active bordereau */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-[var(--surface)] border border-cyan-500/30 shadow-md">
              <span className="text-[11px] font-bold uppercase text-slate-400">Total Facture Piscine</span>
              <p className="text-2xl font-mono font-black text-cyan-300 mt-1">
                {summary.totalDuePoolDA.toLocaleString("fr-DZ")} DA
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <span className="text-[11px] font-bold uppercase text-slate-400">Adhérents dans ce Bordereau</span>
              <p className="text-2xl font-mono font-extrabold text-white mt-1">
                {activeBordereauMembers.length} <span className="text-xs font-normal text-slate-400">/ {rawMembers.length} inscrits</span>
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <span className="text-[11px] font-bold uppercase text-slate-400">Statut Règlement Piscine</span>
              <div className="mt-1">
                {activeBordereau.paymentStatus === "paid" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>poolpaid (Payé)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>En attente</span>
                  </span>
                )}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <span className="text-[11px] font-bold uppercase text-slate-400">Mois Référence</span>
              <p className="text-xl font-bold text-slate-200 mt-1">{activeBordereau.month || "Octobre"}</p>
            </div>
          </div>

          {/* RealFinalPool Table */}
          <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-sm">
            <div className="p-3 border-b border-[var(--border)] bg-slate-950/40 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">
                  Bordereau Réel des Adhérents & Lignes Collectives ({activeBordereau.referenceNumber})
                </span>
                <span className="text-xs text-slate-400">
                  (Calcul automatique par fréquence & heure de la journée)
                </span>
              </div>
              <input
                type="text"
                placeholder="Rechercher par nom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1 rounded-lg bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-[var(--border)] text-slate-400 font-bold uppercase text-[10px]">
                    <th className="p-3 w-10 text-center">N</th>
                    <th className="p-3">Nom et Prénom</th>
                    <th className="p-3">Groupe & Créneau</th>
                    <th className="p-3">Formule / Mode Règlement</th>
                    <th className="p-3 text-right bg-emerald-500/10 text-emerald-300 font-extrabold">
                      prix (DA)
                    </th>
                    <th className="p-3 text-center">Mois</th>
                    <th className="p-3 text-center w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredFinalRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center">
                        <div className="max-w-md mx-auto space-y-3">
                          <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className="w-6 h-6"
                            >
                              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="8.5" cy="7" r="4" />
                              <line x1="20" y1="8" x2="20" y2="14" />
                              <line x1="23" y1="11" x2="17" y2="11" />
                            </svg>
                          </div>
                          <h4 className="text-sm font-bold text-white">
                            {t("emptyBordereauTitle")}
                          </h4>
                          <p className="text-xs text-slate-400">
                            {t("emptyBordereauDesc")}
                          </p>
                          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setIsAddClientModalOpen(true)}
                              className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
                            >
                              + {t("addClient")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsAddGroupBulkModalOpen(true)}
                              className="px-3.5 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-400 hover:text-slate-950 text-teal-300 font-bold text-xs border border-teal-500/30"
                            >
                              + {t("addGroupBulk")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsAddCustomRowModalOpen(true)}
                              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-white/10"
                            >
                              + Ligne Collective
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredFinalRows.map((r, idx) => {
                      const rowId = r.swimId || r.memberId;
                      const isInlineEditingPrice = inlinePriceRowId === rowId;
                      const isInlineEditingMonth = editingMonthRowId === rowId;

                      return (
                        <tr key={rowId} className="hover:bg-white/[0.02] transition-colors">
                          {/* Col 1: Index */}
                          <td className="p-3 text-center font-mono text-slate-500">{idx + 1}</td>

                          {/* Col 2: Name */}
                          <td className="p-3 font-bold text-white">
                            <div className="flex items-center gap-2">
                              <span>{r.fullName}</span>
                              {r.isCustom && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                  Collectif
                                </span>
                              )}
                              {r.isPoolPaid && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                  poolpaid
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Col 3: Group & Schedule */}
                          <td className="p-3 text-slate-300 text-xs">
                            <span className="font-semibold text-white">
                              {getSwimmerDispatchGroupDisplay(r)}
                            </span>
                            {r.billingMode === "session" && r.assignedGroupNames.length > 0 && (
                              <span className="block text-[10px] text-slate-400">
                                ({r.assignedGroupNames.join(" + ")})
                              </span>
                            )}
                          </td>

                          {/* Col 4: Formula / Settlement Switcher */}
                          <td className="p-3">
                            {!r.isCustom ? (
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    r.billingMode === "session"
                                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                      : "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                                  }`}
                                >
                                  {r.formulaLabel}
                                </span>

                                {/* Toggle between Monthly and Session */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleBillingMode(rowId)}
                                  className="text-[10px] text-slate-400 hover:text-white underline"
                                  title="Changer le mode de facturation"
                                >
                                  {r.billingMode === "session" ? "Passer au mois" : "À la séance"}
                                </button>

                                {/* If in session mode, show quick consumed stepper */}
                                {r.billingMode === "session" && (
                                  <div className="inline-flex items-center gap-1 ml-1 bg-slate-900 px-1.5 py-0.5 rounded border border-white/10 text-[10px]">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleSetSessionsConsumed(
                                          rowId,
                                          (r.sessionsConsumed || 1) - 1
                                        )
                                      }
                                      className="px-1 text-slate-400 hover:text-white font-bold"
                                    >
                                      -
                                    </button>
                                    <span className="font-mono font-bold text-amber-300">
                                      {r.sessionsConsumed || 1}s
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleSetSessionsConsumed(
                                          rowId,
                                          (r.sessionsConsumed || 1) + 1
                                        )
                                      }
                                      className="px-1 text-slate-400 hover:text-white font-bold"
                                    >
                                      +
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400">
                                Ligne collective forfaitaire
                              </span>
                            )}
                          </td>

                          {/* Col 5: Prix (DA) with inline editing */}
                          <td className="p-3 text-right bg-emerald-500/5">
                            {isInlineEditingPrice ? (
                              <div className="flex items-center justify-end gap-1">
                                <input
                                  type="number"
                                  step="100"
                                  value={inlinePriceInput}
                                  onChange={(e) => setInlinePriceInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleSaveInlinePrice(rowId, Number(inlinePriceInput) || 0);
                                    }
                                    if (e.key === "Escape") setInlinePriceRowId(null);
                                  }}
                                  onBlur={() =>
                                    handleSaveInlinePrice(rowId, Number(inlinePriceInput) || 0)
                                  }
                                  autoFocus
                                  className="w-24 px-2 py-0.5 rounded bg-slate-950 border border-cyan-400 text-xs font-mono font-bold text-white text-right focus:outline-none"
                                />
                              </div>
                            ) : (
                              <div
                                onClick={() => {
                                  setInlinePriceInput(String(r.poolPriceDA));
                                  setInlinePriceRowId(rowId);
                                }}
                                className="cursor-pointer group flex items-center justify-end gap-1.5"
                                title="Cliquer pour modifier le prix manuellement"
                              >
                                <span className="font-mono font-extrabold text-sm text-emerald-300 group-hover:text-emerald-200">
                                  {r.poolPriceDA.toLocaleString("fr-DZ")}
                                </span>
                                {r.hasPriceOverride && (
                                  <span className="text-[9px] font-bold text-amber-400">*</span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Col 6: Mois with inline edit */}
                          <td className="p-3 text-center">
                            {isInlineEditingMonth ? (
                              <select
                                defaultValue={r.currentMonth}
                                onChange={(e) => {
                                  handleSaveRowMonth(rowId, e.target.value);
                                  setEditingMonthRowId(null);
                                }}
                                onBlur={(e) => {
                                  handleSaveRowMonth(rowId, e.target.value);
                                  setEditingMonthRowId(null);
                                }}
                                autoFocus
                                className="w-24 px-1 py-0.5 rounded bg-slate-950 border border-cyan-400 text-xs text-center text-white focus:outline-none"
                              >
                                {FRENCH_MONTHS.map((m) => (
                                  <option key={m} value={m} className="bg-slate-900 text-white">
                                    {m}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span
                                onClick={() => setEditingMonthRowId(rowId)}
                                className="cursor-pointer px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-300 hover:text-white"
                                title="Cliquer pour modifier le mois"
                              >
                                {r.currentMonth}
                              </span>
                            )}
                          </td>

                          {/* Col 7: Actions */}
                          <td className="p-3 text-center">
                            {r.isCustom ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomRowFromActiveBordereau(r.memberId)}
                                className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
                                title="Supprimer la ligne"
                              >
                                Suppr
                              </button>
                            ) : (
                              <div className="flex items-center justify-center gap-2">
                                {r.hasPriceOverride && (
                                  <button
                                    type="button"
                                    onClick={() => handleResetPriceToAuto(rowId)}
                                    className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold underline"
                                    title="Réinitialiser au calcul automatique"
                                  >
                                    Auto
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMemberFromActiveBordereau(r.memberId)}
                                  className="text-[11px] text-rose-400 hover:text-rose-300 font-medium"
                                  title="Retirer du bordereau"
                                >
                                  {t("removeFromBordereau")}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredFinalRows.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-950 border-t-2 border-slate-700">
                      <td colSpan={4} className="p-4 text-right font-extrabold uppercase text-xs text-slate-300">
                        Grand Total Redevance Piscine :
                      </td>
                      <td className="p-4 text-right bg-cyan-500/20 font-mono font-black text-lg text-cyan-300 border-x-2 border-cyan-500">
                        {summary.totalDuePoolDA.toLocaleString("fr-DZ")} DA
                      </td>
                      <td colSpan={2} className="p-4"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: 100% IDENTICAL PDF ON-SCREEN PREVIEW ───────────────────────── */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-cyan-500/40 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-slate-950 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Aperçu Document Officiel (100% Identique au format Demande d&apos;accès)
                </h3>
                <p className="text-xs text-slate-400">
                  {activePool.name} - {docMeta.referenceNumber} ({docMeta.date})
                </p>
              </div>
              <div className="flex items-center gap-2">
                {mode === "preview" && (
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 px-2.5 py-1.5 rounded-xl border border-white/10 hover:border-cyan-500/30 transition-colors">
                    <input
                      type="checkbox"
                      checked={showNamesInPreview}
                      onChange={(e) => handleToggleShowNamesInPreview(e.target.checked)}
                      className="rounded border-white/20 text-cyan-500 focus:ring-0 cursor-pointer"
                    />
                    <span>Noms</span>
                  </label>
                )}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
                >
                  Imprimer / Exporter PDF
                </button>
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  Fermer
                </button>
              </div>
            </div>

            {/* Scrollable Container with exact PDF replica */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-800/80">
              <PoolPrintTemplate
                mode={mode}
                monthLabel={monthLabel}
                rows={finalRows}
                selectedIds={selectedSwimmerIds}
                totalDuePoolDA={summary.totalDuePoolDA}
                slotReservations={slotReservations}
                selectedReservationIds={selectedReservationIds}
                showNamesInPreview={showNamesInPreview}
                meta={docMeta}
                isScreenPreview={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: ADD BORDEREAU ────────────────────────────────────────────── */}
      <PoolAddBordereauModal
        isOpen={isAddBordereauModalOpen}
        onClose={() => setIsAddBordereauModalOpen(false)}
        onAdd={handleCreateBordereau}
        existingCount={bordereaux.length}
      />

      {/* ─── MODAL: ADD CLIENT TO BORDEREAU ──────────────────────────────────── */}
      <PoolAddClientModal
        isOpen={isAddClientModalOpen}
        onClose={() => setIsAddClientModalOpen(false)}
        allMembers={rawMembers}
        allGroups={rawGroups}
        alreadySelectedIds={new Set(activeBordereau.memberIds || [])}
        alreadyPoolPaidIds={alreadyPoolPaidIdsThisMonth}
        onAddMembers={handleAddMembersToActiveBordereau}
      />

      {/* ─── MODAL: ADD GROUP BULK TO BORDEREAU ──────────────────────────────── */}
      <PoolAddGroupBulkModal
        isOpen={isAddGroupBulkModalOpen}
        onClose={() => setIsAddGroupBulkModalOpen(false)}
        allGroups={rawGroups}
        allMembers={rawMembers}
        alreadySelectedIds={new Set(activeBordereau.memberIds || [])}
        alreadyPoolPaidIds={alreadyPoolPaidIdsThisMonth}
        onAddGroupMembers={(ids) => handleAddMembersToActiveBordereau(ids)}
      />

      {/* ─── MODAL: CONFIRM PAYMENT (POOLPAID) ───────────────────────────────── */}
      <PoolPaymentConfirmationModal
        isOpen={isPaymentConfirmationModalOpen}
        onClose={() => setIsPaymentConfirmationModalOpen(false)}
        onConfirmPayment={handleConfirmActiveBordereauPayment}
        bordereauRef={activeBordereau.referenceNumber}
        bordereauTitle={activeBordereau.title}
        poolName={activePool.name}
        swimmerCount={(activeBordereau.memberIds || []).length}
        customRowCount={(activeBordereau.customRows || []).length}
        totalAmountDA={summary.totalDuePoolDA}
        monthLabel={activeBordereau.month || monthLabel}
        isAlreadyPaid={activeBordereau.paymentStatus === "paid"}
        paidAt={activeBordereau.paidAt}
      />

      {/* ─── MODAL: ADD CUSTOM COLLECTIVE ROW (AQA KIDS, ETC.) ───────────────── */}
      <PoolCustomRowModal
        isOpen={isAddCustomRowModalOpen}
        onClose={() => setIsAddCustomRowModalOpen(false)}
        onAdd={handleAddCustomRowToActiveBordereau}
        defaultMonth={activeBordereau.month || "Octobre"}
      />

      {/* ─── PRINT TEMPLATE (RENDERED DIRECTLY WHEN USER PRINTS) ─────────────── */}
      <PoolPrintTemplate
        mode={mode}
        monthLabel={monthLabel}
        rows={finalRows}
        selectedIds={selectedSwimmerIds}
        totalDuePoolDA={summary.totalDuePoolDA}
        slotReservations={slotReservations}
        selectedReservationIds={selectedReservationIds}
        showNamesInPreview={showNamesInPreview}
        meta={docMeta}
        isScreenPreview={false}
      />
    </div>
  );
}

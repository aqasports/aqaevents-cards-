"use client";

import { useState, useEffect, useCallback, useMemo, FormEvent } from "react";
import {
  Alert,
  Button,
  Card,
  Input,
  Select,
  Textarea,
  PageHeader,
  EmptyState,
  Badge,
  StatCard,
  ConfirmModal,
} from "@/components/admin/ui";
import { fetchWithRetry } from "@/lib/fetch-utils";
import { useDataCache, invalidateCache } from "@/lib/use-data-cache";
import { useTranslations, formatDate } from "@/lib/i18n";
import {
  calculateMonthlyDepreciation,
  calculateAssetCostPerUse,
} from "@/lib/equipment-math";

export type EquipmentAsset = {
  id: string;
  name: string;
  category: string;
  purchasePrice: number;
  purchaseDate: string;
  usefulLifeMonths: number;
  maintenanceCost: number;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { usageLogs: number };
};

export type EquipmentUsageLog = {
  id: string;
  equipmentAssetId: string;
  sessionId: string | null;
  loggedAt: string;
  notes: string | null;
  session?: {
    id: string;
    sessionDate: string;
    location: string | null;
    activity: {
      id: string;
      name: string;
    };
  } | null;
};

export type ActivitySessionOption = {
  id: string;
  sessionDate: string;
  location: string | null;
  activity: {
    id: string;
    name: string;
  };
};

const CATEGORY_PRESET_KEYS = [
  { key: "catBoatsKayaks", label: "Boats & Kayaks" },
  { key: "catPaddlesOars", label: "Paddles & Oars" },
  { key: "catSafetyGear", label: "Safety & Lifejackets" },
  { key: "catDivingSnorkel", label: "Diving & Snorkel" },
  { key: "catApparel", label: "Wetsuits & Apparel" },
  { key: "catNavigation", label: "Electronics & GPS" },
  { key: "catMaintenance", label: "Maintenance & Tools" },
  { key: "catOther", label: "Other Gear" },
];

const LIFESPAN_PRESETS = [12, 24, 36, 48, 60];

export default function EquipmentPage() {
  const { t, locale, dir } = useTranslations("equipmentPage");

  // Notifications
  const [message, setMessage] = useState<{ text: string; tone: "success" | "danger" } | null>(null);

  // View & Filter States
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "price_desc" | "date_desc" | "usage_desc">("name");

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<EquipmentAsset | null>(null);
  const [loggingUsageAsset, setLoggingUsageAsset] = useState<EquipmentAsset | null>(null);
  const [detailAsset, setDetailAsset] = useState<EquipmentAsset | null>(null);
  const [detailUsageLogs, setDetailUsageLogs] = useState<EquipmentUsageLog[]>([]);
  const [loadingUsageLogs, setLoadingUsageLogs] = useState(false);

  // Confirmation Modals
  const [deleteConfirm, setDeleteConfirm] = useState<EquipmentAsset | null>(null);
  const [deleteUsageId, setDeleteUsageId] = useState<string | null>(null);

  // Form Submitting States
  const [submitting, setSubmitting] = useState(false);
  const [quickStatusUpdatingId, setQuickStatusUpdatingId] = useState<string | null>(null);

  // Create Form State (for live calculations & presets)
  const [createName, setCreateName] = useState("");
  const [createCategory, setCreateCategory] = useState("");
  const [createPrice, setCreatePrice] = useState<number>(0);
  const [createPurchaseDate, setCreatePurchaseDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [createLifespan, setCreateLifespan] = useState<number>(36);
  const [createMaintenance, setCreateMaintenance] = useState<number>(0);
  const [createStatus, setCreateStatus] = useState<string>("available");
  const [createNotes, setCreateNotes] = useState("");

  // Edit Form State
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editPurchaseDate, setEditPurchaseDate] = useState<string>("");
  const [editLifespan, setEditLifespan] = useState<number>(36);
  const [editMaintenance, setEditMaintenance] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<string>("available");
  const [editNotes, setEditNotes] = useState("");

  // Usage Log Form State
  const [usageSessionId, setUsageSessionId] = useState<string>("");
  const [usageDate, setUsageDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [usageNotes, setUsageNotes] = useState<string>("");
  const [sessionsList, setSessionsList] = useState<ActivitySessionOption[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Data Fetching
  const fetcher = useCallback(async () => {
    const res = await fetchWithRetry("/api/admin/equipment");
    const data = await res.json();
    if (!res.ok || !Array.isArray(data)) {
      throw new Error(data?.error || "Failed to load equipment assets");
    }
    return data as EquipmentAsset[];
  }, []);

  const { data: equipmentData, loading, error, refetch, mutate } = useDataCache(
    "/api/admin/equipment",
    fetcher
  );

  const assets = useMemo(() => equipmentData ?? [], [equipmentData]);

  useEffect(() => {
    if (error) setMessage({ text: error, tone: "danger" });
  }, [error]);

  // Load Sessions for Usage Assignment
  const loadSessions = useCallback(async () => {
    if (sessionsList.length > 0) return;
    setLoadingSessions(true);
    try {
      const res = await fetchWithRetry("/api/admin/sessions?activeOnly=false");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setSessionsList(data);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingSessions(false);
    }
  }, [sessionsList.length]);

  // Fetch Usage Logs for Detail View
  const fetchUsageLogs = useCallback(async (assetId: string) => {
    setLoadingUsageLogs(true);
    try {
      const res = await fetchWithRetry(`/api/admin/equipment/${assetId}/usage`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setDetailUsageLogs(data);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingUsageLogs(false);
    }
  }, []);

  // When Detail Modal Opens
  useEffect(() => {
    if (detailAsset) {
      fetchUsageLogs(detailAsset.id);
    } else {
      setDetailUsageLogs([]);
    }
  }, [detailAsset, fetchUsageLogs]);

  // Reset Create Form
  function resetCreateForm() {
    setCreateName("");
    setCreateCategory("");
    setCreatePrice(0);
    setCreatePurchaseDate(new Date().toISOString().split("T")[0]);
    setCreateLifespan(36);
    setCreateMaintenance(0);
    setCreateStatus("available");
    setCreateNotes("");
  }

  // Populate Edit Form
  function openEditModal(asset: EquipmentAsset) {
    setEditingAsset(asset);
    setEditName(asset.name);
    setEditCategory(asset.category);
    setEditPrice(asset.purchasePrice || 0);
    const dateStr = asset.purchaseDate
      ? new Date(asset.purchaseDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];
    setEditPurchaseDate(dateStr);
    setEditLifespan(asset.usefulLifeMonths || 36);
    setEditMaintenance(asset.maintenanceCost || 0);
    setEditStatus(asset.status || "available");
    setEditNotes(asset.notes || "");
  }

  // Open Log Usage Modal
  function openLogUsageModal(asset: EquipmentAsset) {
    setLoggingUsageAsset(asset);
    setUsageSessionId("");
    setUsageDate(new Date().toISOString().split("T")[0]);
    setUsageNotes("");
    loadSessions();
  }

  // Handle Create Equipment
  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName.trim(),
          category: createCategory.trim(),
          purchasePrice: Number(createPrice) || 0,
          purchaseDate: createPurchaseDate ? new Date(createPurchaseDate).toISOString() : new Date().toISOString(),
          usefulLifeMonths: Number(createLifespan) || 36,
          maintenanceCost: Number(createMaintenance) || 0,
          status: createStatus,
          notes: createNotes.trim() || null,
        }),
      });

      if (res.ok) {
        setMessage({ text: t("createdSuccess"), tone: "success" });
        setShowCreateModal(false);
        resetCreateForm();
        invalidateCache("/api/admin/equipment");
        await refetch();
      } else {
        const data = await res.json();
        setMessage({ text: data.error || t("errorGeneric"), tone: "danger" });
      }
    } catch {
      setMessage({ text: t("errorGeneric"), tone: "danger" });
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Update Equipment
  async function handleUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingAsset) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/equipment/${editingAsset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          category: editCategory.trim(),
          purchasePrice: Number(editPrice) || 0,
          purchaseDate: editPurchaseDate ? new Date(editPurchaseDate).toISOString() : undefined,
          usefulLifeMonths: Number(editLifespan) || 36,
          maintenanceCost: Number(editMaintenance) || 0,
          status: editStatus,
          notes: editNotes.trim() || null,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setMessage({ text: t("updatedSuccess"), tone: "success" });
        setEditingAsset(null);

        // Update local cache
        mutate(
          (prev) => (prev || []).map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
          false
        );

        if (detailAsset && detailAsset.id === updated.id) {
          setDetailAsset({ ...detailAsset, ...updated });
        }

        invalidateCache("/api/admin/equipment");
      } else {
        const data = await res.json();
        setMessage({ text: data.error || t("errorGeneric"), tone: "danger" });
      }
    } catch {
      setMessage({ text: t("errorGeneric"), tone: "danger" });
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Quick Status Change
  async function handleQuickStatusChange(assetId: string, newStatus: string) {
    setQuickStatusUpdatingId(assetId);
    try {
      const res = await fetch(`/api/admin/equipment/${assetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        mutate(
          (prev) => (prev || []).map((item) => (item.id === assetId ? { ...item, status: newStatus } : item)),
          false
        );
        if (detailAsset && detailAsset.id === assetId) {
          setDetailAsset({ ...detailAsset, status: newStatus });
        }
      } else {
        const data = await res.json();
        setMessage({ text: data.error || t("errorGeneric"), tone: "danger" });
      }
    } catch {
      setMessage({ text: t("errorGeneric"), tone: "danger" });
    } finally {
      setQuickStatusUpdatingId(null);
    }
  }

  // Handle Delete Equipment
  async function handleDeleteAsset() {
    if (!deleteConfirm) return;
    const targetId = deleteConfirm.id;

    try {
      const res = await fetch(`/api/admin/equipment/${targetId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMessage({ text: t("deletedSuccess"), tone: "success" });
        mutate((prev) => (prev || []).filter((item) => item.id !== targetId), false);
        if (detailAsset && detailAsset.id === targetId) {
          setDetailAsset(null);
        }
        invalidateCache("/api/admin/equipment");
      } else {
        const data = await res.json();
        setMessage({ text: data.error || t("errorGeneric"), tone: "danger" });
      }
    } catch {
      setMessage({ text: t("errorGeneric"), tone: "danger" });
    } finally {
      setDeleteConfirm(null);
    }
  }

  // Handle Log Usage Submit
  async function handleLogUsage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!loggingUsageAsset) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/equipment/${loggingUsageAsset.id}/usage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: usageSessionId || null,
          loggedAt: usageDate ? new Date(usageDate).toISOString() : new Date().toISOString(),
          notes: usageNotes.trim() || null,
        }),
      });

      if (res.ok) {
        const createdLog = await res.json();
        setMessage({ text: t("usageLoggedSuccess"), tone: "success" });
        setLoggingUsageAsset(null);

        // Update count in assets
        mutate(
          (prev) =>
            (prev || []).map((item) =>
              item.id === loggingUsageAsset.id
                ? {
                    ...item,
                    _count: {
                      usageLogs: (item._count?.usageLogs || 0) + 1,
                    },
                  }
                : item
            ),
          false
        );

        if (detailAsset && detailAsset.id === loggingUsageAsset.id) {
          setDetailUsageLogs((prev) => [createdLog, ...prev]);
          setDetailAsset((prev) =>
            prev
              ? {
                  ...prev,
                  _count: {
                    usageLogs: (prev._count?.usageLogs || 0) + 1,
                  },
                }
              : null
          );
        }

        invalidateCache("/api/admin/equipment");
      } else {
        const data = await res.json();
        setMessage({ text: data.error || t("errorGeneric"), tone: "danger" });
      }
    } catch {
      setMessage({ text: t("errorGeneric"), tone: "danger" });
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Delete Usage Log
  async function handleDeleteUsageLog() {
    if (!detailAsset || !deleteUsageId) return;

    try {
      const res = await fetch(
        `/api/admin/equipment/${detailAsset.id}/usage?usageId=${deleteUsageId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        setMessage({ text: t("usageDeletedSuccess"), tone: "success" });
        setDetailUsageLogs((prev) => prev.filter((log) => log.id !== deleteUsageId));

        mutate(
          (prev) =>
            (prev || []).map((item) =>
              item.id === detailAsset.id
                ? {
                    ...item,
                    _count: {
                      usageLogs: Math.max(0, (item._count?.usageLogs || 1) - 1),
                    },
                  }
                : item
            ),
          false
        );

        setDetailAsset((prev) =>
          prev
            ? {
                ...prev,
                _count: {
                  usageLogs: Math.max(0, (prev._count?.usageLogs || 1) - 1),
                },
              }
            : null
        );

        invalidateCache("/api/admin/equipment");
      } else {
        const data = await res.json();
        setMessage({ text: data.error || t("errorGeneric"), tone: "danger" });
      }
    } catch {
      setMessage({ text: t("errorGeneric"), tone: "danger" });
    } finally {
      setDeleteUsageId(null);
    }
  }

  // Extract Dynamic Categories
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    assets.forEach((a) => {
      if (a.category) set.add(a.category);
    });
    return Array.from(set).sort();
  }, [assets]);

  // Filtered & Sorted Assets
  const filteredAssets = useMemo(() => {
    return assets
      .filter((asset) => {
        if (statusFilter !== "all" && asset.status !== statusFilter) return false;
        if (categoryFilter !== "all" && asset.category !== categoryFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = asset.name.toLowerCase().includes(q);
          const matchCat = asset.category.toLowerCase().includes(q);
          const matchNotes = asset.notes ? asset.notes.toLowerCase().includes(q) : false;
          if (!matchName && !matchCat && !matchNotes) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "price_desc") return (b.purchasePrice || 0) - (a.purchasePrice || 0);
        if (sortBy === "date_desc") {
          const dateA = new Date(a.purchaseDate).getTime();
          const dateB = new Date(b.purchaseDate).getTime();
          return dateB - dateA;
        }
        if (sortBy === "usage_desc") {
          return (b._count?.usageLogs || 0) - (a._count?.usageLogs || 0);
        }
        return 0;
      });
  }, [assets, statusFilter, categoryFilter, searchQuery, sortBy]);

  // Overall KPI Metrics
  const metrics = useMemo(() => {
    const total = assets.length;
    const available = assets.filter((a) => a.status === "available").length;
    const inUse = assets.filter((a) => a.status === "in_use").length;
    const inMaintenance = assets.filter((a) => a.status === "maintenance").length;
    const totalValuation = assets.reduce((acc, a) => acc + (a.purchasePrice || 0), 0);
    const totalMaintenance = assets.reduce((acc, a) => acc + (a.maintenanceCost || 0), 0);
    const totalDeployments = assets.reduce((acc, a) => acc + (a._count?.usageLogs || 0), 0);
    const operationalRate = total > 0 ? Math.round(((available + inUse) / total) * 100) : 100;

    return {
      total,
      available,
      inUse,
      inMaintenance,
      totalValuation,
      totalMaintenance,
      totalDeployments,
      operationalRate,
    };
  }, [assets]);

  // CSV Export Function
  function handleExportCsv() {
    if (filteredAssets.length === 0) return;

    const headers = [
      "Asset ID",
      "Name",
      "Category",
      "Status",
      "Purchase Price (DA)",
      "Purchase Date",
      "Useful Life (Months)",
      "Monthly Depreciation (DA)",
      "Maintenance Cost (DA)",
      "Session Deployments",
      "Cost Per Use (DA)",
      "Notes",
    ];

    const rows = filteredAssets.map((a) => [
      a.id,
      `"${a.name.replace(/"/g, '""')}"`,
      `"${a.category.replace(/"/g, '""')}"`,
      a.status,
      a.purchasePrice || 0,
      a.purchaseDate ? a.purchaseDate.split("T")[0] : "",
      a.usefulLifeMonths || 36,
      calculateMonthlyDepreciation(a),
      a.maintenanceCost || 0,
      a._count?.usageLogs || 0,
      calculateAssetCostPerUse(a, a._count?.usageLogs || 0),
      `"${(a.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `equipment-fleet-inventory-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Status Tone Helper
  function getStatusTone(status: string): "success" | "info" | "warning" | "default" {
    switch (status) {
      case "available":
        return "success";
      case "in_use":
        return "info";
      case "maintenance":
        return "warning";
      case "retired":
        return "default";
      default:
        return "default";
    }
  }

  // Status Label Helper
  function getStatusLabel(status: string): string {
    switch (status) {
      case "available":
        return t("statusAvailable");
      case "in_use":
        return t("statusInUse");
      case "maintenance":
        return t("statusMaintenance");
      case "retired":
        return t("statusRetired");
      default:
        return status;
    }
  }

  return (
    <div className="animate-fade-in space-y-6" dir={dir}>
      {/* Page Header */}
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleExportCsv}
              disabled={assets.length === 0}
              className="text-xs"
            >
              <svg
                className="h-4 w-4 text-[var(--muted)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              {t("exportCsv")}
            </Button>
            <Button
              onClick={() => {
                resetCreateForm();
                setShowCreateModal(true);
              }}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {t("addEquipment")}
            </Button>
          </div>
        }
      />

      {/* Notifications */}
      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatCard
          label={t("totalAssets")}
          value={metrics.total}
          hint={t("activeCount", { active: metrics.available, total: metrics.total })}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />
        <StatCard
          label={t("fleetValuation")}
          value={`${metrics.totalValuation.toLocaleString()} DA`}
          hint={t("monthsCount", { count: 36 })}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label={t("maintenanceCosts")}
          value={`${metrics.totalMaintenance.toLocaleString()} DA`}
          hint={metrics.inMaintenance > 0 ? `${metrics.inMaintenance} in maintenance` : "Fleet healthy"}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
          }
        />
        <StatCard
          label={t("operationalRate")}
          value={`${metrics.operationalRate}%`}
          hint={`${metrics.available} ready / ${metrics.inUse} deployed`}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label={t("totalUsages")}
          value={metrics.totalDeployments}
          hint={t("sessionsCount", { count: metrics.totalDeployments })}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
      </div>

      {/* Filter & Control Bar */}
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[240px]">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)] pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full pl-10 pr-4 py-2 text-sm bg-[var(--surface-2)]/60 border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filters & Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--foreground)] outline-none hover:border-[var(--border-strong)] focus:border-[var(--primary)]"
            >
              <option value="all">{t("allStatuses")}</option>
              <option value="available">{t("statusAvailable")}</option>
              <option value="in_use">{t("statusInUse")}</option>
              <option value="maintenance">{t("statusMaintenance")}</option>
              <option value="retired">{t("statusRetired")}</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--foreground)] outline-none hover:border-[var(--border-strong)] focus:border-[var(--primary)]"
            >
              <option value="all">{t("allCategories")}</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--foreground)] outline-none hover:border-[var(--border-strong)] focus:border-[var(--primary)]"
            >
              <option value="name">{t("sortName")}</option>
              <option value="price_desc">{t("sortPriceDesc")}</option>
              <option value="date_desc">{t("sortDateDesc")}</option>
              <option value="usage_desc">{t("sortUsageDesc")}</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`flex items-center justify-center p-1.5 rounded-md transition ${
                  viewMode === "grid"
                    ? "bg-[var(--primary)] text-white shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
                title={t("viewGrid")}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center justify-center p-1.5 rounded-md transition ${
                  viewMode === "table"
                    ? "bg-[var(--primary)] text-white shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
                title={t("viewTable")}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Content Area */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-56 rounded-xl bg-[var(--surface)]/50 border border-[var(--border)] animate-pulse"
            />
          ))}
        </div>
      ) : filteredAssets.length === 0 ? (
        <Card>
          <EmptyState
            title={t("noAssetsFound")}
            description={t("noAssetsDesc")}
            icon={
              <svg className="h-10 w-10 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
            action={
              <Button
                onClick={() => {
                  resetCreateForm();
                  setShowCreateModal(true);
                }}
              >
                {t("addEquipment")}
              </Button>
            }
          />
        </Card>
      ) : viewMode === "grid" ? (
        /* Grid Cards View */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAssets.map((asset) => {
            const monthlyDeprec = calculateMonthlyDepreciation(asset);
            const costPerUse = calculateAssetCostPerUse(asset, asset._count?.usageLogs || 0);

            return (
              <div
                key={asset.id}
                className="group relative flex flex-col justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md p-4 sm:p-5 shadow-[var(--shadow-sm)] hover:border-[var(--primary)]/40 hover:shadow-[var(--shadow-glow)] transition-all duration-300"
              >
                <div>
                  {/* Top Row: Category & Status */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[var(--surface-2)] text-[var(--muted)]">
                      {asset.category}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Badge tone={getStatusTone(asset.status)} size="sm">
                        {getStatusLabel(asset.status)}
                      </Badge>
                      {/* Quick Status Changer Dropdown */}
                      <select
                        value={asset.status}
                        disabled={quickStatusUpdatingId === asset.id}
                        onChange={(e) => handleQuickStatusChange(asset.id, e.target.value)}
                        className="opacity-0 group-hover:opacity-100 transition text-[10px] bg-[var(--surface-2)] border border-[var(--border)] rounded px-1 py-0.5 text-[var(--foreground)] cursor-pointer"
                        title={t("quickStatusChange")}
                      >
                        <option value="available">{t("statusAvailable")}</option>
                        <option value="in_use">{t("statusInUse")}</option>
                        <option value="maintenance">{t("statusMaintenance")}</option>
                        <option value="retired">{t("statusRetired")}</option>
                      </select>
                    </div>
                  </div>

                  {/* Asset Name */}
                  <h3 className="font-bold text-base text-[var(--foreground)] group-hover:text-[var(--primary)] transition line-clamp-1">
                    {asset.name}
                  </h3>

                  {/* Notes Preview */}
                  {asset.notes && (
                    <p className="mt-1 text-xs text-[var(--muted)] line-clamp-2 italic">
                      {asset.notes}
                    </p>
                  )}

                  {/* Financial & Lifecycle Stats */}
                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-[var(--surface-2)]/40 p-2.5 text-xs">
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-[var(--muted)]">
                        {t("tableHeaderPurchase")}
                      </p>
                      <p className="font-bold text-[var(--foreground)] tabular-nums">
                        {asset.purchasePrice.toLocaleString()} DA
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-[var(--muted)]">
                        {t("tableHeaderDepreciation")}
                      </p>
                      <p className="font-bold text-[var(--foreground)] tabular-nums">
                        {monthlyDeprec.toLocaleString()} DA
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-[var(--muted)]">
                        {t("tableHeaderUsages")}
                      </p>
                      <p className="font-bold text-[var(--primary)] tabular-nums">
                        {t("sessionsCount", { count: asset._count?.usageLogs || 0 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-[var(--muted)]">
                        {t("tableHeaderCostPerUse")}
                      </p>
                      <p className="font-bold text-[var(--foreground)] tabular-nums">
                        {costPerUse.toLocaleString()} DA
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setDetailAsset(asset)}
                      className="text-xs px-2.5 py-1"
                    >
                      {t("viewDetails")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openLogUsageModal(asset)}
                      className="text-xs px-2 py-1 text-[var(--primary)] hover:bg-[var(--primary-light)]"
                    >
                      {t("logUsageBtn")}
                    </Button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(asset)}
                      className="p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] rounded-lg transition"
                      title={t("editBtn")}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(asset)}
                      className="p-1.5 text-[var(--danger)] hover:bg-[var(--danger-bg)] rounded-lg transition"
                      title={t("deleteBtn")}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Detailed Data Table View */
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--border)] uppercase font-bold text-[var(--muted)] bg-[var(--surface-2)]/40">
                <tr>
                  <th className="py-3 px-4">{t("tableHeaderAsset")}</th>
                  <th className="py-3 px-3">{t("tableHeaderCategory")}</th>
                  <th className="py-3 px-3">{t("tableHeaderStatus")}</th>
                  <th className="py-3 px-3">{t("tableHeaderPurchase")}</th>
                  <th className="py-3 px-3">{t("tableHeaderDepreciation")}</th>
                  <th className="py-3 px-3">{t("tableHeaderMaintenance")}</th>
                  <th className="py-3 px-3">{t("tableHeaderUsages")}</th>
                  <th className="py-3 px-3">{t("tableHeaderCostPerUse")}</th>
                  <th className="py-3 px-4 text-right">{t("tableHeaderActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredAssets.map((asset) => {
                  const monthlyDeprec = calculateMonthlyDepreciation(asset);
                  const costPerUse = calculateAssetCostPerUse(asset, asset._count?.usageLogs || 0);

                  return (
                    <tr key={asset.id} className="hover:bg-[var(--surface-2)]/30 transition">
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => setDetailAsset(asset)}
                          className="font-bold text-[var(--foreground)] hover:text-[var(--primary)] text-left transition"
                        >
                          {asset.name}
                        </button>
                        {asset.notes && (
                          <p className="text-[11px] text-[var(--muted)] line-clamp-1 italic max-w-xs">
                            {asset.notes}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-3 font-medium text-[var(--muted)]">{asset.category}</td>
                      <td className="py-3 px-3">
                        <Badge tone={getStatusTone(asset.status)} size="sm">
                          {getStatusLabel(asset.status)}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 font-semibold tabular-nums">
                        {asset.purchasePrice.toLocaleString()} DA
                      </td>
                      <td className="py-3 px-3 text-[var(--muted)] tabular-nums">
                        {monthlyDeprec.toLocaleString()} DA
                      </td>
                      <td className="py-3 px-3 tabular-nums">
                        {asset.maintenanceCost > 0 ? (
                          <span className="text-[var(--warning)] font-medium">
                            {asset.maintenanceCost.toLocaleString()} DA
                          </span>
                        ) : (
                          <span className="text-[var(--muted)]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-bold text-[var(--primary)] tabular-nums">
                        {asset._count?.usageLogs || 0}
                      </td>
                      <td className="py-3 px-3 font-medium text-[var(--foreground)] tabular-nums">
                        {costPerUse.toLocaleString()} DA
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setDetailAsset(asset)}
                            className="text-xs px-2.5 py-1"
                          >
                            {t("viewDetails")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openLogUsageModal(asset)}
                            className="text-xs px-2 py-1 text-[var(--primary)]"
                          >
                            {t("logUsageBtn")}
                          </Button>
                          <button
                            type="button"
                            onClick={() => openEditModal(asset)}
                            className="p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] rounded transition"
                            title={t("editBtn")}
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(asset)}
                            className="p-1.5 text-[var(--danger)] hover:bg-[var(--danger-bg)] rounded transition"
                            title={t("deleteBtn")}
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 1. ADD EQUIPMENT MODAL                                                   */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-lg p-5 sm:p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary-light)] text-[var(--primary)]">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h3 className="font-bold text-base text-[var(--foreground)]">{t("modalAddTitle")}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-[var(--muted)] hover:text-[var(--foreground)] p-1 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Asset Name */}
              <Input
                label={t("inputName")}
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder={t("inputNamePlaceholder")}
                required
              />

              {/* Category Presets & Input */}
              <div className="space-y-1.5">
                <span className="block text-sm font-medium text-[var(--foreground)]">
                  {t("inputCategory")}
                </span>
                {/* Category Preset Badges */}
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {CATEGORY_PRESET_KEYS.map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setCreateCategory(cat.label)}
                      className={`px-2 py-1 text-xs rounded-md border transition ${
                        createCategory === cat.label
                          ? "bg-[var(--primary)] text-white border-[var(--primary)] font-semibold shadow-sm"
                          : "bg-[var(--surface-2)]/60 text-[var(--muted)] border-[var(--border)] hover:text-[var(--foreground)] hover:border-[var(--border-strong)]"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={createCategory}
                  onChange={(e) => setCreateCategory(e.target.value)}
                  placeholder={t("inputCategoryPlaceholder")}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none transition-colors duration-150 placeholder:text-[var(--muted-light)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] text-[var(--foreground)]"
                  required
                />
              </div>

              {/* Price & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label={t("inputPurchasePrice")}
                  type="number"
                  value={createPrice}
                  onChange={(e) => setCreatePrice(Number(e.target.value) || 0)}
                  min={0}
                  required
                />
                <Input
                  label={t("inputPurchaseDate")}
                  type="date"
                  value={createPurchaseDate}
                  onChange={(e) => setCreatePurchaseDate(e.target.value)}
                  required
                />
              </div>

              {/* Useful Life (Lifespan) with Presets */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="block text-sm font-medium text-[var(--foreground)]">
                    {t("inputUsefulLife")}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    {Math.round((createLifespan || 1) / 12)} years
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {LIFESPAN_PRESETS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setCreateLifespan(m)}
                      className={`flex-1 py-1 text-xs rounded-md border transition ${
                        createLifespan === m
                          ? "bg-[var(--primary-light)] text-[var(--primary)] border-[var(--primary)] font-bold"
                          : "bg-[var(--surface-2)]/40 text-[var(--muted)] border-[var(--border)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={createLifespan}
                  onChange={(e) => setCreateLifespan(Number(e.target.value) || 1)}
                  min={1}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none transition-colors duration-150 focus:border-[var(--primary)] text-[var(--foreground)]"
                />
              </div>

              {/* Maintenance & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label={t("inputMaintenanceCost")}
                  type="number"
                  value={createMaintenance}
                  onChange={(e) => setCreateMaintenance(Number(e.target.value) || 0)}
                  min={0}
                />
                <Select
                  label={t("inputStatus")}
                  value={createStatus}
                  onChange={(e) => setCreateStatus(e.target.value)}
                >
                  <option value="available">{t("statusAvailable")}</option>
                  <option value="in_use">{t("statusInUse")}</option>
                  <option value="maintenance">{t("statusMaintenance")}</option>
                  <option value="retired">{t("statusRetired")}</option>
                </Select>
              </div>

              {/* Live Depreciation Preview Card */}
              <div className="rounded-lg bg-[var(--surface-2)]/60 border border-[var(--border)] p-3 text-xs flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[var(--foreground)]">{t("estDepreciation")}</p>
                  <p className="text-[11px] text-[var(--muted)]">
                    {createPrice.toLocaleString()} DA / {createLifespan} months
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[var(--primary)] text-sm tabular-nums">
                    {Math.round(createPrice / (createLifespan || 1)).toLocaleString()} DA
                  </p>
                  <p className="text-[10px] text-[var(--muted)]">{t("perMonth")}</p>
                </div>
              </div>

              {/* Notes */}
              <Textarea
                label={t("inputNotes")}
                value={createNotes}
                onChange={(e) => setCreateNotes(e.target.value)}
                placeholder={t("inputNotesPlaceholder")}
                rows={2}
              />

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3 border-t border-[var(--border)]">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setShowCreateModal(false)}
                >
                  {t("cancelBtn")}
                </Button>
                <Button type="submit" className="flex-1" loading={submitting}>
                  {submitting ? t("savingBtn") : t("saveAssetBtn")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 2. EDIT EQUIPMENT MODAL                                                  */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {editingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-lg p-5 sm:p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary-light)] text-[var(--primary)]">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <h3 className="font-bold text-base text-[var(--foreground)]">{t("modalEditTitle")}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingAsset(null)}
                className="text-[var(--muted)] hover:text-[var(--foreground)] p-1 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <Input
                label={t("inputName")}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />

              <div className="space-y-1.5">
                <span className="block text-sm font-medium text-[var(--foreground)]">
                  {t("inputCategory")}
                </span>
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {CATEGORY_PRESET_KEYS.map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setEditCategory(cat.label)}
                      className={`px-2 py-1 text-xs rounded-md border transition ${
                        editCategory === cat.label
                          ? "bg-[var(--primary)] text-white border-[var(--primary)] font-semibold"
                          : "bg-[var(--surface-2)]/60 text-[var(--muted)] border-[var(--border)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label={t("inputPurchasePrice")}
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(Number(e.target.value) || 0)}
                  min={0}
                  required
                />
                <Input
                  label={t("inputPurchaseDate")}
                  type="date"
                  value={editPurchaseDate}
                  onChange={(e) => setEditPurchaseDate(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label={t("inputUsefulLife")}
                  type="number"
                  value={editLifespan}
                  onChange={(e) => setEditLifespan(Number(e.target.value) || 1)}
                  min={1}
                  required
                />
                <Input
                  label={t("inputMaintenanceCost")}
                  type="number"
                  value={editMaintenance}
                  onChange={(e) => setEditMaintenance(Number(e.target.value) || 0)}
                  min={0}
                />
              </div>

              <Select
                label={t("inputStatus")}
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
              >
                <option value="available">{t("statusAvailable")}</option>
                <option value="in_use">{t("statusInUse")}</option>
                <option value="maintenance">{t("statusMaintenance")}</option>
                <option value="retired">{t("statusRetired")}</option>
              </Select>

              {/* Depreciation Preview */}
              <div className="rounded-lg bg-[var(--surface-2)]/60 border border-[var(--border)] p-3 text-xs flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[var(--foreground)]">{t("estDepreciation")}</p>
                  <p className="text-[11px] text-[var(--muted)]">
                    {editPrice.toLocaleString()} DA / {editLifespan} months
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[var(--primary)] text-sm tabular-nums">
                    {Math.round(editPrice / (editLifespan || 1)).toLocaleString()} DA
                  </p>
                  <p className="text-[10px] text-[var(--muted)]">{t("perMonth")}</p>
                </div>
              </div>

              <Textarea
                label={t("inputNotes")}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={2}
              />

              <div className="flex gap-3 pt-3 border-t border-[var(--border)]">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setEditingAsset(null)}
                >
                  {t("cancelBtn")}
                </Button>
                <Button type="submit" className="flex-1" loading={submitting}>
                  {submitting ? t("savingBtn") : t("updateAssetBtn")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 3. LOG EQUIPMENT USAGE MODAL                                             */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {loggingUsageAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-md p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="font-bold text-base text-[var(--foreground)]">
                  {t("modalLogUsageTitle")}
                </h3>
                <p className="text-xs text-[var(--primary)] font-semibold mt-0.5">
                  {loggingUsageAsset.name} ({loggingUsageAsset.category})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLoggingUsageAsset(null)}
                className="text-[var(--muted)] hover:text-[var(--foreground)] p-1 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLogUsage} className="space-y-4">
              {/* Select Session */}
              <div className="space-y-1.5">
                <span className="block text-sm font-medium text-[var(--foreground)]">
                  {t("selectSession")}
                </span>
                <select
                  value={usageSessionId}
                  onChange={(e) => setUsageSessionId(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs outline-none hover:border-[var(--border-strong)] focus:border-[var(--primary)] text-[var(--foreground)]"
                >
                  <option value="">{t("noSessionStandalone")}</option>
                  {loadingSessions ? (
                    <option disabled>Loading sessions...</option>
                  ) : (
                    sessionsList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {formatDate(s.sessionDate, locale, true)} - {s.activity?.name}{" "}
                        {s.location ? `(${s.location})` : ""}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Date of Deployment */}
              <Input
                label={t("usageDate")}
                type="date"
                value={usageDate}
                onChange={(e) => setUsageDate(e.target.value)}
                required
              />

              {/* Notes */}
              <Textarea
                label={t("usageNotes")}
                value={usageNotes}
                onChange={(e) => setUsageNotes(e.target.value)}
                placeholder={t("usageNotesPlaceholder")}
                rows={3}
              />

              <div className="flex gap-3 pt-3 border-t border-[var(--border)]">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setLoggingUsageAsset(null)}
                >
                  {t("cancelBtn")}
                </Button>
                <Button type="submit" className="flex-1" loading={submitting}>
                  {submitting ? t("loggingUsage") : t("logUsageSubmit")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 4. ASSET DETAILS & USAGE HISTORY DRAWER/MODAL                            */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {detailAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-2xl p-5 sm:p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[var(--border)] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--muted)]">
                    {detailAsset.category}
                  </span>
                  <Badge tone={getStatusTone(detailAsset.status)} size="sm">
                    {getStatusLabel(detailAsset.status)}
                  </Badge>
                </div>
                <h3 className="text-xl font-bold text-[var(--foreground)] mt-1">
                  {detailAsset.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailAsset(null)}
                className="text-[var(--muted)] hover:text-[var(--foreground)] p-1 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            {/* Financial & Lifecycle Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-3">
                <p className="text-[10px] uppercase font-semibold text-[var(--muted)]">
                  {t("tableHeaderPurchase")}
                </p>
                <p className="mt-1 text-base font-bold text-[var(--foreground)] tabular-nums">
                  {detailAsset.purchasePrice.toLocaleString()} DA
                </p>
                <p className="text-[10px] text-[var(--muted)] mt-0.5">
                  {formatDate(detailAsset.purchaseDate, locale)}
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-3">
                <p className="text-[10px] uppercase font-semibold text-[var(--muted)]">
                  {t("tableHeaderDepreciation")}
                </p>
                <p className="mt-1 text-base font-bold text-[var(--foreground)] tabular-nums">
                  {calculateMonthlyDepreciation(detailAsset).toLocaleString()} DA
                </p>
                <p className="text-[10px] text-[var(--muted)] mt-0.5">
                  {t("monthsCount", { count: detailAsset.usefulLifeMonths })}
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-3">
                <p className="text-[10px] uppercase font-semibold text-[var(--muted)]">
                  {t("tableHeaderMaintenance")}
                </p>
                <p className="mt-1 text-base font-bold text-[var(--warning)] tabular-nums">
                  {detailAsset.maintenanceCost.toLocaleString()} DA
                </p>
                <p className="text-[10px] text-[var(--muted)] mt-0.5">Recorded spend</p>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-3">
                <p className="text-[10px] uppercase font-semibold text-[var(--muted)]">
                  {t("tableHeaderCostPerUse")}
                </p>
                <p className="mt-1 text-base font-bold text-[var(--primary)] tabular-nums">
                  {calculateAssetCostPerUse(
                    detailAsset,
                    detailAsset._count?.usageLogs || 0
                  ).toLocaleString()}{" "}
                  DA
                </p>
                <p className="text-[10px] text-[var(--muted)] mt-0.5">
                  {t("sessionsCount", { count: detailAsset._count?.usageLogs || 0 })}
                </p>
              </div>
            </div>

            {/* Notes Section */}
            {detailAsset.notes && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/30 p-3.5 text-xs">
                <p className="font-semibold text-[var(--foreground)] mb-1">{t("inputNotes")}:</p>
                <p className="text-[var(--muted)] whitespace-pre-wrap">{detailAsset.notes}</p>
              </div>
            )}

            {/* Usage History Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-[var(--foreground)] flex items-center gap-2">
                  <svg className="h-4 w-4 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t("usageHistoryTitle")} ({detailUsageLogs.length})
                </h4>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => openLogUsageModal(detailAsset)}
                  className="text-xs"
                >
                  + {t("logUsageBtn")}
                </Button>
              </div>

              {loadingUsageLogs ? (
                <div className="py-6 text-center text-xs text-[var(--muted)]">
                  Loading deployment history...
                </div>
              ) : detailUsageLogs.length === 0 ? (
                <div className="py-6 text-center text-xs text-[var(--muted)] italic bg-[var(--surface-2)]/20 rounded-xl border border-[var(--border)]">
                  {t("noUsageHistory")}
                </div>
              ) : (
                <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[var(--border)] bg-[var(--surface-2)]/50 text-[var(--muted)] font-semibold uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Activity / Session</th>
                        <th className="py-2.5 px-3">Notes</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {detailUsageLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-[var(--surface-2)]/30">
                          <td className="py-2.5 px-3 whitespace-nowrap text-[var(--foreground)] font-medium">
                            {formatDate(log.loggedAt, locale, true)}
                          </td>
                          <td className="py-2.5 px-3">
                            {log.session ? (
                              <span className="font-semibold text-[var(--primary)]">
                                {log.session.activity.name}{" "}
                                {log.session.location ? `(${log.session.location})` : ""}
                              </span>
                            ) : (
                              <span className="text-[var(--muted)] italic">
                                Standalone deployment
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-[var(--muted)] max-w-xs truncate">
                            {log.notes || "—"}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => setDeleteUsageId(log.id)}
                              className="text-[var(--danger)] hover:underline text-[11px]"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
              <Button
                variant="ghost"
                onClick={() => {
                  setDeleteConfirm(detailAsset);
                }}
                className="text-xs text-[var(--danger)] hover:bg-[var(--danger-bg)]"
              >
                {t("deleteBtn")}
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => openEditModal(detailAsset)}
                  className="text-xs"
                >
                  {t("editBtn")}
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setDetailAsset(null)}
                  className="text-xs"
                >
                  {t("closeBtn")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 5. CONFIRM DELETE ASSET MODAL                                            */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={Boolean(deleteConfirm)}
        title={t("deleteConfirmTitle")}
        message={
          deleteConfirm ? t("deleteConfirmMessage", { name: deleteConfirm.name }) : ""
        }
        confirmLabel={t("deleteConfirmBtn")}
        cancelLabel={t("cancelBtn")}
        isDanger={true}
        onConfirm={handleDeleteAsset}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 6. CONFIRM DELETE USAGE LOG MODAL                                        */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={Boolean(deleteUsageId)}
        title="Delete Usage Log"
        message={t("deleteUsageLogConfirm")}
        confirmLabel="Delete Log"
        cancelLabel={t("cancelBtn")}
        isDanger={true}
        onConfirm={handleDeleteUsageLog}
        onCancel={() => setDeleteUsageId(null)}
      />
    </div>
  );
}

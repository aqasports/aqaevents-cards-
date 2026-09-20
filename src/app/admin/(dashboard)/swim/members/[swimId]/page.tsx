"use client";

import { useEffect, useState, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader, Badge, Button, Input, Card } from "@/components/admin/ui";
import { calculateSwimPrice, resolveMultiGroupFormula } from "@/lib/swim-pricing";
import { SwimFlipCard } from "@/components/swim/SwimFlipCard";
import { useLocale } from "@/lib/i18n";
import QRCode from "qrcode";
import { SwimPvcPrintDialog } from "@/components/swim/SwimPvcPrintDialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SwimPaymentItem {
  id: string;
  amount: number;
  method: string;
  notes: string | null;
  paidAt: string;
}

interface SwimGroupRef {
  id: string;
  name: string;
  category: string;
  level: string;
  coachName: string | null;
  schedule: string;
  capacity: number;
  active: boolean;
  isSolid?: boolean;
  _count?: { swimmers: number };
}

interface SwimMemberDetail {
  id: string;
  swimId: string;
  fullName: string;
  phone: string;
  email: string | null;
  photoUrl: string | null;
  dateOfStart: string;
  category: string;
  level: string;
  formula: string;
  duration: string | null;
  priceDA: number;
  coachMessage: string | null;
  paymentStatus: "unpaid" | "paid" | "partial";
  groupStatus: "proposed" | "accepted" | "rejected";
  rejectionReason: string | null;
  notes: string | null;
  createdAt: string;
  group: SwimGroupRef | null;
  groupId: string | null;
  effectiveGroup: SwimGroupRef | null;
  effectivelyUnassigned: boolean;
  groups?: SwimGroupRef[];
  effectiveGroups?: SwimGroupRef[];
  groupIds?: string[];
  card: {
    id: string;
    cardCode: string;
    publicToken: string;
    status: string;
  } | null;
  payments: SwimPaymentItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLevelLabel(level: string): string {
  const map: Record<string, string> = {
    new_aqa: "New AQA Member",
    old_aqa: "Old AQA Member",
    beginner: "New AQA Member",
    intermediate: "Old AQA Member",
    advanced: "Old AQA Member",
  };
  return map[level] ?? level;
}

function getWhatsAppUrl(phone: string, name: string): string | null {
  if (!phone) return null;
  const clean = phone.replace(/[^0-9]/g, "");
  const formatted = clean.startsWith("0") ? `213${clean.slice(1)}` : clean;
  const text = encodeURIComponent(`Salam ${name},`);
  return `https://wa.me/${formatted}?text=${text}`;
}

function categoryLabel(cat: string): string {
  const map: Record<string, string> = {
    homme: "Homme",
    femme: "Femme",
    enfants: "Enfants",
    apnea: "Apnee",
  };
  return map[cat] ?? cat;
}

function paymentMethodLabel(method: string): string {
  const map: Record<string, string> = {
    cash: "Cash",
    baridi_mob: "Baridi Mob",
    virement: "Virement",
    cheque: "Cheque",
  };
  return map[method] ?? method;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminSwimmerProfilePage({
  params,
}: {
  params: Promise<{ swimId: string }>;
}) {
  const { swimId } = use(params);
  const router = useRouter();
  const { t } = useLocale();

  const [member, setMember] = useState<SwimMemberDetail | null>(null);
  const [groups, setGroups] = useState<SwimGroupRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // PVC Card Print Modal state
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [cardQrDataUrl, setCardQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!member) {
      setCardQrDataUrl(null);
      return;
    }
    const token = member.card?.publicToken;
    const publicUrl = token
      ? `${typeof window !== "undefined" ? window.location.origin : "https://aqasports.com"}/swim/card/${token}`
      : `${typeof window !== "undefined" ? window.location.origin : "https://aqasports.com"}/swim/profile/${member.swimId}`;

    QRCode.toDataURL(publicUrl, {
      width: 320,
      margin: 1,
      color: { dark: "#030712", light: "#ffffff" },
    })
      .then(setCardQrDataUrl)
      .catch(() => setCardQrDataUrl(null));
  }, [member]);

  // Edit profile state
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhotoUrl, setEditPhotoUrl] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editLevel, setEditLevel] = useState("");
  const [editDateOfStart, setEditDateOfStart] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Coach message state
  const [editingCoachMsg, setEditingCoachMsg] = useState(false);
  const [coachMsgText, setCoachMsgText] = useState("");
  const [savingCoachMsg, setSavingCoachMsg] = useState(false);

  // Price state
  const [showSetPrice, setShowSetPrice] = useState(false);
  const [newPriceInput, setNewPriceInput] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);

  // Payment state
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Tariff Configuration State (direct ledger calculation without reassigning)
  const [showTariffConfig, setShowTariffConfig] = useState(false);
  const [tariffDuration, setTariffDuration] = useState("3m");
  const [tariffFrequency, setTariffFrequency] = useState<number>(1);

  // Group assignment state
  const [showChangeGroup, setShowChangeGroup] = useState(false);
  const [groupSolidFilter, setGroupSolidFilter] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [assignDuration, setAssignDuration] = useState("3m");
  const [assignFrequency, setAssignFrequency] = useState<number>(1);
  const [savingGroup, setSavingGroup] = useState(false);
  const [confirmingGroup, setConfirmingGroup] = useState(false);

  // Delete profile state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDeleteProfile() {
    if (!member) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/swim/members/${member.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete swimmer profile");
      }
      router.push("/admin/swim");
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete swimmer profile");
      setDeleting(false);
    }
  }

  const loadMember = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/swim/members/${encodeURIComponent(swimId)}`);
      if (!res.ok) {
        setError("Swimmer profile not found.");
        return;
      }
      const data = await res.json();
      let effectivePrice = data.priceDA;

      const initialGroupIds: string[] = (data.groupIds && data.groupIds.length > 0)
        ? data.groupIds
        : (data.groupId ? [data.groupId] : []);
      const allMemberGroups: SwimGroupRef[] = (data.groups && data.groups.length > 0)
        ? data.groups
        : (data.group ? [data.group] : []);

      // If member already has a group but tariff is not set (0), automatically
      // calculate the official AQA tariff and sync it to the ledger.
      if (effectivePrice === 0 && allMemberGroups.length > 0) {
        const groupLevels = allMemberGroups.map((g) => g.level);
        const dur = data.duration || "3m";
        const computed = calculateSwimPrice({
          category: data.category,
          groupTypes: groupLevels,
          duration: dur,
        });
        if (computed > 0) {
          effectivePrice = computed;
          data.priceDA = computed;
          // Silently persist auto-computed tariff
          fetch(`/api/admin/swim/members/${data.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ priceDA: computed }),
          }).catch(() => {});
        }
      }

      setMember(data);
      setSelectedGroupIds(initialGroupIds);

      const freqMatch = (data.formula || "").match(/^([123])x/i);
      const detectedFreq = initialGroupIds.length > 0
        ? Math.min(3, Math.max(1, initialGroupIds.length))
        : (freqMatch ? parseInt(freqMatch[1], 10) : 1);

      setAssignFrequency(detectedFreq);
      setTariffFrequency(detectedFreq);
      setAssignDuration(data.duration || "3m");
      setTariffDuration(data.duration || "3m");

      // Pre-fill edit fields
      setEditFullName(data.fullName);
      setEditPhone(data.phone || "");
      setEditEmail(data.email || "");
      setEditPhotoUrl(data.photoUrl || "");
      setEditCategory(data.category);
      setEditLevel(data.level);
      setEditDateOfStart(data.dateOfStart.split("T")[0]);
      setEditNotes(data.notes || "");
      setCoachMsgText(data.coachMessage || "");
      setNewPriceInput(String(effectivePrice));
    } catch {
      setError("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, [swimId]);

  useEffect(() => {
    loadMember();
  }, [loadMember]);

  useEffect(() => {
    async function loadGroups() {
      const res = await fetch("/api/admin/swim/groups?active=true");
      if (res.ok) setGroups(await res.json());
    }
    loadGroups();
  }, []);

  // ─── Mutations ─────────────────────────────────────────────────────────────

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!member) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/admin/swim/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: editFullName,
          phone: editPhone,
          email: editEmail,
          photoUrl: editPhotoUrl,
          category: editCategory,
          level: editLevel,
          dateOfStart: editDateOfStart,
          notes: editNotes,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setEditError(d.error || "Failed to save changes.");
        return;
      }
      setShowEditPanel(false);
      await loadMember();
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleSaveCoachMsg() {
    if (!member) return;
    setSavingCoachMsg(true);
    try {
      await fetch(`/api/admin/swim/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coachMessage: coachMsgText }),
      });
      setEditingCoachMsg(false);
      await loadMember();
    } finally {
      setSavingCoachMsg(false);
    }
  }

  async function handleSavePrice() {
    if (!member) return;
    setSavingPrice(true);
    try {
      await fetch(`/api/admin/swim/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceDA: parseInt(newPriceInput, 10) }),
      });
      setShowSetPrice(false);
      await loadMember();
    } finally {
      setSavingPrice(false);
    }
  }

  async function handleApplyTariff() {
    if (!member) return;
    setSavingPrice(true);
    try {
      const assignedGroups = (member.effectiveGroups && member.effectiveGroups.length > 0)
        ? member.effectiveGroups
        : (member.groups && member.groups.length > 0)
        ? member.groups
        : member.effectiveGroup
        ? [member.effectiveGroup]
        : member.group
        ? [member.group]
        : [];
      const assignedLevels = assignedGroups.map((g) => g.level);

      let formulaStr = "";
      let calculatedPrice = 0;

      if (tariffFrequency === assignedLevels.length && assignedLevels.length > 1) {
        const resolved = resolveMultiGroupFormula(assignedLevels);
        formulaStr = resolved.formula;
        calculatedPrice = calculateSwimPrice({
          category: member.category,
          groupTypes: assignedLevels,
          duration: tariffDuration,
        });
      } else {
        const primaryLevel = assignedLevels[0] || "G10";
        formulaStr = tariffFrequency > 1 ? `${tariffFrequency}x ${primaryLevel}` : primaryLevel;
        calculatedPrice = calculateSwimPrice({
          category: member.category,
          groupType: primaryLevel,
          duration: tariffDuration,
          frequency: tariffFrequency,
        });
      }

      await fetch(`/api/admin/swim/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formula: formulaStr,
          duration: tariffDuration,
          priceDA: calculatedPrice,
        }),
      });
      setShowTariffConfig(false);
      await loadMember();
    } finally {
      setSavingPrice(false);
    }
  }

  async function handleConfirmGroup(status: "accepted" | "proposed" = "accepted") {
    if (!member) return;
    setConfirmingGroup(true);
    try {
      await fetch(`/api/admin/swim/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupStatus: status }),
      });
      await loadMember();
    } finally {
      setConfirmingGroup(false);
    }
  }

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!member || !paymentAmount) return;
    setSubmittingPayment(true);
    try {
      const res = await fetch("/api/admin/swim/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: member.id,
          amount: parseInt(paymentAmount, 10),
          method: paymentMethod,
          notes: paymentNotes || null,
        }),
      });
      if (res.ok) {
        setShowAddPayment(false);
        setPaymentAmount("");
        setPaymentNotes("");
        await loadMember();
      }
    } finally {
      setSubmittingPayment(false);
    }
  }

  async function handleChangeGroup() {
    if (!member || selectedGroupIds.length === 0) return;
    setSavingGroup(true);
    try {
      const selectedGroupObjs = selectedGroupIds
        .map((id) => groups.find((g) => g.id === id))
        .filter(Boolean) as SwimGroupRef[];

      const selectedLevels = selectedGroupObjs.map((g) => g.level);
      const resolved = resolveMultiGroupFormula(selectedLevels);
      const calculatedPrice = calculateSwimPrice({
        category: member.category,
        groupTypes: selectedLevels,
        duration: assignDuration,
        frequency: selectedGroupIds.length,
      });

      const res = await fetch(`/api/admin/swim/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupIds: selectedGroupIds,
          groupStatus: "proposed",
          formula: resolved.formula,
          duration: assignDuration,
          priceDA: calculatedPrice,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || "Failed to change group.");
        return;
      }
      setShowChangeGroup(false);
      await loadMember();
    } finally {
      setSavingGroup(false);
    }
  }

  async function handleRemoveGroup() {
    if (!member) return;
    setSavingGroup(true);
    try {
      await fetch(`/api/admin/swim/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupIds: [] }),
      });
      await loadMember();
    } finally {
      setSavingGroup(false);
    }
  }

  async function handleRemoveSlot(slotGroupId: string) {
    if (!member) return;
    const currentIds = member.groupIds || (member.groupId ? [member.groupId] : []);
    const remainingIds = currentIds.filter((id) => id !== slotGroupId);
    setSavingGroup(true);
    try {
      const remainingGroupObjs = remainingIds
        .map((id) => groups.find((g) => g.id === id))
        .filter(Boolean) as SwimGroupRef[];
      const remainingLevels = remainingGroupObjs.map((g) => g.level);
      const resolved = resolveMultiGroupFormula(remainingLevels);
      const newPrice = remainingLevels.length > 0
        ? calculateSwimPrice({
            category: member.category,
            groupTypes: remainingLevels,
            duration: member.duration || "3m",
          })
        : 0;

      await fetch(`/api/admin/swim/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupIds: remainingIds,
          formula: remainingLevels.length > 0 ? resolved.formula : "Pending Group",
          priceDA: newPrice,
        }),
      });
      await loadMember();
    } finally {
      setSavingGroup(false);
    }
  }

  function toggleGroupSelection(groupId: string) {
    setSelectedGroupIds((prev) => {
      if (prev.includes(groupId)) {
        return prev.filter((id) => id !== groupId);
      }
      if (prev.length >= assignFrequency) {
        if (assignFrequency === 1) {
          return [groupId];
        }
        return [...prev.slice(0, assignFrequency - 1), groupId];
      }
      return [...prev, groupId];
    });
  }

  // ─── Derived values ─────────────────────────────────────────────────────────

  const totalPaid = member?.payments.reduce((s, p) => s + p.amount, 0) ?? 0;
  const priceDA = member?.priceDA ?? 0;
  const debt = Math.max(0, priceDA - totalPaid);
  const isFullyPaid = priceDA > 0 && totalPaid >= priceDA;
  const hasDebt = priceDA > 0 && debt > 0;
  const balance = priceDA - totalPaid;
  const paymentProgressPct = priceDA > 0 ? Math.min(100, Math.round((totalPaid / priceDA) * 100)) : 0;

  const filteredGroups = groups.filter((g) => {
    if (member && g.category !== member.category) return false;
    if (groupSolidFilter && !g.isSolid) return false;
    return true;
  });

  const portalUrl = `https://aqasports.com/swim/profile/${swimId}`;

  // ─── Loading / Error ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-sm text-[var(--muted)] animate-pulse">Loading swimmer profile...</div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <p className="text-[var(--muted)] text-sm">{error ?? "Swimmer not found."}</p>
          <Button variant="secondary" onClick={() => router.push("/admin/swim")}>
            Back to Swim Manager
          </Button>
        </div>
      </div>
    );
  }

  const waUrl = getWhatsAppUrl(member.phone, member.fullName);
  const assignedGroupsList: SwimGroupRef[] = (member.effectiveGroups && member.effectiveGroups.length > 0)
    ? member.effectiveGroups
    : (member.groups && member.groups.length > 0)
    ? member.groups
    : member.effectiveGroup
    ? [member.effectiveGroup]
    : member.group
    ? [member.group]
    : [];
  const hasAssignedGroups = assignedGroupsList.length > 0;
  const archivedGroupWarning = member.effectivelyUnassigned && Boolean(member.group || (member.groups && member.groups.length > 0));

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
        <Link href="/admin/swim" className="hover:text-white transition-colors">
          AQA Swim
        </Link>
        <span>/</span>
        <Link href="/admin/swim" className="hover:text-white transition-colors">
          Confirmed Swimmers
        </Link>
        <span>/</span>
        <span className="text-white font-semibold">{member.fullName}</span>
      </div>

      {/* Header */}
      <PageHeader
        title={member.fullName}
        description={
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge tone="info">{member.swimId}</Badge>
            <Badge tone="info">{categoryLabel(member.category)}</Badge>
            <Badge tone={member.paymentStatus === "paid" ? "success" : member.paymentStatus === "partial" ? "warning" : "danger"}>
              {member.paymentStatus === "paid" ? "Paid" : member.paymentStatus === "partial" ? "Partial" : "Unpaid"}
            </Badge>
            <span className="text-xs text-[var(--muted)]">{getLevelLabel(member.level)}</span>
          </div>
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => router.push("/admin/swim")}>
              Back to Swimmers
            </Button>
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 font-semibold text-xs transition-colors"
              >
                WhatsApp
              </a>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(portalUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? "Copied!" : "Copy Portal URL"}
            </Button>
            <Link
              href={portalUrl}
              target="_blank"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-white/10 transition-colors"
            >
              Open Public Profile
            </Link>
            <button
              type="button"
              onClick={() => {
                setShowDeleteModal(true);
                setDeleteError(null);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 font-semibold text-xs border border-rose-500/40 transition-colors"
            >
              Delete Profile
            </button>
          </div>
        }
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
          <div className="text-[10px] text-[var(--muted)] uppercase font-semibold mb-1">Category</div>
          <div className="text-sm font-bold text-white capitalize">{categoryLabel(member.category)}</div>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
          <div className="text-[10px] text-[var(--muted)] uppercase font-semibold mb-1">Level</div>
          <div className="text-sm font-bold text-white">{getLevelLabel(member.level)}</div>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
          <div className="text-[10px] text-[var(--muted)] uppercase font-semibold mb-1">Formula & Period</div>
          <div className="text-sm font-bold text-cyan-300 truncate">
            {member.formula || "Pending Group"} ({member.duration || "3m"})
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
          <div className="text-[10px] text-[var(--muted)] uppercase font-semibold mb-1">Ledger Balance</div>
          <div className={`text-sm font-bold ${hasDebt ? "text-rose-400" : isFullyPaid ? "text-emerald-400" : "text-slate-300"}`}>
            {hasDebt ? `Debt: ${debt.toLocaleString("fr-DZ")} DA` : isFullyPaid ? "Paid in Full" : `${priceDA.toLocaleString("fr-DZ")} DA`}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left column */}
        <div className="space-y-5">
          {/* Group Assignment Panel */}
          <Card>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Assigned Groups ({assignedGroupsList.length})
                  </span>
                  {assignedGroupsList.length > 0 && (
                    <div className="text-[11px] text-cyan-300 font-medium mt-0.5">
                      {member.formula || `${assignedGroupsList.length}x / week`}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {hasAssignedGroups && member.groupStatus !== "accepted" && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleConfirmGroup("accepted")}
                      disabled={confirmingGroup}
                    >
                      {confirmingGroup ? "Confirming..." : "Confirm Groups"}
                    </Button>
                  )}
                  {hasAssignedGroups && (
                    <Button size="sm" variant="danger" onClick={handleRemoveGroup} disabled={savingGroup}>
                      Remove All
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => setShowChangeGroup(!showChangeGroup)}>
                    {showChangeGroup ? "Cancel" : hasAssignedGroups ? "Change / Assign Groups" : "Assign Group"}
                  </Button>
                </div>
              </div>

              {archivedGroupWarning && (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-300">
                  Warning: One or more assigned groups have been archived. This swimmer is currently considered unassigned.
                </div>
              )}

              {hasAssignedGroups ? (
                <div className="space-y-2.5">
                  {assignedGroupsList.map((grp, idx) => {
                    const isArchived = !grp.active;
                    return (
                      <div
                        key={grp.id}
                        className={`p-3 rounded-xl border space-y-1.5 text-xs ${
                          isArchived ? "bg-amber-950/30 border-amber-500/30" : "bg-slate-800/60 border-white/5"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                              Slot {idx + 1} ({assignedGroupsList.length}x / week)
                            </span>
                            <span className="font-bold text-white">{grp.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-cyan-300 font-semibold px-1.5 py-0.5 rounded bg-slate-900 border border-white/10">
                              {grp.level}
                            </span>
                            {assignedGroupsList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveSlot(grp.id)}
                                disabled={savingGroup}
                                className="text-[11px] text-rose-400 hover:text-rose-300 underline font-medium transition-colors"
                              >
                                Remove Slot
                              </button>
                            )}
                          </div>
                        </div>
                        {grp.coachName && (
                          <div className="flex justify-between">
                            <span className="text-[var(--muted)]">Coach:</span>
                            <span className="font-semibold text-cyan-300">{grp.coachName}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-[var(--muted)]">Schedule:</span>
                          <span className="text-slate-200">{grp.schedule}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--muted)]">Capacity:</span>
                          <span className="text-slate-300">
                            {grp._count?.swimmers ?? "-"}/{grp.capacity} enrolled
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Group Status & Controls */}
                  <div className="pt-2 flex items-center justify-between border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <Badge tone="info">{member.formula || "Standard"}</Badge>
                      {member.groupStatus === "accepted" && (
                        <Badge tone="success">Confirmed (No prompt)</Badge>
                      )}
                      {member.groupStatus === "proposed" && (
                        <Badge tone="warning">Pending client confirmation</Badge>
                      )}
                      {member.groupStatus === "rejected" && (
                        <Badge tone="danger">Rejected by client</Badge>
                      )}
                    </div>
                    {member.groupStatus !== "accepted" ? (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleConfirmGroup("accepted")}
                        disabled={confirmingGroup}
                      >
                        {confirmingGroup ? "Confirming..." : "Confirm All Groups"}
                      </Button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleConfirmGroup("proposed")}
                        disabled={confirmingGroup}
                        className="text-[11px] text-slate-400 hover:text-amber-300 transition-colors"
                      >
                        Reset to Pending
                      </button>
                    )}
                  </div>
                </div>
              ) : !archivedGroupWarning ? (
                <p className="text-xs italic text-[var(--muted)]">No active training groups assigned yet.</p>
              ) : null}

              {/* Change Group Panel */}
              {showChangeGroup && (
                <div className="space-y-3 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">
                      Select Training Groups ({selectedGroupIds.length}/{assignFrequency} Selected)
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={groupSolidFilter}
                        onChange={(e) => setGroupSolidFilter(e.target.checked)}
                        className="h-3.5 w-3.5 accent-cyan-500 rounded"
                      />
                      Solid Groups Only
                    </label>
                  </div>

                  {/* Frequency & Duration selection */}
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-900/80 border border-white/5">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Weekly Frequency</label>
                      <select
                        value={assignFrequency}
                        onChange={(e) => {
                          const freq = parseInt(e.target.value, 10);
                          setAssignFrequency(freq);
                          if (selectedGroupIds.length > freq) {
                            setSelectedGroupIds((prev) => prev.slice(0, freq));
                          }
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                      >
                        <option value={1}>1x / week (1 group slot)</option>
                        <option value={2}>2x / week (2 group slots)</option>
                        {member.category === "homme" && <option value={3}>3x / week (3 group slots)</option>}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Duration</label>
                      <select
                        value={assignDuration}
                        onChange={(e) => setAssignDuration(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                      >
                        <option value="1m">1 Month (Starter)</option>
                        <option value="3m">3 Months (Trimestre)</option>
                        <option value="6m">6 Months (Semestre)</option>
                        <option value="9m">9 Months (Annual)</option>
                      </select>
                    </div>
                  </div>

                  {/* Visual slot indicator */}
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-1.5">
                    <div className="text-[11px] text-[var(--muted)] font-semibold uppercase tracking-wider">
                      Assignment Slots ({selectedGroupIds.length}/{assignFrequency}):
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {Array.from({ length: assignFrequency }).map((_, slotIdx) => {
                        const slotGroupId = selectedGroupIds[slotIdx];
                        const slotGroup = slotGroupId ? groups.find((g) => g.id === slotGroupId) : null;
                        return (
                          <div
                            key={slotIdx}
                            className={`p-2 rounded-lg text-xs flex items-center justify-between border ${
                              slotGroup
                                ? "bg-cyan-950/40 border-cyan-500/40 text-cyan-200"
                                : "bg-slate-900 border-white/5 text-slate-400 border-dashed"
                            }`}
                          >
                            <div className="truncate pr-2">
                              <span className="font-bold mr-1.5 text-white">Slot {slotIdx + 1}:</span>
                              {slotGroup ? (
                                <span>{slotGroup.name} ({slotGroup.level})</span>
                              ) : (
                                <span className="italic text-slate-500">Click a group below</span>
                              )}
                            </div>
                            {slotGroup && (
                              <button
                                type="button"
                                onClick={() => toggleGroupSelection(slotGroup.id)}
                                className="text-slate-400 hover:text-rose-300 font-bold px-1 text-xs"
                                title="Remove from selection"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                    {filteredGroups.length === 0 ? (
                      <p className="text-xs text-[var(--muted)] italic">
                        No groups available for category &quot;{member.category}&quot;.
                      </p>
                    ) : (
                      filteredGroups.map((g) => {
                        const isSelected = selectedGroupIds.includes(g.id);
                        const slotIndex = selectedGroupIds.indexOf(g.id);
                        const enrolled = g._count?.swimmers ?? 0;
                        const isCurrentlyAssigned = (member.groupIds || []).includes(g.id) || member.groupId === g.id;
                        const effectiveEnrolled = isCurrentlyAssigned ? Math.max(0, enrolled - 1) : enrolled;
                        const isFull = effectiveEnrolled >= g.capacity && !isSelected;

                        return (
                          <div
                            key={g.id}
                            onClick={() => toggleGroupSelection(g.id)}
                            className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                              isSelected
                                ? "border-cyan-400 bg-cyan-950/50 shadow-[0_0_12px_rgba(0,242,255,0.15)]"
                                : isFull
                                ? "border-rose-900/50 bg-slate-800/20 opacity-60 hover:opacity-80"
                                : "border-white/10 bg-slate-800/40 hover:border-white/20 hover:bg-slate-800/60"
                            }`}
                          >
                            <div className="flex items-center justify-center w-6 h-6 rounded-md border border-white/20 text-xs font-bold shrink-0">
                              {isSelected ? (
                                <span className="text-cyan-300 font-mono text-xs">#{slotIndex + 1}</span>
                              ) : (
                                <span className="text-slate-500 font-mono text-xs">+</span>
                              )}
                            </div>
                            <div className="flex-1 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-white">{g.name}</span>
                                <div className="flex items-center gap-1.5">
                                  {isSelected && (
                                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                                      Slot {slotIndex + 1} Selected
                                    </span>
                                  )}
                                  <span className="text-[10px] font-mono text-cyan-300 font-semibold">{g.level}</span>
                                </div>
                              </div>
                              <div className="text-[var(--muted)]">
                                {g.coachName ? `Coach: ${g.coachName} · ` : ""}{g.schedule}
                              </div>
                              <div className={isFull ? "text-rose-400 font-semibold" : "text-[var(--muted)]"}>
                                {effectiveEnrolled}/{g.capacity} enrolled {isFull ? "- FULL" : ""}
                              </div>
                            </div>
                            {g.isSolid && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-400 border border-emerald-800/50 font-bold">
                                Solid
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Real-time compound price calculation preview */}
                  {selectedGroupIds.length > 0 && (
                    <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[var(--muted)]">Calculated Tariff (AQA Official):</span>
                        <div className="font-bold text-cyan-300 text-sm mt-0.5">
                          {(() => {
                            const selectedObjs = selectedGroupIds
                              .map((id) => groups.find((g) => g.id === id))
                              .filter(Boolean) as SwimGroupRef[];
                            const levels = selectedObjs.map((g) => g.level);
                            return calculateSwimPrice({
                              category: member.category,
                              groupTypes: levels,
                              duration: assignDuration,
                              frequency: selectedGroupIds.length,
                            }).toLocaleString("fr-DZ");
                          })()} DA
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <Badge tone="info">
                          {(() => {
                            const selectedObjs = selectedGroupIds
                              .map((id) => groups.find((g) => g.id === id))
                              .filter(Boolean) as SwimGroupRef[];
                            const levels = selectedObjs.map((g) => g.level);
                            return resolveMultiGroupFormula(levels).formula;
                          })()} · {assignDuration}
                        </Badge>
                        <div className="text-[10px] text-slate-400">
                          {selectedGroupIds.length} of {assignFrequency} slot(s) filled
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={selectedGroupIds.length === 0 || savingGroup}
                      onClick={handleChangeGroup}
                    >
                      {savingGroup
                        ? "Saving & Calculating..."
                        : `Confirm Assignment & Set Tariff (${(() => {
                            const selectedObjs = selectedGroupIds
                              .map((id) => groups.find((g) => g.id === id))
                              .filter(Boolean) as SwimGroupRef[];
                            const levels = selectedObjs.map((g) => g.level);
                            return calculateSwimPrice({
                              category: member.category,
                              groupTypes: levels,
                              duration: assignDuration,
                              frequency: selectedGroupIds.length,
                            }).toLocaleString("fr-DZ");
                          })()} DA)`}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setShowChangeGroup(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Coach Message */}
          <Card>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">Word From Your Coach</span>
                {!editingCoachMsg && (
                  <button
                    onClick={() => { setEditingCoachMsg(true); setCoachMsgText(member.coachMessage || ""); }}
                    className="text-[11px] text-cyan-400 hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>
              {editingCoachMsg ? (
                <div className="space-y-2">
                  <textarea
                    value={coachMsgText}
                    onChange={(e) => setCoachMsgText(e.target.value)}
                    rows={3}
                    placeholder="Personal note for the swimmer's portal..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  />
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => setEditingCoachMsg(false)}>Cancel</Button>
                    <Button type="button" variant="primary" size="sm" disabled={savingCoachMsg} onClick={handleSaveCoachMsg}>
                      {savingCoachMsg ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs italic text-slate-200 leading-relaxed">
                  {member.coachMessage ? `"${member.coachMessage}"` : "No coach note added yet."}
                </p>
              )}
            </div>
          </Card>

          {/* PVC Pass Card with 3D Flip */}
          <Card>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">PVC Pass Card</span>
                {member.card && (
                  <Badge tone={member.card.status === "active" ? "success" : "danger"}>
                    {member.card.status}
                  </Badge>
                )}
              </div>

              {/* Real Card with 3D Flip Motion */}
              <SwimFlipCard member={member} qrDataUrl={cardQrDataUrl} />

              {/* Card Actions & Print */}
              <div className="space-y-2 pt-2 border-t border-white/5 text-xs">
                {member.card && (
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Card Code:</span>
                    <span className="font-mono font-bold text-cyan-300">{member.card.cardCode}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setShowPrintModal(true)}
                    className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 text-xs font-semibold border border-cyan-500/40 transition-colors shadow-[0_0_12px_rgba(0,242,255,0.12)] active:scale-[0.98]"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <span>{t("swimPvcPrint.btnLabel")}</span>
                  </button>

                  {member.card ? (
                    <Link
                      href={`/swim/card/${member.card.publicToken}`}
                      target="_blank"
                      className="inline-flex items-center justify-center py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold border border-white/10 transition-colors text-center truncate"
                    >
                      Open Public Pass
                    </Link>
                  ) : (
                    <Link
                      href={portalUrl}
                      target="_blank"
                      className="inline-flex items-center justify-center py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-white/10 transition-colors text-center truncate"
                    >
                      Open Profile
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Financial Ledger */}
          <Card>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Financial Ledger</span>
                  <div className="text-[11px] text-[var(--muted)] mt-0.5">
                    Tariff: {priceDA.toLocaleString("fr-DZ")} DA · Paid: {totalPaid.toLocaleString("fr-DZ")} DA · {hasDebt ? `Debt: ${debt.toLocaleString("fr-DZ")} DA` : `Balance: 0 DA`}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setShowTariffConfig(!showTariffConfig)}>
                    {showTariffConfig ? "Cancel" : "Tariff Plan"}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setShowSetPrice(!showSetPrice)}>
                    Manual Price
                  </Button>
                  <Button size="sm" variant="primary" onClick={() => setShowAddPayment(!showAddPayment)}>
                    + Payment
                  </Button>
                </div>
              </div>

              {/* Official Tariff Configurator inline */}
              {showTariffConfig && (
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300">Set Tariff from Official AQA Pricing</span>
                    <span className="text-[10px] text-[var(--muted)]">Calculates automatically</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Frequency</label>
                      <select
                        value={tariffFrequency}
                        onChange={(e) => setTariffFrequency(parseInt(e.target.value, 10))}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                      >
                        <option value={1}>1x / week</option>
                        <option value={2}>2x / week</option>
                        {member.category === "homme" && <option value={3}>3x / week</option>}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Duration</label>
                      <select
                        value={tariffDuration}
                        onChange={(e) => setTariffDuration(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                      >
                        <option value="1m">1 Month (Starter)</option>
                        <option value="3m">3 Months (Silver)</option>
                        <option value="6m">6 Months (Gold)</option>
                        <option value="9m">9 Months (Diamond)</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-white/10">
                    <div>
                      <span className="text-[11px] text-slate-400">Tariff: </span>
                      <span className="font-bold text-cyan-300 font-mono text-sm">
                        {(() => {
                          const assignedLevels = (member.effectiveGroups && member.effectiveGroups.length > 0)
                            ? member.effectiveGroups.map((g) => g.level)
                            : (member.groups && member.groups.length > 0)
                            ? member.groups.map((g) => g.level)
                            : [member.effectiveGroup?.level || member.group?.level || "G10"];
                          if (tariffFrequency === assignedLevels.length && assignedLevels.length > 1) {
                            return calculateSwimPrice({
                              category: member.category,
                              groupTypes: assignedLevels,
                              duration: tariffDuration,
                            }).toLocaleString("fr-DZ");
                          }
                          return calculateSwimPrice({
                            category: member.category,
                            groupType: assignedLevels[0] || "G10",
                            duration: tariffDuration,
                            frequency: tariffFrequency,
                          }).toLocaleString("fr-DZ");
                        })()} DA
                      </span>
                    </div>
                    <Button variant="primary" size="sm" disabled={savingPrice} onClick={handleApplyTariff}>
                      {savingPrice ? "Saving..." : "Apply Tariff"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Debt / Payment Status Banner */}
              {hasDebt ? (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-xs font-black uppercase tracking-wide">
                        Debt Outstanding / Reste a payer
                      </span>
                    </div>
                    <span className="text-sm font-mono font-black text-rose-400">
                      {debt.toLocaleString("fr-DZ")} DA
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-rose-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${paymentProgressPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Paid: {totalPaid.toLocaleString("fr-DZ")} DA ({paymentProgressPct}%)</span>
                    <span>Total Due: {priceDA.toLocaleString("fr-DZ")} DA</span>
                  </div>
                </div>
              ) : isFullyPaid ? (
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="text-xs font-black uppercase tracking-wide">
                      Payment Complete / A Jour
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-mono font-black text-emerald-400">
                      {totalPaid.toLocaleString("fr-DZ")} DA
                    </span>
                    <div className="text-[10px] text-emerald-400/80 font-mono">0 DA Debt</div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-white/10 text-xs text-slate-400 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-300">No subscription tariff assigned yet.</span>
                    <p className="text-[11px] text-[var(--muted)] mt-0.5">Select a duration & frequency to calculate price automatically.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="primary" onClick={() => setShowTariffConfig(true)}>
                      Set Tariff Plan
                    </Button>
                  </div>
                </div>
              )}

              {/* Set Price inline */}
              {showSetPrice && (
                <div className="p-3 rounded-xl bg-slate-800/60 border border-white/5 space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">Subscription Price (DA)</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={newPriceInput}
                      onChange={(e) => setNewPriceInput(e.target.value)}
                      placeholder="e.g. 21900"
                    />
                    <Button variant="primary" size="sm" disabled={savingPrice} onClick={handleSavePrice}>
                      {savingPrice ? "Saving..." : "Save"}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setShowSetPrice(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              {/* Add Payment inline */}
              {showAddPayment && (
                <form onSubmit={handleAddPayment} className="p-3 rounded-xl bg-slate-800/60 border border-white/5 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Amount (DA) *</label>
                      <Input
                        type="number"
                        required
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="e.g. 21900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Method</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                      >
                        <option value="cash">Cash</option>
                        <option value="baridi_mob">Baridi Mob / CCP</option>
                        <option value="virement">Virement Bancaire</option>
                        <option value="cheque">Cheque</option>
                      </select>
                    </div>
                  </div>
                  <Input
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Receipt note (optional)"
                  />
                  <div className="flex gap-2">
                    <Button type="submit" variant="primary" size="sm" disabled={submittingPayment}>
                      {submittingPayment ? "Recording..." : "Confirm Payment"}
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setShowAddPayment(false)}>Cancel</Button>
                  </div>
                </form>
              )}

              {/* Payment History */}
              {member.payments.length > 0 ? (
                <div className="divide-y divide-white/5 max-h-48 overflow-y-auto">
                  {member.payments.map((p) => (
                    <div key={p.id} className="py-2 flex items-center justify-between text-xs font-mono">
                      <div>
                        <span className="text-emerald-400 font-bold">+{p.amount.toLocaleString("fr-DZ")} DA</span>
                        <span className="text-[var(--muted)] ml-2 capitalize">({paymentMethodLabel(p.method)})</span>
                        {p.notes && <span className="text-slate-500 ml-2">- {p.notes}</span>}
                      </div>
                      <span className="text-[var(--muted)] text-[11px]">
                        {new Date(p.paidAt).toLocaleDateString("fr-DZ")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs italic text-[var(--muted)]">No payment receipts logged yet.</p>
              )}
            </div>
          </Card>

          {/* Edit Profile Panel */}
          <Card>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Swimmer Profile</span>
                <Button size="sm" variant="secondary" onClick={() => setShowEditPanel(!showEditPanel)}>
                  {showEditPanel ? "Cancel" : "Edit Profile"}
                </Button>
              </div>

              {!showEditPanel ? (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[var(--muted)]">Phone:</span>
                    <span className="ml-2 font-mono text-cyan-400">{member.phone || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)]">Email:</span>
                    <span className="ml-2 text-slate-200">{member.email || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)]">Start Date:</span>
                    <span className="ml-2 font-mono text-slate-200">
                      {new Date(member.dateOfStart).toLocaleDateString("fr-DZ")}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)]">Member since:</span>
                    <span className="ml-2 font-mono text-slate-200">
                      {new Date(member.createdAt).toLocaleDateString("fr-DZ")}
                    </span>
                  </div>
                  {member.notes && (
                    <div className="col-span-2">
                      <span className="text-[var(--muted)]">Notes:</span>
                      <span className="ml-2 text-slate-300 italic">{member.notes}</span>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSaveEdit} className="space-y-3">
                  {editError && (
                    <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300">{editError}</div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Full Name *</label>
                      <Input required value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Phone</label>
                      <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="0661234567" />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Email</label>
                      <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Photo URL</label>
                      <Input value={editPhotoUrl} onChange={(e) => setEditPhotoUrl(e.target.value)} placeholder="https://..." />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Category</label>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                      >
                        <option value="homme">Homme</option>
                        <option value="femme">Femme</option>
                        <option value="enfants">Enfants</option>
                        <option value="apnea">Apnee</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Level</label>
                      <select
                        value={editLevel}
                        onChange={(e) => setEditLevel(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                      >
                        <option value="new_aqa">New AQA Member</option>
                        <option value="old_aqa">Old AQA Member</option>
                        {!["new_aqa", "old_aqa"].includes(editLevel) && (
                          <option value={editLevel}>{getLevelLabel(editLevel)} (legacy)</option>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Date of Start</label>
                      <Input type="date" value={editDateOfStart} onChange={(e) => setEditDateOfStart(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Notes</label>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" variant="primary" size="sm" disabled={savingEdit}>
                      {savingEdit ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setShowEditPanel(false)}>Cancel</Button>
                  </div>
                </form>
              )}
            </div>
          </Card>

          {/* Reinscription & Call Observation Card */}
          <Card>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Reinscription Calls & Observations
                  </span>
                  <div className="text-[11px] text-[var(--muted)] mt-0.5">
                    Renewal follow-ups, client feedback, and scheduled callbacks.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => router.push(`/admin/swim/calls?q=${encodeURIComponent(member.fullName)}`)}
                  >
                    Open in Call Desk
                  </Button>
                </div>
              </div>

              {member.notes ? (
                <div className="p-3 rounded-xl bg-slate-950 border border-[var(--border)] text-xs space-y-1.5 max-h-48 overflow-y-auto">
                  {member.notes.split("\n").map((line, idx) => (
                    <p key={idx} className="text-slate-300 font-mono text-[11px] leading-relaxed">
                      {line}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--muted)] italic">
                  No call observations logged yet. Open the Call Desk to record interactions.
                </p>
              )}
            </div>
          </Card>

          {/* Danger Zone */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-rose-500/20 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-display">
                  Danger Zone
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Permanently delete this swimmer profile from the database. Unassigns from group and voids any issued pass card. Useful for eliminating duplicates.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(true);
                  setDeleteError(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 font-semibold text-xs border border-rose-500/40 transition-colors"
              >
                Delete Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>

            <div>
              <h3 className="text-base font-bold text-white font-display">
                Delete Swimmer Profile
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-white">{member.fullName}</strong> ({member.swimId})?
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                This action will delete the profile, unassign them from {member.group?.name || "their group"}, and remove any duplicate records. This operation cannot be reversed.
              </p>
            </div>

            {deleteError && (
              <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteProfile}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Yes, Delete Swimmer Profile"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* PVC Pass Card Print Dialog */}
      {showPrintModal && member && (
        <SwimPvcPrintDialog
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          member={member}
          qrDataUrl={cardQrDataUrl}
        />
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader, StatCard, Card, Badge, Button, Input } from "@/components/admin/ui";
import dynamic from "next/dynamic";
import { CallsErrorBoundary } from "@/components/admin/swim/calls/CallsErrorBoundary";
import {
  FRENCH_DAYS,
  SWIM_TIME_SLOTS,
  getSwimLevelLabel,
  parseScheduleSlots,
} from "@/lib/swim-groups";
import {
  parseSwimLeadNotes,
  cleanLeadNotesDisplay,
  formatSwimLeadNotes,
  SwimLeadDetails,
  EQUIPMENT_ARTICLES,
  EquipmentArticleId,
  getArticleLabel,
  getArticleShortLabel,
} from "@/lib/swim-lead-details";
import {
  calculateSwimPrice,
  SwimCategory,
  SwimDuration,
  SwimFrequency,
} from "@/lib/swim-pricing";
import {
  getEffectiveSubscriptionStart,
  computeSubscriptionEnd,
  subscriptionDaysLeft,
  getSubscriptionStatus,
  isSubscriptionExpiringSoon,
  DEFAULT_EXCLUDED_PERIODS,
  type ExcludedPeriod,
} from "@/lib/swim-subscription";
import { getSwimRenewalWhatsAppUrl } from "@/lib/swim-whatsapp";
import { SwimBackupDesk } from "@/components/admin/swim/backup/SwimBackupDesk";

function formatDA(amount: number): string {
  return `${amount.toLocaleString("fr-DZ")} DA`;
}

const SwimCallsDesk = dynamic(
  () => import("@/components/admin/swim/calls/SwimCallsDesk").then((mod) => mod.SwimCallsDesk),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-sm text-slate-400 animate-pulse">Loading Reinscription Call Desk...</div>
      </div>
    ),
  }
);

interface SwimPaymentItem {
  id: string;
  amount: number;
  method: string;
  notes: string | null;
  paidAt: string;
}

interface SwimMember {
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
  groupId: string | null;
  group: {
    id: string;
    name: string;
    coachName: string | null;
    schedule: string;
    level?: string;
    category?: string;
    active?: boolean;
  } | null;
  effectiveGroup?: {
    id: string;
    name: string;
    coachName: string | null;
    schedule: string;
    level?: string;
    category?: string;
    active?: boolean;
  } | null;
  effectivelyUnassigned?: boolean;
  card: {
    id: string;
    cardCode: string;
    publicToken: string;
    status: string;
  } | null;
  payments: SwimPaymentItem[];
}

interface SwimLead {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  category: string;
  level: string;
  frequency: string;
  formula: string;
  duration: string;
  preferredDays: string | null;
  notes: string | null;
  status: "pending" | "called" | "confirmed" | "rejected";
  createdAt: string;
  details?: SwimLeadDetails;
}

interface SwimGroup {
  id: string;
  name: string;
  category: string;
  level: string;
  coachName: string | null;
  schedule: string;
  capacity: number;
  active: boolean;
  notes: string | null;
  isSolid?: boolean;
  cleanNotes?: string;
  _count?: {
    swimmers: number;
  };
}

interface SwimCardItem {
  id: string;
  cardCode: string;
  publicToken: string;
  status: string;
  memberId: string | null;
  member?: {
    fullName: string;
    swimId: string;
  } | null;
}

export default function SwimOverviewPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"confirmed" | "leads" | "groups" | "calendar" | "cards" | "sectors" | "calls" | "payments" | "backups">("confirmed");
  const [loading, setLoading] = useState(true);

  // Delete Swimmer Modal State (for cleaning duplicated profiles)
  const [deleteSwimmerTarget, setDeleteSwimmerTarget] = useState<SwimMember | null>(null);
  const [deletingSwimmer, setDeletingSwimmer] = useState(false);
  const [deleteSwimmerError, setDeleteSwimmerError] = useState<string | null>(null);

  // Sync tab from URL search param if present (e.g. ?tab=calls)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (
        tabParam === "confirmed" ||
        tabParam === "leads" ||
        tabParam === "groups" ||
        tabParam === "calendar" ||
        tabParam === "cards" ||
        tabParam === "sectors" ||
        tabParam === "calls" ||
        tabParam === "payments" ||
        tabParam === "backups"
      ) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  // Data States
  const [members, setMembers] = useState<SwimMember[]>([]);
  const [leads, setLeads] = useState<SwimLead[]>([]);
  const [groups, setGroups] = useState<SwimGroup[]>([]);
  const [cards, setCards] = useState<SwimCardItem[]>([]);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>("pending");

  // Groups Tab Category Filter
  const [groupsCategoryFilter, setGroupsCategoryFilter] = useState("all");

  // Coach Calendar Filters
  const [calendarCoachFilter, setCalendarCoachFilter] = useState("all");
  const [calendarCategoryFilter, setCalendarCategoryFilter] = useState("all");

  // Add Member Modal
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [dateOfStart, setDateOfStart] = useState(new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState<string>("homme");
  const [level, setLevel] = useState("new_aqa");
  const [groupId, setGroupId] = useState("");
  const [showSolidOnlyAdd, setShowSolidOnlyAdd] = useState(false);
  const [coachMessage, setCoachMessage] = useState("");
  const [notes, setNotes] = useState("");
  const [whatsappField, setWhatsappField] = useState("");
  const [issueCard, setIssueCard] = useState(true);
  const [cardCode, setCardCode] = useState("");
  const [submittingAddMember, setSubmittingAddMember] = useState(false);
  const [addMemberSuccess, setAddMemberSuccess] = useState<string | null>(null);

  // Quick Payment Modal
  const [payingMember, setPayingMember] = useState<SwimMember | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Payments Tab State
  const [paymentsFilter, setPaymentsFilter] = useState<"all" | "paid" | "partial" | "unpaid" | "expiring">("all");
  const [paymentsSearch, setPaymentsSearch] = useState("");
  const [savingSubStart, setSavingSubStart] = useState<string | null>(null); // memberId being saved
  const [editingSubStart, setEditingSubStart] = useState<Record<string, string>>({}); // memberId -> date string
  const [excludedPeriods, setExcludedPeriods] = useState<ExcludedPeriod[]>(DEFAULT_EXCLUDED_PERIODS);
  const [showExclusionEditor, setShowExclusionEditor] = useState(false);

  // Promote Lead Modal
  const [promotingLead, setPromotingLead] = useState<SwimLead | null>(null);
  const [promoteGroupId, setPromoteGroupId] = useState("");
  const [showSolidOnlyPromote, setShowSolidOnlyPromote] = useState(false);
  const [promoteCoachMessage, setPromoteCoachMessage] = useState("");
  const [promoteIssueCard, setPromoteIssueCard] = useState(true);
  const [promoteCardCode, setPromoteCardCode] = useState("");
  const [submittingPromote, setSubmittingPromote] = useState(false);

  // Quick Add Lead Modal
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [newLeadFullName, setNewLeadFullName] = useState("");
  const [newLeadPhone, setNewLeadPhone] = useState("");
  const [newLeadEmail, setNewLeadEmail] = useState("");
  const [newLeadCategory, setNewLeadCategory] = useState("homme");
  const [newLeadLevel, setNewLeadLevel] = useState("new_aqa");
  const [newLeadPreferredDays, setNewLeadPreferredDays] = useState("");
  const [newLeadNotes, setNewLeadNotes] = useState("");
  const [submittingAddLead, setSubmittingAddLead] = useState(false);

  // Lead Inspection Drawer
  const [selectedLeadForInspection, setSelectedLeadForInspection] = useState<SwimLead | null>(null);
  const [editingLeadNotes, setEditingLeadNotes] = useState("");
  const [savingLeadNotes, setSavingLeadNotes] = useState(false);
  const [saveLeadSuccessMsg, setSaveLeadSuccessMsg] = useState<string | null>(null);

  function openLeadInspector(lead: SwimLead) {
    const freshDetails = lead.details || parseSwimLeadNotes(lead.notes);
    setSelectedLeadForInspection({ ...lead, details: freshDetails });
    setEditingLeadNotes(freshDetails.userNotes ?? cleanLeadNotesDisplay(lead.notes));
    setSaveLeadSuccessMsg(null);
  }

  function closeLeadInspector() {
    setSelectedLeadForInspection(null);
    setSaveLeadSuccessMsg(null);
  }

  async function handleSaveLeadNotes() {
    if (!selectedLeadForInspection) return;
    setSavingLeadNotes(true);
    try {
      const currentDetails = selectedLeadForInspection.details || parseSwimLeadNotes(selectedLeadForInspection.notes);
      const updatedNotes = formatSwimLeadNotes({
        equipment: currentDetails.equipment,
        demographics: currentDetails.demographics,
        userNotes: editingLeadNotes.trim(),
      });

      const res = await fetch(`/api/admin/swim/leads/${selectedLeadForInspection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: updatedNotes }),
      });

      if (res.ok) {
        setSaveLeadSuccessMsg("Notes enregistrees avec succes.");
        await loadAllData();
        setTimeout(() => setSaveLeadSuccessMsg(null), 3000);
      }
    } catch (err) {
      console.error("Failed to save lead notes:", err);
    } finally {
      setSavingLeadNotes(false);
    }
  }

  async function loadAllData() {
    setLoading(true);
    try {
      const [memsRes, leadsRes, grpsRes, cardsRes] = await Promise.all([
        fetch("/api/admin/swim/members?includePayments=true"),
        fetch("/api/admin/swim/leads?status=all"),
        fetch("/api/admin/swim/groups"),
        fetch("/api/admin/swim/cards?filter=all"),
      ]);

      if (memsRes.ok) setMembers(await memsRes.json());
      if (leadsRes.ok) {
        const rawLeads: SwimLead[] = await leadsRes.json();
        const augmented: SwimLead[] = Array.isArray(rawLeads)
          ? rawLeads.map((l) => ({
              ...l,
              details: l.details || parseSwimLeadNotes(l.notes),
            }))
          : [];
        setLeads(augmented);

        if (selectedLeadForInspection) {
          const fresh = augmented.find((l) => l.id === selectedLeadForInspection.id);
          if (fresh) {
            setSelectedLeadForInspection(fresh);
            setEditingLeadNotes(fresh.details?.userNotes ?? cleanLeadNotesDisplay(fresh.notes));
          }
        }
      }
      if (grpsRes.ok) setGroups(await grpsRes.json());
      if (cardsRes.ok) setCards(await cardsRes.json());
    } catch (err) {
      console.error("Failed to load swim manager data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAllData();
  }, []);

  async function handleDeleteSwimmer() {
    if (!deleteSwimmerTarget) return;
    setDeletingSwimmer(true);
    setDeleteSwimmerError(null);
    try {
      const res = await fetch(`/api/admin/swim/members/${deleteSwimmerTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete swimmer");
      }
      setDeleteSwimmerTarget(null);
      await loadAllData();
    } catch (err: unknown) {
      setDeleteSwimmerError(err instanceof Error ? err.message : "Failed to delete swimmer");
    } finally {
      setDeletingSwimmer(false);
    }
  }

  // Filtered Members
  const filteredMembers = useMemo(() => {
    if (!Array.isArray(members)) return [];
    return members.filter((m) => {
      if (!m) return false;
      const q = (searchTerm || "").toLowerCase().trim();
      const matchSearch =
        !q ||
        (m.fullName && m.fullName.toLowerCase().includes(q)) ||
        (m.phone && m.phone.includes(q)) ||
        (m.swimId && m.swimId.toLowerCase().includes(q)) ||
        (m.card?.cardCode && m.card.cardCode.toLowerCase().includes(q)) ||
        (m.group?.name && m.group.name.toLowerCase().includes(q));

      const matchLevel =
        levelFilter === "all" ||
        m.level === levelFilter ||
        (levelFilter === "new_aqa" && m.level === "beginner") ||
        (levelFilter === "old_aqa" && (m.level === "intermediate" || m.level === "advanced"));

      const matchCategory = categoryFilter === "all" || m.category === categoryFilter;
      const matchPayment = paymentFilter === "all" || m.paymentStatus === paymentFilter;

      return matchSearch && matchLevel && matchCategory && matchPayment;
    });
  }, [members, searchTerm, levelFilter, categoryFilter, paymentFilter]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    if (!Array.isArray(leads)) return [];
    return leads.filter((l) => {
      if (!l) return false;
      const matchStatus = leadStatusFilter === "all" || l.status === leadStatusFilter;
      if (!matchStatus) return false;
      const q = (searchTerm || "").toLowerCase().trim();
      if (!q) return true;
      return (
        (l.fullName && l.fullName.toLowerCase().includes(q)) ||
        (l.phone && l.phone.includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q))
      );
    });
  }, [leads, leadStatusFilter, searchTerm]);

  // Financial calculations
  const totalRevenueExpected = Array.isArray(members)
    ? members.reduce((sum, m) => sum + (m?.priceDA || 0), 0)
    : 0;
  const totalRevenueCollected = Array.isArray(members)
    ? members.reduce(
        (sum, m) =>
          sum +
          (m?.payments && Array.isArray(m.payments)
            ? m.payments.reduce((pSum, p) => pSum + (p?.amount || 0), 0)
            : 0),
        0
      )
    : 0;
  const pendingLeadsCount = Array.isArray(leads)
    ? leads.filter((l) => l?.status === "pending").length
    : 0;

  // Payments tab: enrich each member with subscription dates and totals
  const enrichedPaymentsMembers = useMemo(() => {
    if (!Array.isArray(members)) return [];
    return members.map((m) => {
      const totalPaid = Array.isArray(m.payments)
        ? m.payments.reduce((s, p) => s + (p?.amount || 0), 0)
        : 0;
      const debt = Math.max(0, m.priceDA - totalPaid);
      const subStart = getEffectiveSubscriptionStart(m.dateOfStart);
      const subEnd = computeSubscriptionEnd(subStart, m.duration, excludedPeriods);
      const daysLeft = subscriptionDaysLeft(subEnd);
      const subStatus = getSubscriptionStatus(subEnd);
      const expiringSoon = isSubscriptionExpiringSoon(subEnd, 14);
      return { ...m, totalPaid, debt, subStart, subEnd, daysLeft, subStatus, expiringSoon };
    });
  }, [members, excludedPeriods]);

  const filteredPaymentsMembers = useMemo(() => {
    return enrichedPaymentsMembers.filter((m) => {
      const q = paymentsSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        m.fullName.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        m.swimId.toLowerCase().includes(q);
      const matchFilter =
        paymentsFilter === "all" ||
        (paymentsFilter === "expiring" && m.expiringSoon) ||
        m.paymentStatus === paymentsFilter;
      return matchSearch && matchFilter;
    });
  }, [enrichedPaymentsMembers, paymentsSearch, paymentsFilter]);

  const totalOutstanding = enrichedPaymentsMembers.reduce((s, m) => s + m.debt, 0);
  const expiringCount = enrichedPaymentsMembers.filter((m) => m.expiringSoon).length;

  // Save a manually overridden subscription start for a member
  async function handleSaveSubStart(memberId: string) {
    const rawDate = editingSubStart[memberId];
    if (!rawDate) return;
    setSavingSubStart(memberId);
    try {
      const res = await fetch("/api/admin/swim/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, subscriptionStart: rawDate }),
      });
      if (res.ok) {
        await loadAllData();
        setEditingSubStart((prev) => {
          const next = { ...prev };
          delete next[memberId];
          return next;
        });
      }
    } catch (err) {
      console.error("Failed to save subscription start:", err);
    } finally {
      setSavingSubStart(null);
    }
  }

  // Active coaches for calendar
  const activeCoaches = useMemo(() => {
    const names = new Set<string>();
    groups.forEach((g) => {
      if (g.coachName) names.add(g.coachName);
    });
    return Array.from(names).sort();
  }, [groups]);

  // Calendar filtered groups
  const calendarGroups = useMemo(() => {
    return groups.filter((g) => {
      if (!g.active) return false;
      if (calendarCoachFilter !== "all" && g.coachName !== calendarCoachFilter) return false;
      if (calendarCategoryFilter !== "all" && g.category !== calendarCategoryFilter) return false;
      return true;
    });
  }, [groups, calendarCoachFilter, calendarCategoryFilter]);

  // Total weekly scheduled sessions across calendar groups (kids groups count as 2 sessions)
  const totalWeeklyCalendarSessions = useMemo(() => {
    return calendarGroups.reduce((acc, g) => {
      const slots = parseScheduleSlots(g.schedule);
      return acc + (slots.length > 0 ? slots.length : 1);
    }, 0);
  }, [calendarGroups]);

  // Helper to parse day and time from group schedule string (backward compatible wrapper)
  const parseSchedule = (schedule: string) => {
    const slots = parseScheduleSlots(schedule);
    return slots[0] || { day: "", time: "", location: "" };
  };

  // Handle Add Member Submit (Formula and Frequency computed later; no auto-price)
  async function handleAddMemberSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingAddMember(true);
    try {
      const res = await fetch("/api/admin/swim/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone,
          whatsapp: whatsappField || null,
          email,
          photoUrl,
          dateOfStart,
          category,
          level,
          formula: "G10",
          duration: "3m",
          priceDA: 0,
          groupId: groupId || null,
          coachMessage,
          notes,
          issueCard,
          cardCode,
        }),
      });

      if (res.ok) {
        const newMember = await res.json();
        setAddMemberSuccess(`Swimmer registered successfully! ID: ${newMember.swimId}`);
        setTimeout(() => {
          setAddMemberSuccess(null);
          setShowAddMemberModal(false);
          setFullName("");
          setPhone("");
          setWhatsappField("");
          setEmail("");
          setPhotoUrl("");
          setCoachMessage("");
          setNotes("");
          setCardCode("");
          setGroupId("");
          loadAllData();
        }, 1500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingAddMember(false);
    }
  }

  // Handle Add Payment
  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!payingMember) return;
    setSubmittingPayment(true);
    try {
      const res = await fetch("/api/admin/swim/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: payingMember.id,
          amount: paymentAmount,
          method: paymentMethod,
          notes: paymentNotes,
        }),
      });

      if (res.ok) {
        setPayingMember(null);
        setPaymentAmount("");
        setPaymentNotes("");
        await loadAllData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingPayment(false);
    }
  }

  // Handle Lead Status Change
  async function handleUpdateLeadStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/admin/swim/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Handle Promote Lead to Confirmed Member
  async function handlePromoteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!promotingLead) return;
    setSubmittingPromote(true);

    try {
      const res = await fetch("/api/admin/swim/leads/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: promotingLead.id,
          groupId: promoteGroupId || null,
          coachMessage: promoteCoachMessage || null,
          issueCard: promoteIssueCard,
          cardCode: promoteCardCode || null,
        }),
      });

      if (res.ok) {
        setPromotingLead(null);
        setPromoteGroupId("");
        setPromoteCoachMessage("");
        setPromoteCardCode("");
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingPromote(false);
    }
  }

  // Handle Quick Add Lead
  async function handleAddLeadSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingAddLead(true);
    try {
      const res = await fetch("/api/admin/swim/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: newLeadFullName,
          phone: newLeadPhone,
          email: newLeadEmail,
          category: newLeadCategory,
          level: newLeadLevel,
          frequency: "1x",
          formula: "G10",
          duration: "3m",
          preferredDays: newLeadPreferredDays,
          notes: newLeadNotes,
        }),
      });

      if (res.ok) {
        setShowAddLeadModal(false);
        setNewLeadFullName("");
        setNewLeadPhone("");
        setNewLeadEmail("");
        setNewLeadNotes("");
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingAddLead(false);
    }
  }

  // Generate WhatsApp Message for Confirmed Member
  function getWhatsAppUrl(member: SwimMember) {
    if (!member.phone) return null;
    const cleanPhone = member.phone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("0") ? `213${cleanPhone.slice(1)}` : cleanPhone;
    const effectiveGrp = member.effectiveGroup || (!member.effectivelyUnassigned && member.group?.active ? member.group : null);
    const groupText = effectiveGrp ? `${effectiveGrp.name} (${effectiveGrp.schedule})` : "En attente d'affectation";
    const coachText = effectiveGrp?.coachName ? `Coach: ${effectiveGrp.coachName}` : "";
    const portalUrl = `https://aqasports.com/swim/profile/${member.swimId}`;

    const text = encodeURIComponent(
      `Salam ${member.fullName},\n\n` +
      `Votre inscription AQA Swim est confirmee.\n` +
      `Identifiant Nageur: ${member.swimId}\n` +
      `Groupe: ${groupText}\n` +
      `${coachText ? coachText + "\n" : ""}` +
      `Consultez votre profil et badge en ligne ici:\n${portalUrl}\n\n` +
      `A tres bientot au bassin!\nEquipe AQA Sports`
    );

    return `https://wa.me/${formattedPhone}?text=${text}`;
  }

  // Export Confirmed Swimmers to CSV
  function handleExportCSV() {
    const headers = [
      "Swimmer ID",
      "Full Name",
      "Phone",
      "Email",
      "Category",
      "Level",
      "Formula",
      "Duration",
      "Price DA",
      "Group",
      "Coach",
      "Payment Status",
      "Group Status",
      "Date of Start",
    ];

    const rows = filteredMembers.map((m) => {
      const effectiveGrp = m.effectiveGroup || (!m.effectivelyUnassigned && m.group?.active ? m.group : null);
      return [
        m.swimId,
        `"${m.fullName.replace(/"/g, '""')}"`,
        `"${m.phone || ""}"`,
        `"${m.email || ""}"`,
        m.category,
        getSwimLevelLabel(m.level),
        m.formula,
        m.duration || "3m",
        m.priceDA,
        `"${effectiveGrp?.name || "Unassigned"}"`,
        `"${effectiveGrp?.coachName || ""}"`,
        m.paymentStatus,
        m.groupStatus,
        new Date(m.dateOfStart).toLocaleDateString("fr-DZ"),
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `aqa_swim_members_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Operational Sectors Hub definitions
  const sectors = [
    {
      title: "1. New Clients Lead (Wait List)",
      desc: "Process wait list demands from aqasports.com. Call, assign groups, and confirm new swimmers.",
      href: "/admin/swim/leads",
      badge: pendingLeadsCount > 0 ? `${pendingLeadsCount} Pending` : "Up to date",
      badgeTone: pendingLeadsCount > 0 ? ("warning" as const) : ("success" as const),
      actionText: "Manage Leads",
    },
    {
      title: "2. Swimmer Profiles & Ledger",
      desc: "Manage confirmed profiles, solid group proposals, personal coach notes, and payment records.",
      href: "/admin/swim/members",
      badge: `${members.length} Swimmers`,
      badgeTone: "info" as const,
      actionText: "Manage Profiles",
    },
    {
      title: "3. Training Groups Manager",
      desc: "Configure weekly training time slots, coach rosters, capacity caps, and view enrolled swimmers.",
      href: "/admin/swim/groups",
      badge: `${groups.length} Groups`,
      badgeTone: "info" as const,
      actionText: "Manage Groups",
    },
    {
      title: "4. PVC Pass QR Generator",
      desc: "Generate blank PVC card batches (SWM-000001), export print sheets, and link cards to swimmers.",
      href: "/admin/swim/cards",
      badge: `${cards.length} PVC Cards`,
      badgeTone: "info" as const,
      actionText: "Generate & Print",
    },
    {
      title: "5. Reinscription & Call Manager",
      desc: "Lead swimmers into renewal, log client call observations, schedule follow-ups, and convert reinscriptions.",
      href: "/admin/swim/calls",
      badge: "Call Desk",
      badgeTone: "info" as const,
      actionText: "Manage Calls",
    },
  ];

  // Eligible groups for Add Member modal (category-scoped + optional solid filter)
  const addMemberEligibleGroups = useMemo(() => {
    return groups.filter((g) => {
      if (!g.active) return false;
      if (g.category !== category) return false;
      if (showSolidOnlyAdd && !g.isSolid) return false;
      return true;
    });
  }, [groups, category, showSolidOnlyAdd]);

  // Eligible groups for Promote Lead modal (category-scoped + optional solid filter)
  const promoteLeadEligibleGroups = useMemo(() => {
    if (!promotingLead) return [];
    return groups.filter((g) => {
      if (!g.active) return false;
      if (g.category !== promotingLead.category) return false;
      if (showSolidOnlyPromote && !g.isSolid) return false;
      return true;
    });
  }, [groups, promotingLead, showSolidOnlyPromote]);

  // Groups tab categorized items
  const filteredGroupsList = useMemo(() => {
    return groups.filter((g) => {
      if (groupsCategoryFilter !== "all" && g.category !== groupsCategoryFilter) return false;
      return true;
    });
  }, [groups, groupsCategoryFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="AQA Swim Inscription Manager"
        description="Comprehensive operational hub for managing swim inscriptions, confirmed client profiles, solid groups, and PVC pass cards."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setShowAddMemberModal(true)}
              variant="primary"
            >
              + Add Swimmer
            </Button>
            <Button
              onClick={() => setShowAddLeadModal(true)}
              variant="secondary"
            >
              + New Lead
            </Button>
            <Button
              onClick={handleExportCSV}
              variant="secondary"
            >
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Confirmed Swimmers"
          value={members.length}
          animated
          hint="Registered clients & active profiles"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />
        <StatCard
          label="Pending Waitlist Leads"
          value={pendingLeadsCount}
          animated
          hint="Clients to call & confirm"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Active Groups"
          value={groups.filter((g) => g.active).length}
          animated
          hint="Configured training slots"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />
        <StatCard
          label="Revenue Collected"
          value={`${totalRevenueCollected.toLocaleString("fr-DZ")} DA`}
          hint={`Of ${totalRevenueExpected.toLocaleString("fr-DZ")} DA total expected`}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div className="flex flex-wrap bg-[var(--surface)] p-1 rounded-xl border border-[var(--border)] gap-1">
          <button
            onClick={() => setActiveTab("confirmed")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
              activeTab === "confirmed"
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "text-[var(--muted)] hover:text-white hover:bg-slate-800"
            }`}
          >
            <span>Confirmed Swimmers</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-950 text-sky-300 border border-sky-800/40">
              {members.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("leads")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
              activeTab === "leads"
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "text-[var(--muted)] hover:text-white hover:bg-slate-800"
            }`}
          >
            <span>Waitlist Demands</span>
            {pendingLeadsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-950 text-amber-300 border border-amber-800/40">
                {pendingLeadsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("groups")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "groups"
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "text-[var(--muted)] hover:text-white hover:bg-slate-800"
            }`}
          >
            Training Groups ({groups.length})
          </button>

          <button
            onClick={() => setActiveTab("calendar")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "calendar"
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "text-[var(--muted)] hover:text-white hover:bg-slate-800"
            }`}
          >
            <span>Coach Calendar</span>
          </button>

          <button
            onClick={() => setActiveTab("cards")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "cards"
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "text-[var(--muted)] hover:text-white hover:bg-slate-800"
            }`}
          >
            PVC Cards ({cards.length})
          </button>

          <button
            onClick={() => setActiveTab("sectors")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "sectors"
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "text-[var(--muted)] hover:text-white hover:bg-slate-800"
            }`}
          >
            Sectors Hub
          </button>

          <button
            onClick={() => setActiveTab("calls")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "calls"
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "text-sky-400 hover:text-white hover:bg-sky-950/60 border border-sky-900/40"
            }`}
          >
            <span>Reinscription Calls</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-900 text-sky-200">
              Desk
            </span>
          </button>

          <button
            onClick={() => setActiveTab("payments")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "payments"
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "text-sky-400 hover:text-white hover:bg-sky-950/60 border border-sky-900/40"
            }`}
          >
            <span>Payments</span>
            {expiringCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-900 text-amber-200 font-bold">
                {expiringCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("backups")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "backups"
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "text-sky-400 hover:text-white hover:bg-sky-950/60 border border-sky-900/40"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            <span>Backups</span>
          </button>
        </div>

        {/* Global Search */}
        {(activeTab === "confirmed" || activeTab === "leads") && (
          <div className="w-full sm:w-72">
            <Input
              placeholder={activeTab === "confirmed" ? "Search name, phone, Swimmer ID..." : "Search leads..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* TAB 1: CONFIRMED SWIMMERS & PROFILES */}
      {activeTab === "confirmed" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              <option value="all">All Categories</option>
              <option value="homme">Homme</option>
              <option value="femme">Femme</option>
              <option value="enfants">Enfants</option>
              <option value="apnea">Apnee</option>
            </select>

            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              <option value="all">All Levels</option>
              <option value="new_aqa">New AQA Member</option>
              <option value="old_aqa">Old AQA Member</option>
            </select>

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              <option value="all">All Payments</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="unpaid">Unpaid</option>
            </select>

            <span className="text-xs text-[var(--muted)] ml-auto">
              Showing {filteredMembers.length} of {members.length} registered swimmers
            </span>
          </div>

          {/* Confirmed Swimmers Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--muted)] uppercase tracking-wider">
                    <th className="py-3 px-4">Swimmer ID</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Level</th>
                    <th className="py-3 px-4">Group Assignment</th>
                    <th className="py-3 px-4">Client Status</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">PVC Pass</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[var(--muted)]">
                        Loading confirmed swimmers...
                      </td>
                    </tr>
                  ) : filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[var(--muted)]">
                        No swimmers found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((m) => {
                      const waUrl = getWhatsAppUrl(m);
                      const effectiveGrp = m.effectiveGroup || (!m.effectivelyUnassigned && m.group?.active ? m.group : null);
                      const isArchived = m.effectivelyUnassigned || (m.group && !m.group.active);

                      return (
                        <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 font-mono">
                            <Link
                              href={`/admin/swim/members/${m.swimId}`}
                              className="text-cyan-400 font-bold hover:underline inline-flex items-center gap-1"
                              title="Open Full Swimmer Profile Page"
                            >
                              <span>{m.swimId}</span>
                            </Link>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              {m.photoUrl ? (
                                <img
                                  src={m.photoUrl}
                                  alt=""
                                  className="h-8 w-8 rounded-lg object-cover border border-white/10"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-lg bg-sky-950 text-sky-400 font-bold flex items-center justify-center text-[10px] border border-sky-800/40 shrink-0">
                                  {m.fullName.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <Link
                                  href={`/admin/swim/members/${m.swimId}`}
                                  className="font-bold text-white hover:text-cyan-400 transition-colors"
                                >
                                  {m.fullName}
                                </Link>
                                <div className="text-[11px] text-[var(--muted)] flex items-center gap-2">
                                  {m.phone ? (
                                    <span className="font-mono text-cyan-400/90">{m.phone}</span>
                                  ) : (
                                    <span className="italic text-slate-500">No phone</span>
                                  )}
                                  <span className="capitalize text-slate-400">· {m.category}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-200">
                              {getSwimLevelLabel(m.level)}
                            </div>
                            <div className="text-[11px] text-[var(--muted)]">
                              Type: {m.formula}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {effectiveGrp ? (
                              <div>
                                <div className="font-semibold text-white">{effectiveGrp.name}</div>
                                <div className="text-[10px] text-cyan-400">
                                  {effectiveGrp.coachName ? `Coach: ${effectiveGrp.coachName}` : effectiveGrp.schedule}
                                </div>
                              </div>
                            ) : isArchived ? (
                              <div>
                                <span className="text-amber-400 font-semibold">Unassigned</span>
                                <div className="text-[10px] text-slate-500 italic">Group archived</div>
                              </div>
                            ) : (
                              <span className="text-[var(--muted)] italic">Unassigned</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {m.groupStatus === "accepted" && <Badge tone="success">Confirmed</Badge>}
                            {m.groupStatus === "proposed" && <Badge tone="warning">Proposed</Badge>}
                            {m.groupStatus === "rejected" && <Badge tone="danger">Rejected</Badge>}
                          </td>

                          <td className="py-3 px-4">
                            <div>
                              {m.paymentStatus === "paid" && <Badge tone="success">Paid</Badge>}
                              {m.paymentStatus === "partial" && <Badge tone="warning">Partial</Badge>}
                              {m.paymentStatus === "unpaid" && <Badge tone="danger">Unpaid</Badge>}
                              <div className="text-[10px] text-[var(--muted)] font-mono mt-0.5">
                                {m.priceDA.toLocaleString("fr-DZ")} DA
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 font-mono text-[11px]">
                            {m.card ? (
                              <Link
                                href={`/swim/card/${m.card.publicToken}`}
                                target="_blank"
                                className="text-cyan-400 hover:underline inline-flex items-center gap-1"
                              >
                                <span>{m.card.cardCode}</span>
                                <span className="text-[9px]">↗</span>
                              </Link>
                            ) : (
                              <span className="text-[var(--muted)]">No card</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                            {waUrl && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center px-2 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 font-semibold text-xs transition-colors"
                                title="Send WhatsApp Confirmation & Profile Link"
                              >
                                WhatsApp
                              </a>
                            )}

                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setPayingMember(m);
                                setPaymentAmount(String(m.priceDA));
                              }}
                            >
                              + Pay
                            </Button>

                            <Link
                              href={`/admin/swim/members/${m.swimId}`}
                              className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-cyan-400 font-semibold text-xs transition-colors border border-white/10"
                            >
                              Profile
                            </Link>

                            <button
                              type="button"
                              onClick={() => {
                                setDeleteSwimmerTarget(m);
                                setDeleteSwimmerError(null);
                              }}
                              className="inline-flex items-center justify-center px-2 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/80 text-rose-400 border border-rose-800/40 font-semibold text-xs transition-colors"
                              title="Delete duplicated profile"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: WAITLIST & INCOMING DEMANDS */}
      {activeTab === "leads" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex bg-[var(--surface)] p-1 rounded-xl border border-[var(--border)] gap-1">
              {["pending", "called", "confirmed", "rejected", "all"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setLeadStatusFilter(tab)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                    leadStatusFilter === tab
                      ? "bg-[var(--primary)] text-white shadow-sm"
                      : "text-[var(--muted)] hover:text-white hover:bg-slate-800"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <Button onClick={() => setShowAddLeadModal(true)} variant="primary" size="sm">
              + New Lead
            </Button>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--muted)] uppercase tracking-wider">
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Category & Level</th>
                    <th className="py-3 px-4">Formula</th>
                    <th className="py-3 px-4">Preferred Days</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Received</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[var(--muted)]">
                        Loading wait list...
                      </td>
                    </tr>
                  ) : filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[var(--muted)]">
                        No waitlist leads found.
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => {
                      const cleanPhone = lead.phone ? lead.phone.replace(/[^0-9]/g, "") : "";
                      const formattedPhone = cleanPhone.startsWith("0") ? `213${cleanPhone.slice(1)}` : cleanPhone;
                      const waLeadUrl = cleanPhone
                        ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(
                            `Salam ${lead.fullName}, nous vous contactons concernant votre demande d'inscription AQA Swim (${lead.formula}). Êtes-vous disponible pour finaliser votre groupe ?`
                          )}`
                        : null;
                      const demo = lead.details?.demographics;
                      const hasPack = Boolean(lead.details?.equipment.hasPack);
                      const cleanNotes = lead.details?.userNotes;

                      return (
                        <tr
                          key={lead.id}
                          onClick={() => openLeadInspector(lead)}
                          className="hover:bg-cyan-500/[0.04] transition-colors cursor-pointer group"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white group-hover:text-cyan-300 transition-colors">
                                {lead.fullName}
                              </span>
                              {demo?.memberType === "old" && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-purple-950/80 text-purple-300 border border-purple-500/30">
                                  Ancien {demo.personalId ? `#${demo.personalId}` : ""}
                                </span>
                              )}
                              {hasPack && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 font-mono">
                                  Pack
                                </span>
                              )}
                            </div>

                            <div className="text-[11px] text-[var(--muted)] flex flex-wrap items-center gap-2 mt-1">
                              {lead.phone ? (
                                <a
                                  href={`tel:${lead.phone}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-cyan-400 hover:underline font-mono"
                                  title="Appeler"
                                >
                                  {lead.phone}
                                </a>
                              ) : (
                                <span className="italic text-slate-500">No phone</span>
                              )}
                              {lead.email && <span>· {lead.email}</span>}
                              {demo?.city && (
                                <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px]">
                                  {demo.city}
                                </span>
                              )}
                              {demo?.age && (
                                <span className="text-slate-400 text-[10px]">
                                  {demo.age} ans
                                </span>
                              )}
                              {demo?.channel && (
                                <span className="text-[10px] text-slate-500">
                                  via {demo.channel}
                                </span>
                              )}
                            </div>

                            {/* Display ONLY genuine user notes — NEVER raw metadata or orange IT codes! */}
                            {cleanNotes && (
                              <div className="text-[10px] text-slate-300 mt-1 italic line-clamp-1">
                                &ldquo;{cleanNotes}&rdquo;
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="capitalize font-semibold text-slate-200">{lead.category}</div>
                            <div className="text-[11px] text-[var(--muted)]">{getSwimLevelLabel(lead.level)}</div>
                            {demo?.goal && (
                              <div className="text-[10px] text-cyan-400/90 truncate max-w-[140px] mt-0.5">
                                {demo.goal}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-200">{lead.formula}</div>
                            <div className="text-[11px] text-[var(--muted)]">
                              {lead.frequency} · {lead.duration}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="text-slate-200">{lead.preferredDays || "—"}</div>
                            {demo?.timePref && (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Creneau: {demo.timePref}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {lead.status === "pending" && <Badge tone="warning">Pending</Badge>}
                            {lead.status === "called" && <Badge tone="info">Called</Badge>}
                            {lead.status === "confirmed" && <Badge tone="success">Confirmed</Badge>}
                            {lead.status === "rejected" && <Badge tone="danger">Rejected</Badge>}
                          </td>

                          <td className="py-3 px-4 text-[var(--muted)] font-mono">
                            {new Date(lead.createdAt).toLocaleDateString("fr-DZ")}
                          </td>

                          <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => openLeadInspector(lead)}
                            >
                              Details
                            </Button>

                            {waLeadUrl && (
                              <a
                                href={waLeadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center px-2 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 font-semibold text-xs transition-colors"
                              >
                                WhatsApp
                              </a>
                            )}

                            {lead.status === "pending" && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleUpdateLeadStatus(lead.id, "called")}
                              >
                                Called
                              </Button>
                            )}

                            {lead.status !== "confirmed" && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => {
                                  setPromotingLead(lead);
                                  setPromoteGroupId("");
                                  setPromoteCoachMessage("");
                                }}
                              >
                                Confirm & Link
                              </Button>
                            )}

                            {lead.status !== "rejected" && (
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => handleUpdateLeadStatus(lead.id, "rejected")}
                              >
                                Reject
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: TRAINING GROUPS */}
      {activeTab === "groups" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--muted)] font-semibold">Category:</span>
              {["all", "homme", "femme", "enfants", "apnea"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setGroupsCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                    groupsCategoryFilter === cat
                      ? "bg-cyan-500 text-slate-950"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {cat === "all" ? "All Groups" : cat}
                </button>
              ))}
            </div>

            <Link
              href="/admin/swim/groups"
              className="text-xs text-cyan-400 hover:underline font-semibold"
            >
              Open Full Groups Manager →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGroupsList.map((g) => {
              const enrolledCount = g._count?.swimmers ?? 0;
              const safeCapacity = g.capacity || 10;
              const capPercent = Math.min(100, Math.round((enrolledCount / safeCapacity) * 100));

              return (
                <div
                  key={g.id}
                  className={`rounded-2xl border bg-[var(--surface)] p-4 space-y-3 flex flex-col justify-between ${
                    g.active ? "border-[var(--border)]" : "border-white/5 opacity-60"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-white text-sm">{g.name}</h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {g.category}
                          </span>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-cyan-950/70 text-cyan-400">
                            {g.level}
                          </span>
                          {g.isSolid && (
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-400 border border-emerald-800/40">
                              Solid
                            </span>
                          )}
                          {!g.active && <Badge tone="danger">Archived</Badge>}
                        </div>
                      </div>
                      <Badge tone={enrolledCount >= safeCapacity ? "danger" : "info"}>
                        {enrolledCount} / {safeCapacity}
                      </Badge>
                    </div>

                    <div className="text-xs text-slate-300 mt-2">
                      {g.coachName ? `Coach: ${g.coachName}` : "Coach unassigned"}
                    </div>
                    <div className="text-xs text-[var(--muted)] mt-0.5">
                      Schedule: {g.schedule}
                    </div>

                    {/* Capacity Bar */}
                    <div className="mt-3 space-y-1">
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            capPercent > 90 ? "bg-rose-500" : capPercent > 60 ? "bg-amber-500" : "bg-cyan-400"
                          }`}
                          style={{ width: `${capPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-[var(--muted)] font-mono">
                        <span>Occupancy</span>
                        <span>{capPercent}%</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/admin/swim/groups`}
                    className="block text-center py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-300 transition-colors"
                  >
                    Manage Roster in Groups Manager
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: COACH CALENDAR */}
      {activeTab === "calendar" && (
        <div className="space-y-4">
          {/* Calendar Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                  Filter by Coach
                </label>
                <select
                  value={calendarCoachFilter}
                  onChange={(e) => setCalendarCoachFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="all">All Coaches ({activeCoaches.length})</option>
                  {activeCoaches.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                  Filter by Category
                </label>
                <select
                  value={calendarCategoryFilter}
                  onChange={(e) => setCalendarCategoryFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="all">All Categories</option>
                  <option value="homme">Homme</option>
                  <option value="femme">Femme</option>
                  <option value="enfants">Enfants</option>
                  <option value="apnea">Apnee</option>
                </select>
              </div>
            </div>

            <div className="text-xs text-[var(--muted)] font-mono">
              {totalWeeklyCalendarSessions} sessions scheduled ({calendarGroups.length} groups)
            </div>
          </div>

          {/* Weekly Calendar Grid */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-slate-900/60">
                    <th className="py-3 px-3 w-20 text-[11px] font-semibold text-[var(--muted)] text-center uppercase tracking-wider">
                      Time
                    </th>
                    {FRENCH_DAYS.map((day) => (
                      <th
                        key={day}
                        className="py-3 px-3 text-xs font-bold text-white text-center border-l border-white/5"
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {SWIM_TIME_SLOTS.map((timeSlot) => {
                    return (
                      <tr key={timeSlot} className="hover:bg-white/[0.01]">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[var(--muted)] text-center bg-slate-900/30">
                          {timeSlot}
                        </td>
                        {FRENCH_DAYS.map((day) => {
                          // Find groups matching this day and time slot
                          const matchingGroups = calendarGroups.filter((g) => {
                            const slots = parseScheduleSlots(g.schedule);
                            return slots.some(
                              (slot) => slot.day.toLowerCase() === day.toLowerCase() && slot.time === timeSlot
                            );
                          });

                          return (
                            <td
                              key={`${day}-${timeSlot}`}
                              className="py-2 px-2 border-l border-white/5 align-top min-w-[120px]"
                            >
                              {matchingGroups.length > 0 ? (
                                <div className="space-y-1.5">
                                  {matchingGroups.map((grp) => {
                                    const slots = parseScheduleSlots(grp.schedule);
                                    const activeSlot = slots.find(
                                      (s) => s.day.toLowerCase() === day.toLowerCase() && s.time === timeSlot
                                    );
                                    const isKids = grp.category === "enfants";
                                    const enrolled = members.filter((m) => {
                                      const eff = m.effectiveGroup || (!m.effectivelyUnassigned && m.group?.active ? m.group : null);
                                      return eff?.id === grp.id;
                                    }).length;

                                    return (
                                      <div
                                        key={`${grp.id}-${day}-${timeSlot}`}
                                        onClick={() => router.push("/admin/swim/groups")}
                                        className={`p-2 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] shadow-sm ${
                                          grp.level === "G10"
                                            ? "bg-sky-950/60 border-sky-600/40 text-sky-200"
                                            : grp.level === "MAX5"
                                            ? "bg-indigo-950/60 border-indigo-600/40 text-indigo-200"
                                            : "bg-teal-950/60 border-teal-600/40 text-teal-200"
                                        }`}
                                      >
                                        <div className="flex items-start justify-between gap-1">
                                          <div className="font-bold text-[11px] leading-tight text-white">
                                            {grp.name}
                                          </div>
                                          {isKids && (
                                            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-400/20 text-amber-300 font-mono font-bold shrink-0">
                                              1h
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[10px] text-cyan-300 font-semibold mt-0.5">
                                          Coach: {grp.coachName || "Unassigned"}
                                        </div>
                                        {activeSlot?.location && (
                                          <div className="text-[9px] text-slate-300 truncate">
                                            {activeSlot.location}
                                          </div>
                                        )}
                                        <div className="flex items-center justify-between gap-1 mt-1 pt-1 border-t border-white/10 text-[9px]">
                                          <span className="uppercase font-semibold">{grp.category}</span>
                                          <span className="font-mono font-bold text-white">
                                            {enrolled}/{grp.capacity}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 5: PVC CARDS */}
      {activeTab === "cards" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                PVC QR Card Inventory ({cards.length} Generated)
              </h3>
              <p className="text-xs text-[var(--muted)]">
                Assigned: {cards.filter((c) => c.memberId).length} · Blank Available:{" "}
                {cards.filter((c) => !c.memberId).length}
              </p>
            </div>
            <Link
              href="/admin/swim/cards"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold"
            >
              Batch Generate & Print →
            </Link>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--muted)] uppercase tracking-wider">
                    <th className="py-3 px-4">Card Code</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Linked Swimmer</th>
                    <th className="py-3 px-4 text-right">Pass Portal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {cards.slice(0, 30).map((c) => (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-cyan-400">{c.cardCode}</td>
                      <td className="py-3 px-4">
                        <Badge tone={c.status === "active" ? "success" : "danger"}>{c.status}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        {c.member ? (
                          <div className="font-semibold text-white">
                            {c.member.fullName} ({c.member.swimId})
                          </div>
                        ) : (
                          <span className="italic text-slate-500">Unassigned (Blank inventory)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <Link
                          href={`/swim/card/${c.publicToken}`}
                          target="_blank"
                          className="text-cyan-400 hover:underline"
                        >
                          Open Pass ↗
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 6: SECTORS OVERVIEW */}
      {activeTab === "sectors" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {sectors.map((sec) => (
            <div
              key={sec.title}
              className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md p-6 shadow-sm hover:shadow-[var(--shadow-glow)] hover:border-[var(--primary)]/40 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h2 className="text-base font-bold text-white">{sec.title}</h2>
                  <Badge tone={sec.badgeTone}>{sec.badge}</Badge>
                </div>
                <p className="text-xs text-[var(--muted)] leading-relaxed mb-6">{sec.desc}</p>
              </div>

              <Link
                href={sec.href}
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-[var(--primary)] hover:text-white text-cyan-400 font-semibold text-xs border border-white/5 transition-all duration-200"
              >
                <span>{sec.actionText}</span>
                <span>→</span>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* TAB 7: REINSCRIPTION & CALLS DESK */}
      {activeTab === "calls" && (
        <CallsErrorBoundary>
          <SwimCallsDesk
            onNavigateToSwimmer={(swimId) => router.push(`/admin/swim/members/${swimId}`)}
          />
        </CallsErrorBoundary>
      )}

      {/* ─── TAB: PAYMENTS & SUBSCRIPTIONS ───────────────────────────── */}
      {activeTab === "payments" && (
        <div className="space-y-4">

          {/* Summary Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/8 space-y-0.5">
              <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Total Expected</p>
              <p className="text-base font-bold font-mono text-white">{totalRevenueExpected.toLocaleString("fr-DZ")} DA</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/8 space-y-0.5">
              <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Total Collected</p>
              <p className="text-base font-bold font-mono text-emerald-400">{totalRevenueCollected.toLocaleString("fr-DZ")} DA</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/8 space-y-0.5">
              <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Outstanding</p>
              <p className="text-base font-bold font-mono text-rose-400">{totalOutstanding.toLocaleString("fr-DZ")} DA</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/8 space-y-0.5">
              <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Expiring in 14 days</p>
              <p className={`text-base font-bold font-mono ${expiringCount > 0 ? "text-amber-400" : "text-slate-400"}`}>
                {expiringCount} member{expiringCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Exclusion Period Editor Toggle */}
          <div className="rounded-2xl bg-slate-900/80 border border-white/8 overflow-hidden">
            <button
              onClick={() => setShowExclusionEditor((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <span>Exclusion Periods (Ramadan + Eid) — click to edit</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-4 h-4 transition-transform ${showExclusionEditor ? "rotate-180" : ""}`}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {showExclusionEditor && (
              <div className="px-4 pb-4 space-y-3 border-t border-white/8">
                <p className="text-[11px] text-slate-400 pt-3">
                  These periods are excluded from all subscription end-date calculations. Changes apply immediately to the view below (not persisted to DB — contact dev to make permanent).
                </p>
                {excludedPeriods.map((period, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
                    <input
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-cyan-400"
                      value={period.label}
                      onChange={(e) => {
                        const updated = [...excludedPeriods];
                        updated[idx] = { ...updated[idx], label: e.target.value };
                        setExcludedPeriods(updated);
                      }}
                    />
                    <input
                      type="date"
                      className="px-2 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                      value={period.start.toISOString().slice(0, 10)}
                      onChange={(e) => {
                        const updated = [...excludedPeriods];
                        updated[idx] = { ...updated[idx], start: new Date(e.target.value + "T00:00:00.000Z") };
                        setExcludedPeriods(updated);
                      }}
                    />
                    <input
                      type="date"
                      className="px-2 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                      value={period.end.toISOString().slice(0, 10)}
                      onChange={(e) => {
                        const updated = [...excludedPeriods];
                        updated[idx] = { ...updated[idx], end: new Date(e.target.value + "T00:00:00.000Z") };
                        setExcludedPeriods(updated);
                      }}
                    />
                    <button
                      onClick={() => setExcludedPeriods((prev) => prev.filter((_, i) => i !== idx))}
                      className="px-2 py-1.5 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-400 hover:bg-rose-900/60 text-xs font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  onClick={() =>
                    setExcludedPeriods((prev) => [
                      ...prev,
                      { label: "New Period", start: new Date(), end: new Date() },
                    ])
                  }
                  className="px-3 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  + Add Period
                </button>
              </div>
            )}
          </div>

          {/* Search + Filter Bar */}
          <div className="flex flex-wrap gap-2 items-center">
            <Input
              placeholder="Search name, phone, Swimmer ID..."
              value={paymentsSearch}
              onChange={(e) => setPaymentsSearch(e.target.value)}
              className="w-full sm:w-64"
            />
            <div className="flex gap-1.5 flex-wrap">
              {(["all", "paid", "partial", "unpaid", "expiring"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setPaymentsFilter(f)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                    paymentsFilter === f
                      ? f === "paid"
                        ? "bg-emerald-700 text-white"
                        : f === "partial"
                        ? "bg-amber-700 text-white"
                        : f === "unpaid"
                        ? "bg-rose-800 text-white"
                        : f === "expiring"
                        ? "bg-amber-900 text-amber-200"
                        : "bg-[var(--primary)] text-white"
                      : "bg-slate-800 text-slate-400 hover:text-white border border-white/8"
                  }`}
                >
                  {f === "expiring" ? `Expiring (${expiringCount})` : f}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-slate-500 ml-auto">
              {filteredPaymentsMembers.length} member{filteredPaymentsMembers.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Payments Table */}
          <div className="rounded-2xl bg-slate-900/80 border border-white/8 overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[900px]">
              <thead>
                <tr className="border-b border-white/8 text-[10px] text-slate-400 uppercase tracking-wider">
                  <th className="px-3 py-2.5 font-semibold">Swimmer</th>
                  <th className="px-3 py-2.5 font-semibold">Formula / Duration</th>
                  <th className="px-3 py-2.5 font-semibold">Sub Start</th>
                  <th className="px-3 py-2.5 font-semibold">Sub End</th>
                  <th className="px-3 py-2.5 font-semibold">Days Left</th>
                  <th className="px-3 py-2.5 font-semibold">Price</th>
                  <th className="px-3 py-2.5 font-semibold">Paid</th>
                  <th className="px-3 py-2.5 font-semibold">Balance</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 font-semibold">Notify</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredPaymentsMembers.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-500 text-xs">
                      No members match the current filter.
                    </td>
                  </tr>
                )}
                {filteredPaymentsMembers.map((m) => {
                  const subStartStr = m.subStart.toISOString().slice(0, 10);
                  const subEndDisplay = `${String(m.subEnd.getUTCDate()).padStart(2, "0")}/${String(m.subEnd.getUTCMonth() + 1).padStart(2, "0")}/${m.subEnd.getUTCFullYear()}`;
                  const subStartDisplay = `${String(m.subStart.getUTCDate()).padStart(2, "0")}/${String(m.subStart.getUTCMonth() + 1).padStart(2, "0")}/${m.subStart.getUTCFullYear()}`;
                  const isEditingStart = editingSubStart[m.id] !== undefined;
                  const renewalUrl = getSwimRenewalWhatsAppUrl({
                    fullName: m.fullName,
                    phone: m.phone,
                    notes: m.notes,
                    swimId: m.swimId,
                    formula: m.formula,
                    duration: m.duration,
                    subscriptionEnd: m.subEnd,
                  });
                  const rowBg =
                    m.expiringSoon && m.paymentStatus === "paid"
                      ? "bg-amber-950/20"
                      : m.paymentStatus === "unpaid"
                      ? "bg-rose-950/15"
                      : m.paymentStatus === "partial"
                      ? "bg-amber-950/15"
                      : "";
                  return (
                    <tr key={m.id} className={`hover:bg-slate-800/40 transition-colors ${rowBg}`}>
                      {/* Swimmer */}
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-white leading-tight">{m.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{m.swimId}</div>
                        <div className="text-[10px] text-slate-500">{m.phone}</div>
                      </td>
                      {/* Formula / Duration */}
                      <td className="px-3 py-2.5">
                        <span className="font-semibold text-slate-200">{m.formula}</span>
                        <span className="ml-1 text-slate-400">{m.duration}</span>
                      </td>
                      {/* Sub Start — editable */}
                      <td className="px-3 py-2.5">
                        {isEditingStart ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="date"
                              value={editingSubStart[m.id]}
                              onChange={(e) =>
                                setEditingSubStart((prev) => ({ ...prev, [m.id]: e.target.value }))
                              }
                              className="px-1.5 py-1 rounded-md bg-slate-800 border border-cyan-500/50 text-white text-[11px] focus:outline-none w-28"
                            />
                            <button
                              onClick={() => handleSaveSubStart(m.id)}
                              disabled={savingSubStart === m.id}
                              className="px-2 py-1 rounded-md bg-cyan-700 text-white text-[10px] font-bold hover:bg-cyan-600 disabled:opacity-50"
                            >
                              {savingSubStart === m.id ? "..." : "Save"}
                            </button>
                            <button
                              onClick={() =>
                                setEditingSubStart((prev) => {
                                  const next = { ...prev };
                                  delete next[m.id];
                                  return next;
                                })
                              }
                              className="px-1.5 py-1 rounded-md text-slate-400 hover:text-white text-[10px]"
                            >
                              X
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              setEditingSubStart((prev) => ({ ...prev, [m.id]: subStartStr }))
                            }
                            className="font-mono text-slate-300 hover:text-cyan-300 text-[11px] underline decoration-dashed decoration-slate-600 hover:decoration-cyan-400"
                            title="Click to edit subscription start"
                          >
                            {subStartDisplay}
                          </button>
                        )}
                      </td>
                      {/* Sub End */}
                      <td className="px-3 py-2.5 font-mono text-[11px]">
                        <span className={
                          m.subStatus === "expired"
                            ? "text-rose-400"
                            : m.subStatus === "expiring_soon"
                            ? "text-amber-300"
                            : "text-cyan-300"
                        }>
                          {subEndDisplay}
                        </span>
                      </td>
                      {/* Days Left */}
                      <td className="px-3 py-2.5 text-center">
                        {m.subStatus === "expired" ? (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-950/80 text-rose-300 border border-rose-500/30 font-bold">Expired</span>
                        ) : (
                          <span className={`font-mono font-bold text-sm ${m.subStatus === "expiring_soon" ? "text-amber-300" : "text-white"}`}>
                            {m.daysLeft}
                          </span>
                        )}
                      </td>
                      {/* Price */}
                      <td className="px-3 py-2.5 font-mono text-slate-200 font-semibold">
                        {m.priceDA.toLocaleString("fr-DZ")} DA
                      </td>
                      {/* Paid */}
                      <td className="px-3 py-2.5 font-mono text-emerald-400 font-semibold">
                        {m.totalPaid.toLocaleString("fr-DZ")} DA
                      </td>
                      {/* Balance */}
                      <td className="px-3 py-2.5 font-mono font-semibold">
                        {m.debt > 0 ? (
                          <span className="text-rose-400">{m.debt.toLocaleString("fr-DZ")} DA</span>
                        ) : (
                          <span className="text-emerald-400">Settled</span>
                        )}
                      </td>
                      {/* Payment Status */}
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          m.paymentStatus === "paid"
                            ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30"
                            : m.paymentStatus === "partial"
                            ? "bg-amber-950/80 text-amber-300 border border-amber-500/30"
                            : "bg-rose-950/80 text-rose-300 border border-rose-500/30"
                        }`}>
                          {m.paymentStatus}
                        </span>
                        {m.expiringSoon && m.paymentStatus === "paid" && (
                          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] bg-amber-900/60 text-amber-300 border border-amber-500/20 font-semibold">
                            Renew
                          </span>
                        )}
                      </td>
                      {/* Notify / Quick Pay */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {renewalUrl && (
                            <a
                              href={renewalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/60 text-[10px] font-bold transition-colors flex items-center gap-1"
                              title="Send renewal reminder via WhatsApp"
                            >
                              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.119.554 4.107 1.527 5.832L0 24l6.335-1.509A11.954 11.954 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-1.98 0-3.831-.545-5.415-1.49l-.388-.233-3.763.897.934-3.676-.253-.398A9.786 9.786 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z"/>
                              </svg>
                              Notify
                            </a>
                          )}
                          <button
                            onClick={() => setPayingMember(m)}
                            className="px-2 py-1 rounded-lg bg-sky-950/60 border border-sky-500/30 text-sky-300 hover:bg-sky-900/60 text-[10px] font-bold transition-colors"
                          >
                            + Pay
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB: BACKUPS & DISASTER RECOVERY ───────────────────────── */}
      {activeTab === "backups" && (
        <SwimBackupDesk />
      )}

      {/* ─── ADD SWIMMER MODAL ────────────────────────────────────────── */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="max-w-xl w-full bg-slate-900 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] my-auto">
            <div className="flex items-start justify-between pb-3 border-b border-white/10 shrink-0">
              <div>
                <h3 className="text-base font-bold text-white">Add Swimmer Profile</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Register a swimmer. Level is New or Old AQA Member. Formula and frequency are managed through group enrollment.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMemberModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {addMemberSuccess && (
              <div className="mt-3 p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center shrink-0">
                {addMemberSuccess}
              </div>
            )}

            <form onSubmit={handleAddMemberSubmit} className="flex flex-col flex-1 min-h-0 mt-3">
              <div className="overflow-y-auto flex-1 pr-1.5 space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Full Name *
                    </label>
                    <Input
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Amina Khelifi"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Phone (Optional)
                    </label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0661234567 (Optional)"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Date of Start *
                    </label>
                    <Input
                      type="date"
                      required
                      value={dateOfStart}
                      onChange={(e) => setDateOfStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Email (Optional)
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="swimmer@email.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Category *
                    </label>
                    <select
                      value={category}
                      onChange={(e) => {
                        setCategory(e.target.value);
                        setGroupId(""); // Reset group if category changes
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                    >
                      <option value="homme">Homme</option>
                      <option value="femme">Femme</option>
                      <option value="enfants">Enfants</option>
                      <option value="apnea">Apnee</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Level *
                    </label>
                    <select
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                    >
                      <option value="new_aqa">New AQA Member</option>
                      <option value="old_aqa">Old AQA Member</option>
                    </select>
                  </div>
                </div>

                {/* Group Assignment with Solid toggle & Category scoped */}
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-white/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-300">
                      Assign Group ({category})
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={showSolidOnlyAdd}
                        onChange={(e) => setShowSolidOnlyAdd(e.target.checked)}
                        className="h-3.5 w-3.5 accent-cyan-500 rounded"
                      />
                      <span>Show Solid Only</span>
                    </label>
                  </div>
                  <select
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option value="">No group assigned yet (Awaiting allocation)</option>
                    {addMemberEligibleGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.level} - Coach: {g.coachName || "Unassigned"} - {g.schedule}) {g.isSolid ? "[SOLID]" : ""}
                      </option>
                    ))}
                  </select>
                  {addMemberEligibleGroups.length === 0 && (
                    <p className="text-[11px] text-amber-400/90 italic">
                      No active {showSolidOnlyAdd ? "solid " : ""}groups found for category &quot;{category}&quot;.
                    </p>
                  )}
                </div>

                {/* Coach message */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Word From Your Coach (Personal note for portal)
                  </label>
                  <textarea
                    value={coachMessage}
                    onChange={(e) => setCoachMessage(e.target.value)}
                    placeholder="e.g. Bienvenue! Vos seances sont prevues chaque mardi et jeudi a 18h..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Issue card */}
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-white/5 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={issueCard}
                      onChange={(e) => setIssueCard(e.target.checked)}
                      className="h-4 w-4 accent-cyan-500 rounded"
                    />
                    <span className="text-xs font-semibold text-white">
                      Issue Swim PVC Pass Card Immediately
                    </span>
                  </label>

                  {issueCard && (
                    <input
                      type="text"
                      value={cardCode}
                      onChange={(e) => setCardCode(e.target.value)}
                      placeholder="Card Code (Leave blank to auto-generate SWM-XXXXXX)"
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400 uppercase"
                    />
                  )}
                </div>
              </div>

              {/* Form Footer */}
              <div className="flex gap-2 pt-3 border-t border-white/10 shrink-0 mt-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowAddMemberModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submittingAddMember}
                  className="flex-1"
                >
                  Save Swimmer Profile
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── QUICK PAYMENT MODAL ─────────────────────────────────────── */}
      {payingMember && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">
              Record Swim Payment: {payingMember.fullName}
            </h3>
            <p className="text-xs text-slate-400">
              Swimmer ID: <span className="font-mono text-cyan-300">{payingMember.swimId}</span>
            </p>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Payment Amount (DA) *
                </label>
                <Input
                  type="number"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="e.g. 21900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                >
                  <option value="cash">Especes (Cash at Reception)</option>
                  <option value="baridi_mob">Baridi Mob / CCP</option>
                  <option value="virement">Virement Bancaire</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Receipt Note (Optional)
                </label>
                <Input
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Recu No. 042 / Tranche 1"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setPayingMember(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submittingPayment}
                  className="flex-1"
                >
                  Confirm Payment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── PROMOTE LEAD MODAL ──────────────────────────────────────── */}
      {promotingLead && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="max-w-lg w-full bg-slate-900 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white">
              Confirm & Promote Swimmer: {promotingLead.fullName}
            </h3>
            <p className="text-xs text-slate-400">
              Assign a training group ({promotingLead.category}) and configure official pass access.
            </p>

            <form onSubmit={handlePromoteSubmit} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300">
                    Propose Group ({promotingLead.category})
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={showSolidOnlyPromote}
                      onChange={(e) => setShowSolidOnlyPromote(e.target.checked)}
                      className="h-3.5 w-3.5 accent-cyan-500 rounded"
                    />
                    <span>Show Solid Only</span>
                  </label>
                </div>
                <select
                  value={promoteGroupId}
                  onChange={(e) => setPromoteGroupId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                >
                  <option value="">No group assigned yet</option>
                  {promoteLeadEligibleGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.level} - Coach: {g.coachName || "Unassigned"} - {g.schedule}) {g.isSolid ? "[SOLID]" : ""}
                    </option>
                  ))}
                </select>
                {promoteLeadEligibleGroups.length === 0 && (
                  <p className="text-[11px] text-amber-400/90 italic">
                    No active {showSolidOnlyPromote ? "solid " : ""}groups found for category &quot;{promotingLead.category}&quot;.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Word From Your Coach
                </label>
                <textarea
                  value={promoteCoachMessage}
                  onChange={(e) => setPromoteCoachMessage(e.target.value)}
                  placeholder="e.g. Bienvenue dans l'equipe..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-white/5 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={promoteIssueCard}
                    onChange={(e) => setPromoteIssueCard(e.target.checked)}
                    className="h-4 w-4 accent-cyan-500 rounded"
                  />
                  <span className="text-xs font-semibold text-white">
                    Issue Swim PVC Pass Card
                  </span>
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setPromotingLead(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submittingPromote}
                  className="flex-1"
                >
                  Confirm & Create Member
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MANUAL NEW LEAD MODAL ────────────────────────────────────── */}
      {showAddLeadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="max-w-lg w-full bg-slate-900 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white">Create New Swim Lead</h3>

            <form onSubmit={handleAddLeadSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <Input
                    required
                    value={newLeadFullName}
                    onChange={(e) => setNewLeadFullName(e.target.value)}
                    placeholder="e.g. Salim Benali"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Phone (Optional)
                  </label>
                  <Input
                    value={newLeadPhone}
                    onChange={(e) => setNewLeadPhone(e.target.value)}
                    placeholder="0550123456"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email (Optional)
                </label>
                <Input
                  type="email"
                  value={newLeadEmail}
                  onChange={(e) => setNewLeadEmail(e.target.value)}
                  placeholder="client@email.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={newLeadCategory}
                    onChange={(e) => setNewLeadCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option value="homme">Homme</option>
                    <option value="femme">Femme</option>
                    <option value="enfants">Enfants</option>
                    <option value="apnea">Apnee</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Level
                  </label>
                  <select
                    value={newLeadLevel}
                    onChange={(e) => setNewLeadLevel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option value="new_aqa">New AQA Member</option>
                    <option value="old_aqa">Old AQA Member</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Availability / Preferred Days
                </label>
                <Input
                  value={newLeadPreferredDays}
                  onChange={(e) => setNewLeadPreferredDays(e.target.value)}
                  placeholder="e.g. Lundi & Mercredi soirs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={newLeadNotes}
                  onChange={(e) => setNewLeadNotes(e.target.value)}
                  placeholder="Any particular health notes or requests..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowAddLeadModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submittingAddLead}
                  className="flex-1"
                >
                  Save Lead
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DELETE SWIMMER MODAL ─────────────────────────────────────── */}
      {deleteSwimmerTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>

            <div>
              <h3 className="text-base font-bold text-white">
                Delete Swimmer Profile
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Are you sure you want to delete profile <strong className="text-white">{deleteSwimmerTarget.fullName}</strong> ({deleteSwimmerTarget.swimId})?
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                This action will unassign the swimmer from their group and delete any duplicated entries. This operation is permanent and cannot be undone.
              </p>
            </div>

            {deleteSwimmerError && (
              <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs">
                {deleteSwimmerError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDeleteSwimmerTarget(null)}
                disabled={deletingSwimmer}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteSwimmer}
                disabled={deletingSwimmer}
              >
                {deletingSwimmer ? "Deleting..." : "Yes, Delete Swimmer"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── LEAD INSPECTION SLIDE-OVER DRAWER ─────────────────────── */}
      {selectedLeadForInspection && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-2xl bg-slate-950 border-l border-white/10 shadow-2xl h-full flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-white/10 flex items-start justify-between bg-slate-900/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center text-slate-950 font-black text-lg shadow-[0_0_15px_rgba(0,242,255,0.3)] shrink-0">
                  {selectedLeadForInspection.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-white tracking-tight">
                      {selectedLeadForInspection.fullName}
                    </h2>
                    {selectedLeadForInspection.details?.demographics.memberType === "old" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950/80 text-purple-300 border border-purple-500/40">
                        Ancien {selectedLeadForInspection.details.demographics.personalId ? `#${selectedLeadForInspection.details.demographics.personalId}` : ""}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>Demande recue le {new Date(selectedLeadForInspection.createdAt).toLocaleDateString("fr-DZ")}</span>
                    <span>·</span>
                    <span className="capitalize font-medium text-slate-300">
                      Statut: {selectedLeadForInspection.status}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={closeLeadInspector}
                className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            {/* Quick Action Bar */}
            <div className="p-4 bg-slate-900/90 border-b border-white/10 flex flex-wrap items-center gap-2 shrink-0">
              <a
                href={`tel:${selectedLeadForInspection.phone}`}
                className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-semibold text-xs transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <span>Appeler Direct</span>
              </a>

              {selectedLeadForInspection.phone && (
                <a
                  href={`https://wa.me/${
                    selectedLeadForInspection.phone.replace(/[^0-9]/g, "").startsWith("0")
                      ? "213" + selectedLeadForInspection.phone.replace(/[^0-9]/g, "").slice(1)
                      : selectedLeadForInspection.phone.replace(/[^0-9]/g, "")
                  }?text=${encodeURIComponent(
                    `Salam ${selectedLeadForInspection.fullName}, nous vous contactons concernant votre demande d'inscription AQA Swim (${selectedLeadForInspection.formula}, ${selectedLeadForInspection.frequency}). Avez-vous des questions pour finaliser votre groupe ?`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-semibold text-xs transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                  <span>WhatsApp Prospect</span>
                </a>
              )}

              {selectedLeadForInspection.status === "pending" && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    handleUpdateLeadStatus(selectedLeadForInspection.id, "called");
                    setSelectedLeadForInspection({ ...selectedLeadForInspection, status: "called" });
                  }}
                >
                  Marquer Appele
                </Button>
              )}

              {selectedLeadForInspection.status !== "confirmed" && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setPromotingLead(selectedLeadForInspection);
                    setPromoteGroupId("");
                    setPromoteCoachMessage("");
                    closeLeadInspector();
                  }}
                >
                  Confirmer & Inscrire
                </Button>
              )}
            </div>

            {/* Drawer Body (scrollable) */}
            <div className="p-5 space-y-6 flex-1 overflow-y-auto">
              {saveLeadSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs">
                  {saveLeadSuccessMsg}
                </div>
              )}

              {/* ── SECTION 1: PACK EQUIPEMENT & ARTICLES ── */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-cyan-500/30 shadow-[0_0_20px_rgba(0,242,255,0.06)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-cyan-950 flex items-center justify-center text-cyan-400 border border-cyan-500/40">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="7" cy="12" r="5" />
                        <circle cx="17" cy="12" r="5" />
                        <line x1="12" y1="12" x2="12" y2="12" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight">
                        Pack Equipement & Articles AQA
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {selectedLeadForInspection.details?.equipment.hasPack
                          ? "Pack d'equipement demande avec l'inscription"
                          : "Aucun pack d'equipement demande"}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold font-mono border ${
                      selectedLeadForInspection.details?.equipment.hasPack
                        ? "bg-cyan-950/80 text-cyan-300 border-cyan-500/40"
                        : "bg-slate-800 text-slate-400 border-white/5"
                    }`}
                  >
                    {selectedLeadForInspection.details?.equipment.hasPack ? "Pack Demande" : "Sans Pack"}
                  </span>
                </div>

                {/* Article Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {EQUIPMENT_ARTICLES.map((article) => {
                    const isSelected = selectedLeadForInspection.details?.equipment.articles?.includes(article.id) || false;
                    return (
                      <div
                        key={article.id}
                        className={`p-3 rounded-xl border ${
                          isSelected
                            ? "bg-cyan-950/40 border-cyan-500/50 shadow-[0_0_12px_rgba(0,242,255,0.12)]"
                            : "bg-slate-800/30 border-white/5 opacity-60"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-bold font-mono px-1.5 py-0.2 rounded ${
                            isSelected ? "bg-cyan-900/60 text-cyan-300" : "bg-slate-800 text-slate-500"
                          }`}>
                            {isSelected ? "INCLUS" : "NON REQUIS"}
                          </span>
                        </div>
                        <div className="font-bold text-xs text-white">{article.label}</div>
                        <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">{article.description}</p>
                      </div>
                    );
                  })}
                </div>

                {selectedLeadForInspection.details?.equipment.size && (
                  <div className="text-xs text-slate-300 pt-2 border-t border-white/5">
                    Taille specifiee: <span className="font-bold text-white">{selectedLeadForInspection.details.equipment.size}</span>
                  </div>
                )}
              </div>

              {/* ── SECTION 2: PROFIL ADHERENT & DEMOGRAPHIE ── */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Profil Adherent & Demographie
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Telephone</span>
                    <a
                      href={`tel:${selectedLeadForInspection.phone}`}
                      className="font-mono font-bold text-cyan-400 hover:underline"
                    >
                      {selectedLeadForInspection.phone}
                    </a>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
                    <span className="text-[10px] text-slate-400 block mb-0.5">WhatsApp</span>
                    <span className="font-mono font-semibold text-white">
                      {selectedLeadForInspection.details?.demographics.whatsapp || selectedLeadForInspection.phone}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Ville / Wilaya</span>
                    <span className="font-semibold text-white">
                      {selectedLeadForInspection.details?.demographics.city || "Non specifiee"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Age</span>
                    <span className="font-semibold text-white">
                      {selectedLeadForInspection.details?.demographics.age
                        ? `${selectedLeadForInspection.details.demographics.age} ans`
                        : "Non specifie"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Canal Acquisition</span>
                    <span className="font-semibold text-white">
                      {selectedLeadForInspection.details?.demographics.channel || "Direct"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Type Adhesion</span>
                    <span className="font-semibold text-white">
                      {selectedLeadForInspection.details?.demographics.memberType === "old"
                        ? `Renouvellement (${selectedLeadForInspection.details.demographics.personalId || "Old"})`
                        : "Nouveau Membre"}
                    </span>
                  </div>
                </div>

                {selectedLeadForInspection.email && (
                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5 text-xs flex items-center justify-between">
                    <span className="text-slate-400">Email:</span>
                    <a
                      href={`mailto:${selectedLeadForInspection.email}`}
                      className="font-mono text-cyan-400 hover:underline"
                    >
                      {selectedLeadForInspection.email}
                    </a>
                  </div>
                )}
              </div>

              {/* ── SECTION 3: PROGRAMME SPORTIF & TARIF ── */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Programme & Objectifs Sportifs
                  </h3>
                  <span className="text-xs font-mono font-bold text-cyan-400">
                    Tarif Estime:{" "}
                    {formatDA(
                      calculateSwimPrice(
                        selectedLeadForInspection.category as SwimCategory,
                        selectedLeadForInspection.formula,
                        selectedLeadForInspection.duration as SwimDuration,
                        selectedLeadForInspection.frequency as SwimFrequency
                      )
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Categorie</span>
                    <span className="font-bold text-white capitalize">
                      {selectedLeadForInspection.category}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Niveau</span>
                    <span className="font-bold text-white capitalize">
                      {selectedLeadForInspection.level}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Formule</span>
                    <span className="font-bold text-white">
                      {selectedLeadForInspection.formula} ({selectedLeadForInspection.frequency})
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Duree</span>
                    <span className="font-bold text-white">
                      {selectedLeadForInspection.duration}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5 space-y-1.5 text-xs">
                  <div className="text-[11px] text-slate-400">
                    Objectif Sportif:{" "}
                    <span className="text-white font-medium">
                      {selectedLeadForInspection.details?.demographics.goal || selectedLeadForInspection.level || "Non renseigne"}
                    </span>
                  </div>
                  {selectedLeadForInspection.details?.demographics.timePref && (
                    <div className="text-[11px] text-slate-400">
                      Creneau horaire souhaite:{" "}
                      <span className="text-cyan-300 font-medium capitalize">
                        {selectedLeadForInspection.details.demographics.timePref}
                      </span>
                    </div>
                  )}
                  {selectedLeadForInspection.preferredDays && (
                    <div className="text-[11px] text-slate-400 pt-1 border-t border-white/5">
                      Jours preferes:{" "}
                      <span className="text-white font-medium">
                        {selectedLeadForInspection.preferredDays}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── SECTION 4: SUIVI & REMARQUES ── */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Suivi Appel & Remarques Internes
                  </h3>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={savingLeadNotes}
                    onClick={handleSaveLeadNotes}
                  >
                    {savingLeadNotes ? "Enregistrement..." : "Sauvegarder"}
                  </Button>
                </div>

                {selectedLeadForInspection.details?.userNotes && (
                  <div className="p-3 rounded-xl bg-slate-800/50 border border-white/5 text-xs text-slate-300">
                    <span className="text-[10px] text-cyan-400 font-semibold block mb-1">Note transmise par le client:</span>
                    &ldquo;{selectedLeadForInspection.details.userNotes}&rdquo;
                  </div>
                )}

                <textarea
                  value={editingLeadNotes}
                  onChange={(e) => setEditingLeadNotes(e.target.value)}
                  placeholder="Notes de l'appel telephonique, disponibilites particulieres..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-white/10 bg-slate-900/80 flex items-center justify-between gap-3 shrink-0">
              <Button
                variant="secondary"
                onClick={closeLeadInspector}
              >
                Fermer
              </Button>

              <div className="flex items-center gap-2">
                {selectedLeadForInspection.status !== "rejected" && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      handleUpdateLeadStatus(selectedLeadForInspection.id, "rejected");
                      closeLeadInspector();
                    }}
                  >
                    Rejeter
                  </Button>
                )}

                {selectedLeadForInspection.status !== "confirmed" && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      setPromotingLead(selectedLeadForInspection);
                      setPromoteGroupId("");
                      setPromoteCoachMessage("");
                      closeLeadInspector();
                    }}
                  >
                    Confirmer & Assigner Groupe
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

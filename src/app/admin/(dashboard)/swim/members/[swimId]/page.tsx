"use client";

import { useEffect, useState, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader, Badge, Button, Input, Card } from "@/components/admin/ui";

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
  effectiveGroup: SwimGroupRef | null;
  effectivelyUnassigned: boolean;
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

  const [member, setMember] = useState<SwimMemberDetail | null>(null);
  const [groups, setGroups] = useState<SwimGroupRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Edit profile state
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhotoUrl, setEditPhotoUrl] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editLevel, setEditLevel] = useState("");
  const [editFormula, setEditFormula] = useState("");
  const [editDuration, setEditDuration] = useState("");
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

  // Group assignment state
  const [showChangeGroup, setShowChangeGroup] = useState(false);
  const [groupSolidFilter, setGroupSolidFilter] = useState(false);
  const [selectedNewGroupId, setSelectedNewGroupId] = useState("");
  const [savingGroup, setSavingGroup] = useState(false);

  const loadMember = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/swim/members/${encodeURIComponent(swimId)}`);
      if (!res.ok) {
        setError("Swimmer profile not found.");
        return;
      }
      const data: SwimMemberDetail = await res.json();
      setMember(data);
      // Pre-fill edit fields
      setEditFullName(data.fullName);
      setEditPhone(data.phone || "");
      setEditEmail(data.email || "");
      setEditPhotoUrl(data.photoUrl || "");
      setEditCategory(data.category);
      setEditLevel(data.level);
      setEditFormula(data.formula);
      setEditDuration(data.duration || "3m");
      setEditDateOfStart(data.dateOfStart.split("T")[0]);
      setEditNotes(data.notes || "");
      setCoachMsgText(data.coachMessage || "");
      setNewPriceInput(String(data.priceDA));
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
          formula: editFormula,
          duration: editDuration,
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
    if (!member || !selectedNewGroupId) return;
    setSavingGroup(true);
    try {
      const res = await fetch(`/api/admin/swim/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: selectedNewGroupId, groupStatus: "proposed" }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || "Failed to change group.");
        return;
      }
      setShowChangeGroup(false);
      setSelectedNewGroupId("");
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
        body: JSON.stringify({ groupId: null }),
      });
      await loadMember();
    } finally {
      setSavingGroup(false);
    }
  }

  // ─── Derived values ─────────────────────────────────────────────────────────

  const totalPaid = member?.payments.reduce((s, p) => s + p.amount, 0) ?? 0;
  const balance = (member?.priceDA ?? 0) - totalPaid;

  const filteredGroups = groups.filter((g) => {
    if (member && g.category !== member.category) return false;
    if (groupSolidFilter && !g.isSolid) return false;
    return true;
  });

  const portalUrl = `https://aqasports.pro/swim/profile/${swimId}`;

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
  const activeGroup = member.effectiveGroup;
  const archivedGroupWarning = member.effectivelyUnassigned && member.group;

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
          <div className="text-[10px] text-[var(--muted)] uppercase font-semibold mb-1">Type</div>
          <div className="text-sm font-bold text-cyan-300">{member.formula}</div>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
          <div className="text-[10px] text-[var(--muted)] uppercase font-semibold mb-1">Duration</div>
          <div className="text-sm font-bold text-white">{member.duration || "3m"}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left column */}
        <div className="space-y-5">
          {/* Group Assignment Panel */}
          <Card>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Assigned Group</span>
                <div className="flex items-center gap-2">
                  {activeGroup && (
                    <Button size="sm" variant="danger" onClick={handleRemoveGroup} disabled={savingGroup}>
                      Remove
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => setShowChangeGroup(!showChangeGroup)}>
                    {showChangeGroup ? "Cancel" : activeGroup ? "Change Group" : "Assign Group"}
                  </Button>
                </div>
              </div>

              {archivedGroupWarning && (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-300">
                  Warning: The assigned group &quot;{member.group!.name}&quot; has been archived. This swimmer is currently considered unassigned.
                </div>
              )}

              {activeGroup ? (
                <div className="p-3 rounded-xl bg-slate-800/60 border border-white/5 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Group:</span>
                    <span className="font-bold text-white">{activeGroup.name}</span>
                  </div>
                  {activeGroup.coachName && (
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">Coach:</span>
                      <span className="font-semibold text-cyan-300">{activeGroup.coachName}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Schedule:</span>
                    <span className="text-slate-200">{activeGroup.schedule}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Type:</span>
                    <span className="text-slate-200">{activeGroup.level}</span>
                  </div>
                  <div className="pt-1">
                    {member.groupStatus === "accepted" && <Badge tone="success">Confirmed by client</Badge>}
                    {member.groupStatus === "proposed" && <Badge tone="warning">Pending client confirmation</Badge>}
                    {member.groupStatus === "rejected" && <Badge tone="danger">Rejected by client</Badge>}
                  </div>
                </div>
              ) : !archivedGroupWarning ? (
                <p className="text-xs italic text-[var(--muted)]">No active group assigned.</p>
              ) : null}

              {/* Change Group Panel */}
              {showChangeGroup && (
                <div className="space-y-3 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">Select New Group</span>
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
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {filteredGroups.length === 0 ? (
                      <p className="text-xs text-[var(--muted)] italic">No groups available for category &quot;{member.category}&quot;.</p>
                    ) : (
                      filteredGroups.map((g) => {
                        const enrolled = g._count?.swimmers ?? 0;
                        const isFull = enrolled >= g.capacity;
                        return (
                          <label
                            key={g.id}
                            className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                              selectedNewGroupId === g.id
                                ? "border-cyan-500 bg-cyan-950/30"
                                : "border-white/10 bg-slate-800/40 hover:border-white/20"
                            } ${isFull ? "opacity-60" : ""}`}
                          >
                            <input
                              type="radio"
                              name="newGroup"
                              value={g.id}
                              checked={selectedNewGroupId === g.id}
                              onChange={() => setSelectedNewGroupId(g.id)}
                              disabled={isFull}
                              className="accent-cyan-500"
                            />
                            <div className="flex-1 text-xs">
                              <div className="font-bold text-white">{g.name}</div>
                              <div className="text-[var(--muted)]">
                                {g.coachName ? `Coach: ${g.coachName} · ` : ""}{g.schedule}
                              </div>
                              <div className="text-[var(--muted)]">{enrolled}/{g.capacity} enrolled {isFull ? "- FULL" : ""}</div>
                            </div>
                            {g.isSolid && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-400 border border-emerald-800/50 font-bold">Solid</span>}
                          </label>
                        );
                      })
                    )}
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!selectedNewGroupId || savingGroup}
                    onClick={handleChangeGroup}
                  >
                    {savingGroup ? "Saving..." : "Confirm Assignment"}
                  </Button>
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

          {/* PVC Pass Card */}
          <Card>
            <div className="space-y-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">PVC Pass Card</span>
              {member.card ? (
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Card Code:</span>
                    <span className="font-mono font-bold text-cyan-300">{member.card.cardCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Status:</span>
                    <Badge tone={member.card.status === "active" ? "success" : "danger"}>{member.card.status}</Badge>
                  </div>
                  <Link
                    href={`/swim/card/${member.card.publicToken}`}
                    target="_blank"
                    className="block text-center py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold mt-2"
                  >
                    Open Pass Portal
                  </Link>
                </div>
              ) : (
                <p className="text-xs italic text-[var(--muted)]">No PVC pass issued. Issue one from the Cards Manager.</p>
              )}
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
                    Total: {member.priceDA.toLocaleString("fr-DZ")} DA · Paid: {totalPaid.toLocaleString("fr-DZ")} DA · Balance: {balance.toLocaleString("fr-DZ")} DA
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setShowSetPrice(!showSetPrice)}>
                    Set Price
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setShowAddPayment(!showAddPayment)}>
                    + Payment
                  </Button>
                </div>
              </div>

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
                      <label className="block text-[11px] text-slate-400 mb-1">Type</label>
                      <select
                        value={editFormula}
                        onChange={(e) => setEditFormula(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                      >
                        <option value="G10">G10</option>
                        <option value="MAX5">MAX5</option>
                        <option value="INDIVID">INDIVID</option>
                        <option value="Decouverte">Decouverte (Kids)</option>
                        <option value="Recommande">Recommande (Kids)</option>
                        <option value="Economique">Economique (Kids)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Duration</label>
                      <select
                        value={editDuration}
                        onChange={(e) => setEditDuration(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                      >
                        <option value="1m">1 Month</option>
                        <option value="3m">3 Months (Trimestre)</option>
                        <option value="6m">6 Months (Semestre)</option>
                        <option value="9m">9 Months (Annual)</option>
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
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { PageHeader, Badge, Button, Input, Card } from "@/components/admin/ui";

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
  createdAt: string;
  _count?: {
    swimmers: number;
  };
}

interface GroupDetail extends SwimGroup {
  swimmers: Array<{
    id: string;
    swimId: string;
    fullName: string;
    phone: string;
    level: string;
    paymentStatus: string;
    groupStatus: string;
    card: { cardCode: string } | null;
  }>;
}

export default function SwimGroupsPage() {
  const [groups, setGroups] = useState<SwimGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Group Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("homme");
  const [level, setLevel] = useState("beginner");
  const [coachName, setCoachName] = useState("");
  const [schedule, setSchedule] = useState("");
  const [capacity, setCapacity] = useState("10");
  const [notes, setNotes] = useState("");
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // View Group Detail Modal
  const [selectedGroup, setSelectedGroup] = useState<GroupDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  async function loadGroups() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/swim/groups");
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGroups();
  }, []);

  async function handleAddGroup(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingAdd(true);

    try {
      const res = await fetch("/api/admin/swim/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category,
          level,
          coachName,
          schedule,
          capacity: parseInt(capacity, 10),
          notes,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setName("");
        setCoachName("");
        setSchedule("");
        setNotes("");
        loadGroups();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingAdd(false);
    }
  }

  async function openGroupDetail(groupId: string) {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/swim/groups/${groupId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedGroup(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function toggleActive(group: SwimGroup) {
    try {
      const res = await fetch(`/api/admin/swim/groups/${group.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !group.active }),
      });
      if (res.ok) {
        loadGroups();
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sector 3: AQA Swim Groups Manager"
        description="Configure solid training groups, assign certified coaches, manage capacity quotas, and review enrolled swimmers."
        action={
          <Button onClick={() => setShowAddModal(true)} variant="primary">
            + New Group
          </Button>
        }
      />

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            Loading groups...
          </div>
        ) : groups.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            No training groups created yet. Click &quot;+ New Group&quot; to begin.
          </div>
        ) : (
          groups.map((g) => {
            const count = g._count?.swimmers ?? 0;
            const isFull = count >= g.capacity;

            return (
              <div
                key={g.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md p-5 flex flex-col justify-between hover:border-[var(--primary)]/40 transition-all shadow-sm group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-white text-base group-hover:text-cyan-400 transition-colors">
                      {g.name}
                    </h3>
                    <Badge tone={g.active ? "success" : "danger"}>
                      {g.active ? "Active" : "Archived"}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-800 text-slate-300 border border-white/10">
                      {g.category}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-sky-950/60 text-sky-400 border border-sky-800/40">
                      {g.level}
                    </span>
                  </div>

                  {/* Coach & Schedule */}
                  <div className="space-y-1.5 text-xs text-slate-300 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Coach:</span>
                      <span className="font-semibold text-cyan-300">
                        {g.coachName || "Unassigned"}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-slate-400 shrink-0">Schedule:</span>
                      <span className="font-medium text-slate-200 text-right">
                        {g.schedule}
                      </span>
                    </div>
                  </div>

                  {/* Capacity bar */}
                  <div className="space-y-1 mb-4">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Capacity Enrolled</span>
                      <span className="font-mono font-bold text-white">
                        {count} / {g.capacity}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isFull
                            ? "bg-rose-500"
                            : count > g.capacity * 0.7
                            ? "bg-amber-400"
                            : "bg-cyan-400"
                        }`}
                        style={{
                          width: `${Math.min((count / g.capacity) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1 text-xs"
                    onClick={() => openGroupDetail(g.id)}
                  >
                    View Swimmers ({count})
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="text-xs"
                    onClick={() => toggleActive(g)}
                  >
                    {g.active ? "Archive" : "Activate"}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Group Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Create Solid Training Group</h3>

            <form onSubmit={handleAddGroup} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Group Name *
                </label>
                <Input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Groupe A1 - Homme Soir"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
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
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option value="beginner">Debutante</option>
                    <option value="intermediate">Intermediaire</option>
                    <option value="advanced">Avance</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Coach Name
                  </label>
                  <Input
                    value={coachName}
                    onChange={(e) => setCoachName(e.target.value)}
                    placeholder="e.g. Coach Karim"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Max Capacity
                  </label>
                  <Input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    placeholder="10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Schedule (Days & Times) *
                </label>
                <Input
                  required
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  placeholder="e.g. Lundi & Mercredi: 18h00 - 20h00"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notes / Pool Lane
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Bassin olympique, lignes 3 et 4..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submittingAdd}
                  className="flex-1"
                >
                  Create Group
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Swimmers in Group Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white">
                  {selectedGroup.name}
                </h3>
                <p className="text-xs text-slate-400">
                  Coach: {selectedGroup.coachName || "Unassigned"} · {selectedGroup.schedule}
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setSelectedGroup(null)}
              >
                ✕ Close
              </Button>
            </div>

            <div className="overflow-y-auto flex-1">
              {selectedGroup.swimmers.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">
                  No swimmers currently assigned to this group.
                </p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400">
                      <th className="py-2 px-3">Swimmer</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Payment</th>
                      <th className="py-2 px-3">Pass</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {selectedGroup.swimmers.map((s) => (
                      <tr key={s.id}>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-white">{s.fullName}</div>
                          <div className="text-[10px] font-mono text-cyan-400">
                            {s.swimId} · {s.phone}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          {s.groupStatus === "accepted" && (
                            <Badge tone="success">Confirmed</Badge>
                          )}
                          {s.groupStatus === "proposed" && (
                            <Badge tone="warning">Proposed</Badge>
                          )}
                          {s.groupStatus === "rejected" && (
                            <Badge tone="danger">Rejected</Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {s.paymentStatus === "paid" && (
                            <Badge tone="success">Paid</Badge>
                          )}
                          {s.paymentStatus === "partial" && (
                            <Badge tone="warning">Partial</Badge>
                          )}
                          {s.paymentStatus === "unpaid" && (
                            <Badge tone="danger">Unpaid</Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300">
                          {s.card ? s.card.cardCode : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge, Button, Input } from "@/components/admin/ui";

interface CoachItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  specialties: string | null;
  hasAccount: boolean;
  role: "head_coach" | "coach" | "assistant";
  categories: string[];
  loginEnabled: boolean;
  lastLoginAt: string | null;
  activeGroups: Array<{
    groupId: string;
    groupName: string;
    category: string;
    role: string;
  }>;
}

interface GroupItem {
  id: string;
  name: string;
  category: string;
  level: string;
  schedule: string;
  capacity: number;
  legacyCoachName: string | null;
  swimmerCount: number;
  staff: Array<{
    id: string;
    coachId: string;
    coachName: string;
    role: string;
  }>;
}

interface AbsenceItem {
  id: string;
  coachId: string;
  coachName: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  details: string | null;
  status: string;
  decidedAt: string | null;
}

interface ReplacementItem {
  id: string;
  sessionId: string;
  groupName: string;
  category: string;
  sessionDate: string;
  startTime: string;
  originalCoachName: string;
  substituteCoachName: string;
  status: string;
  note: string | null;
  createdAt: string;
}

export function SwimCoachingDesk() {
  const [activeTab, setActiveTab] = useState<"staff" | "staffing" | "replacements">("staff");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [kpis, setKpis] = useState({
    totalStaffCount: 0,
    coachesWithApp: 0,
    pendingAbsencesCount: 0,
    pendingReplacementsCount: 0,
  });
  const [coaches, setCoaches] = useState<CoachItem[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [absences, setAbsences] = useState<AbsenceItem[]>([]);
  const [replacements, setReplacements] = useState<ReplacementItem[]>([]);

  // Modal states
  const [editingCoach, setEditingCoach] = useState<CoachItem | null>(null);
  const [coachEmail, setCoachEmail] = useState("");
  const [coachPassword, setCoachPassword] = useState("");
  const [coachRole, setCoachRole] = useState<"head_coach" | "coach" | "assistant">("coach");
  const [coachCategories, setCoachCategories] = useState<string[]>([]);
  const [coachLoginEnabled, setCoachLoginEnabled] = useState(true);
  const [savingCoach, setSavingCoach] = useState(false);

  // Group staffing modal
  const [editingGroup, setEditingGroup] = useState<GroupItem | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [selectedAssistantIds, setSelectedAssistantIds] = useState<string[]>([]);
  const [savingStaffing, setSavingStaffing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/swim/coaching");
      if (!res.ok) throw new Error("Failed to load coaching data.");
      const data = await res.json();
      setKpis(data.kpis);
      setCoaches(data.coaches);
      setGroups(data.groups);
      setAbsences(data.absences);
      setReplacements(data.replacements);
    } catch (err: any) {
      setError(err?.message || "Error loading coaching data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open coach account modal
  function handleOpenCoachModal(c: CoachItem) {
    setEditingCoach(c);
    setCoachEmail(c.email || "");
    setCoachPassword("");
    setCoachRole(c.role || "coach");
    setCoachCategories(c.categories || ["homme", "femme", "enfants"]);
    setCoachLoginEnabled(c.loginEnabled ?? true);
  }

  async function handleSaveCoachAccount() {
    if (!editingCoach) return;
    if (!coachEmail) {
      alert("Email is required.");
      return;
    }
    setSavingCoach(true);
    try {
      const res = await fetch("/api/admin/swim/coaching/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coachId: editingCoach.id,
          email: coachEmail,
          password: coachPassword || undefined,
          role: coachRole,
          categories: coachCategories,
          loginEnabled: coachLoginEnabled,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setEditingCoach(null);
      await fetchData();
    } catch (err: any) {
      alert(err?.message || "Failed to save coach account.");
    } finally {
      setSavingCoach(false);
    }
  }

  // Open group staffing modal
  function handleOpenStaffingModal(g: GroupItem) {
    setEditingGroup(g);
    const lead = g.staff.find((s) => s.role === "lead");
    const assts = g.staff.filter((s) => s.role === "assistant").map((s) => s.coachId);
    setSelectedLeadId(lead?.coachId || "");
    setSelectedAssistantIds(assts);
  }

  async function handleSaveGroupStaffing() {
    if (!editingGroup) return;
    setSavingStaffing(true);
    try {
      const res = await fetch(`/api/admin/swim/coaching/groups/${editingGroup.id}/staff`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadCoachId: selectedLeadId || null,
          assistantCoachIds: selectedAssistantIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      setEditingGroup(null);
      await fetchData();
    } catch (err: any) {
      alert(err?.message || "Failed to update group staffing.");
    } finally {
      setSavingStaffing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-white/10">
          <div className="text-xs text-slate-400 font-medium">Equipe Entraîneurs</div>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {kpis.totalStaffCount}
          </div>
          <div className="text-[11px] text-sky-400 mt-1">Total coachs enregistrés</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-white/10">
          <div className="text-xs text-slate-400 font-medium">Comptes App Activés</div>
          <div className="text-2xl font-bold font-mono text-teal-400 mt-1">
            {kpis.coachesWithApp}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Accès mobile actif</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-white/10">
          <div className="text-xs text-slate-400 font-medium">Absences en Attente</div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
            {kpis.pendingAbsencesCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Demandes à traiter</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-white/10">
          <div className="text-xs text-slate-400 font-medium">Remplacements Proposés</div>
          <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
            {kpis.pendingReplacementsCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">En attente d&apos;acceptation</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 gap-2">
        <button
          onClick={() => setActiveTab("staff")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "staff"
              ? "border-[var(--primary)] text-[var(--primary)]"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          1. Entraîneurs & Accès App
        </button>
        <button
          onClick={() => setActiveTab("staffing")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "staffing"
              ? "border-[var(--primary)] text-[var(--primary)]"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          2. Affectation Groupes (Staffing)
        </button>
        <button
          onClick={() => setActiveTab("replacements")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "replacements"
              ? "border-[var(--primary)] text-[var(--primary)]"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          3. Absences & Remplacements
        </button>
      </div>

      {loading && (
        <div className="p-12 text-center text-sm text-slate-400 animate-pulse">
          Chargement de l&apos;espace coaching...
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/20 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* TAB 1: Staff & App Access */}
      {!loading && activeTab === "staff" && (
        <div className="rounded-xl bg-slate-900 border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-white">Comptes AQA Coaches App</h3>
            <span className="text-xs text-slate-400">{coaches.length} coachs trouvés</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 border-b border-white/10">
                <tr>
                  <th className="p-3">Entraîneur</th>
                  <th className="p-3">Email de Connexion</th>
                  <th className="p-3">Rôle</th>
                  <th className="p-3">Catégories Autorisées</th>
                  <th className="p-3">Statut Accès</th>
                  <th className="p-3">Groupes Actifs</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {coaches.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02]">
                    <td className="p-3">
                      <div className="font-semibold text-white">{c.name}</div>
                      <div className="text-[11px] text-slate-400">{c.phone || "Pas de tél"}</div>
                    </td>
                    <td className="p-3 font-mono text-slate-300">
                      {c.email || <span className="text-slate-500 italic">Non configuré</span>}
                    </td>
                    <td className="p-3">
                      {c.role === "head_coach" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-purple-950 text-purple-300 border border-purple-800/50 font-semibold">
                          Head Coach
                        </span>
                      ) : c.role === "assistant" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                          Assistant (Vue seule)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-sky-950 text-sky-300 border border-sky-800/50 font-semibold">
                          Entraîneur
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {c.categories && c.categories.length > 0 ? (
                          c.categories.map((cat) => (
                            <span key={cat} className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300">
                              {cat}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 text-[11px]">Toutes</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      {c.loginEnabled ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/40 font-medium">
                          Actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-medium">
                          Désactivé
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="font-mono text-slate-300">{c.activeGroups.length}</span> groupe(s)
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenCoachModal(c)}
                      >
                        {c.hasAccount ? "Modifier Accès" : "Activer Compte"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Group Staffing */}
      {!loading && activeTab === "staffing" && (
        <div className="rounded-xl bg-slate-900 border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-white">Affectation des Groupes (Lead & Assistants)</h3>
            <span className="text-xs text-slate-400">{groups.length} groupes</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 border-b border-white/10">
                <tr>
                  <th className="p-3">Groupe</th>
                  <th className="p-3">Catégorie</th>
                  <th className="p-3">Horaire</th>
                  <th className="p-3">Entraîneur Principal (Lead)</th>
                  <th className="p-3">Assistants</th>
                  <th className="p-3">Nageurs</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {groups.map((g) => {
                  const lead = g.staff.find((s) => s.role === "lead");
                  const assistants = g.staff.filter((s) => s.role === "assistant");

                  return (
                    <tr key={g.id} className="hover:bg-white/[0.02]">
                      <td className="p-3 font-semibold text-white">{g.name}</td>
                      <td className="p-3">
                        <span className="capitalize text-slate-300">{g.category}</span>
                      </td>
                      <td className="p-3 text-slate-400 font-mono text-[11px]">{g.schedule}</td>
                      <td className="p-3">
                        {lead ? (
                          <span className="font-semibold text-sky-400">{lead.coachName}</span>
                        ) : (
                          <span className="text-amber-400/80 italic">Non assigné</span>
                        )}
                      </td>
                      <td className="p-3">
                        {assistants.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {assistants.map((a) => (
                              <span key={a.id} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                                {a.coachName}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Aucun</span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-slate-300">
                        {g.swimmerCount} / {g.capacity}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleOpenStaffingModal(g)}
                        >
                          Gérer Staff
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Absences & Replacements */}
      {!loading && activeTab === "replacements" && (
        <div className="space-y-6">
          <div className="rounded-xl bg-slate-900 border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-sm font-semibold text-white">Historique & Demandes d&apos;Absence</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/60 text-slate-400 border-b border-white/10">
                  <tr>
                    <th className="p-3">Coach</th>
                    <th className="p-3">Période</th>
                    <th className="p-3">Motif</th>
                    <th className="p-3">Détails</th>
                    <th className="p-3">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {absences.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-500">
                        Aucune absence enregistrée.
                      </td>
                    </tr>
                  ) : (
                    absences.map((a) => (
                      <tr key={a.id}>
                        <td className="p-3 font-semibold text-white">{a.coachName}</td>
                        <td className="p-3 font-mono text-slate-300 text-[11px]">
                          {a.startsAt.split("T")[0]} au {a.endsAt.split("T")[0]}
                        </td>
                        <td className="p-3 capitalize text-slate-300">{a.reason}</td>
                        <td className="p-3 text-slate-400">{a.details || "-"}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              a.status === "approved"
                                ? "bg-emerald-950 text-emerald-300"
                                : a.status === "rejected"
                                ? "bg-red-950 text-red-300"
                                : "bg-amber-950 text-amber-300"
                            }`}
                          >
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl bg-slate-900 border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-sm font-semibold text-white">Remplacements de Séances</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/60 text-slate-400 border-b border-white/10">
                  <tr>
                    <th className="p-3">Date & Heure</th>
                    <th className="p-3">Groupe</th>
                    <th className="p-3">Coach Titulaire</th>
                    <th className="p-3">Coach Remplaçant</th>
                    <th className="p-3">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {replacements.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-500">
                        Aucun remplacement en cours.
                      </td>
                    </tr>
                  ) : (
                    replacements.map((r) => (
                      <tr key={r.id}>
                        <td className="p-3 font-mono text-slate-300">
                          {r.sessionDate} {r.startTime}
                        </td>
                        <td className="p-3 font-semibold text-white">{r.groupName}</td>
                        <td className="p-3 text-slate-400">{r.originalCoachName}</td>
                        <td className="p-3 font-semibold text-sky-400">{r.substituteCoachName}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-950 text-cyan-300">
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Edit Coach Account */}
      {editingCoach && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/15 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              Configurer Accès Mobile : {editingCoach.name}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Email de Connexion</label>
                <Input
                  type="email"
                  value={coachEmail}
                  onChange={(e) => setCoachEmail(e.target.value)}
                  placeholder="coach@aqasports.pro"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  Mot de passe {editingCoach.hasAccount ? "(laisser vide pour ne pas changer)" : ""}
                </label>
                <Input
                  type="password"
                  value={coachPassword}
                  onChange={(e) => setCoachPassword(e.target.value)}
                  placeholder="Minimum 6 caractères"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Rôle sur l&apos;Application</label>
                <select
                  value={coachRole}
                  onChange={(e) => setCoachRole(e.target.value as any)}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg p-2 text-white"
                >
                  <option value="coach">Entraîneur (Ses groupes uniquement)</option>
                  <option value="head_coach">Head Coach (Tous les groupes & gestion)</option>
                  <option value="assistant">Assistant (Ses groupes en consultation seule)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="loginEnabled"
                  checked={coachLoginEnabled}
                  onChange={(e) => setCoachLoginEnabled(e.target.checked)}
                  className="rounded bg-slate-800 border-white/20 text-sky-500"
                />
                <label htmlFor="loginEnabled" className="text-slate-300 font-medium">
                  Autoriser la connexion sur l&apos;application AQA Coaches
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
              <Button variant="secondary" onClick={() => setEditingCoach(null)}>
                Annuler
              </Button>
              <Button onClick={handleSaveCoachAccount} disabled={savingCoach}>
                {savingCoach ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Group Staffing */}
      {editingGroup && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/15 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              Affectation Staff : {editingGroup.name}
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  Entraîneur Principal (Lead Coach)
                </label>
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg p-2 text-white"
                >
                  <option value="">-- Aucun coach assigné --</option>
                  {coaches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Ce coach sera enregistré comme titulaire principal de ce créneau.
                </p>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  Coachs Assistants
                </label>
                <div className="max-h-40 overflow-y-auto space-y-1 p-2 bg-slate-800/60 rounded-lg border border-white/5">
                  {coaches
                    .filter((c) => c.id !== selectedLeadId)
                    .map((c) => {
                      const isChecked = selectedAssistantIds.includes(c.id);
                      return (
                        <label key={c.id} className="flex items-center gap-2 text-slate-300 py-1 hover:bg-white/5 px-1 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAssistantIds([...selectedAssistantIds, c.id]);
                              } else {
                                setSelectedAssistantIds(selectedAssistantIds.filter((id) => id !== c.id));
                              }
                            }}
                            className="rounded bg-slate-700 border-white/20 text-sky-500"
                          />
                          <span>{c.name}</span>
                        </label>
                      );
                    })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
              <Button variant="secondary" onClick={() => setEditingGroup(null)}>
                Annuler
              </Button>
              <Button onClick={handleSaveGroupStaffing} disabled={savingStaffing}>
                {savingStaffing ? "Mise à jour..." : "Enregistrer l'Affectation"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

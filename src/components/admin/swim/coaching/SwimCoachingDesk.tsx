"use client";

import { useState, useEffect, useCallback } from "react";
import { Alert, Badge, Button, Input } from "@/components/admin/ui";

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

interface SessionFeedItem {
  id: string;
  groupName: string;
  category: string;
  sessionDate: string;
  startTime: string;
  coachName: string;
  presentCount: number;
  absentCount: number;
  totalMarked: number;
  ratingStars: number | null;
  ratingNotes: string | null;
  ratedByCoachName: string | null;
}

interface SwimmerSuiviItem {
  id: string;
  swimId: string;
  fullName: string;
  phone: string;
  category: string;
  level: string;
  groupName: string;
  totalPresences: number;
  totalAbsences: number;
  attendanceRate: number;
  reviewCount: number;
  avgSkillScore: number;
  badgeKey: string;
  badgeLabel: string;
  badgeAsset: string;
  stageKey: string;
  stageLabel: string;
  stageAsset: string;
  bars?: {
    basics: number;
    crawl: number;
    backstroke: number;
    breaststroke: number;
    butterfly: number;
  };
  lastTouchedBar?: string;
  totalDistanceMeters?: number;
  record50m?: number | null;
  recordApnea?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  wordFromCoach?: string | null;
}

interface HonorNominationItem {
  id: string;
  honorType: "swimmer_of_the_month" | "swimmer_of_the_year";
  periodKey: string;
  memberId: string;
  memberName: string;
  swimId: string;
  groupName: string;
  coachId: string;
  coachName: string;
  note: string | null;
  bars: Record<string, number> | null;
  totalDistanceMeters: number;
  record50m: number | null;
  recordApnea: number | null;
  wordFromCoach: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  decidedAt: string | null;
}

interface HonorLockStatus {
  monthPeriod: string;
  yearPeriod: string;
  swimmerOfTheMonthLocked: boolean;
  swimmerOfTheMonthWinner: HonorNominationItem | null;
  swimmerOfTheYearLocked: boolean;
  swimmerOfTheYearWinner: HonorNominationItem | null;
}

interface AppConfig {
  enabled: boolean;
  announcement: string;
  reminderMinutes: number;
}

export function SwimCoachingDesk() {
  const [activeTab, setActiveTab] = useState<
    "staff" | "staffing" | "sessions" | "suivi" | "replacements"
  >("staff");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; tone: "success" | "danger" } | null>(null);

  const [kpis, setKpis] = useState({
    totalStaffCount: 0,
    coachesWithApp: 0,
    pendingAbsencesCount: 0,
    pendingReplacementsCount: 0,
    totalSwimmersCount: 0,
    pendingHonorsCount: 0,
  });
  const [coaches, setCoaches] = useState<CoachItem[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [absences, setAbsences] = useState<AbsenceItem[]>([]);
  const [replacements, setReplacements] = useState<ReplacementItem[]>([]);
  const [recentSessions, setRecentSessions] = useState<SessionFeedItem[]>([]);
  const [swimmers, setSwimmers] = useState<SwimmerSuiviItem[]>([]);
  const [honorLockStatus, setHonorLockStatus] = useState<HonorLockStatus | null>(null);
  const [honorNominations, setHonorNominations] = useState<HonorNominationItem[]>([]);
  const [appConfig, setAppConfig] = useState<AppConfig>({
    enabled: true,
    announcement: "",
    reminderMinutes: 10,
  });

  // Modal states: Coach Account
  const [editingCoach, setEditingCoach] = useState<CoachItem | null>(null);
  const [coachEmail, setCoachEmail] = useState("");
  const [coachPassword, setCoachPassword] = useState("");
  const [coachRole, setCoachRole] = useState<"head_coach" | "coach" | "assistant">("coach");
  const [coachCategories, setCoachCategories] = useState<string[]>([]);
  const [coachLoginEnabled, setCoachLoginEnabled] = useState(true);
  const [savingCoach, setSavingCoach] = useState(false);

  // Modal states: Group Staffing
  const [editingGroup, setEditingGroup] = useState<GroupItem | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [selectedAssistantIds, setSelectedAssistantIds] = useState<string[]>([]);
  const [savingStaffing, setSavingStaffing] = useState(false);

  // Modal states: Award Swimmer Badge
  const [awardingSwimmer, setAwardingSwimmer] = useState<SwimmerSuiviItem | null>(null);
  const [selectedBadgeKey, setSelectedBadgeKey] = useState("beginner");
  const [badgeRecommendedLevel, setBadgeRecommendedLevel] = useState("");
  const [savingBadge, setSavingBadge] = useState(false);

  // App Config form
  const [savingAppConfig, setSavingAppConfig] = useState(false);
  const [appEnabledDraft, setAppEnabledDraft] = useState(true);
  const [announcementDraft, setAnnouncementDraft] = useState("");
  const [reminderDraft, setReminderDraft] = useState(10);

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
      setRecentSessions(data.recentSessions || []);
      setSwimmers(data.swimmers || []);
      setHonorLockStatus(data.honorLockStatus || null);
      setHonorNominations(data.honorNominations || []);
      if (data.appConfig) {
        setAppConfig(data.appConfig);
        setAppEnabledDraft(data.appConfig.enabled);
        setAnnouncementDraft(data.appConfig.announcement || "");
        setReminderDraft(data.appConfig.reminderMinutes || 10);
      }
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
      setFeedback({ text: "Email is required.", tone: "danger" });
      return;
    }
    setSavingCoach(true);
    setFeedback(null);
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
      setFeedback({ text: err?.message || "Failed to save coach account.", tone: "danger" });
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
    setFeedback(null);
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
      setFeedback({ text: err?.message || "Failed to update group staffing.", tone: "danger" });
    } finally {
      setSavingStaffing(false);
    }
  }

  // Handle absence decision
  async function handleDecideAbsence(absenceId: string, status: "approved" | "rejected") {
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/swim/coaching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DECIDE_ABSENCE",
          absenceId,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update absence");
      await fetchData();
    } catch (err: any) {
      setFeedback({ text: err?.message || "Error updating absence.", tone: "danger" });
    }
  }

  // Handle save app config
  async function handleSaveAppConfig() {
    setSavingAppConfig(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/swim/coaching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_APP_CONFIG",
          enabled: appEnabledDraft,
          announcement: announcementDraft,
          reminderMinutes: reminderDraft,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");
      setFeedback({ text: "Paramètres de l'application AQA Coaches enregistrés.", tone: "success" });
      await fetchData();
    } catch (err: any) {
      setFeedback({ text: err?.message || "Error saving app config.", tone: "danger" });
    } finally {
      setSavingAppConfig(false);
    }
  }

  // Open award badge modal
  function handleOpenAwardBadge(s: SwimmerSuiviItem) {
    setAwardingSwimmer(s);
    setSelectedBadgeKey(s.badgeKey || "beginner");
    setBadgeRecommendedLevel(s.level || "");
  }

  // Save award badge
  async function handleSaveSwimmerBadge() {
    if (!awardingSwimmer) return;
    setSavingBadge(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/swim/coaching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "AWARD_SWIMMER_BADGE",
          memberId: awardingSwimmer.id,
          badgeKey: selectedBadgeKey,
          recommendedLevel: badgeRecommendedLevel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to award badge");
      setAwardingSwimmer(null);
      await fetchData();
    } catch (err: any) {
      setFeedback({ text: err?.message || "Error awarding badge.", tone: "danger" });
    } finally {
      setSavingBadge(false);
    }
  }

  // Decide Swimmer of the Month / Swimmer of the Year nomination
  async function handleDecideHonorNomination(
    requestId: string,
    decision: "approved" | "rejected"
  ) {
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/swim/coaching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DECIDE_HONOR_NOMINATION",
          requestId,
          decision,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process honor nomination");
      await fetchData();
    } catch (err: any) {
      setFeedback({ text: err?.message || "Error processing honor nomination.", tone: "danger" });
    }
  }

  return (
    <div className="space-y-6">
      {feedback && <Alert tone={feedback.tone}>{feedback.text}</Alert>}
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
          <div className="text-xs text-slate-400 font-medium">Effectif Nageurs</div>
          <div className="text-2xl font-bold font-mono text-sky-400 mt-1">
            {kpis.totalSwimmersCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Suivi technique actif</div>
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

      {/* Navigation Tabs */}
      <div className="flex border-b border-white/10 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("staff")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "staff"
              ? "border-[var(--primary)] text-[var(--primary)]"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          1. Entraîneurs & Accès Mobile
        </button>
        <button
          onClick={() => setActiveTab("staffing")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "staffing"
              ? "border-[var(--primary)] text-[var(--primary)]"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          2. Affectation Groupes (Staffing)
        </button>
        <button
          onClick={() => setActiveTab("sessions")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "sessions"
              ? "border-[var(--primary)] text-[var(--primary)]"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          3. Séances, Émargements & Notations
        </button>
        <button
          onClick={() => setActiveTab("suivi")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === "suivi"
              ? "border-[var(--primary)] text-[var(--primary)]"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <span>4. Suivi Technique, Bilan & Badges AQA</span>
          {kpis.pendingHonorsCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              {kpis.pendingHonorsCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("replacements")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "replacements"
              ? "border-[var(--primary)] text-[var(--primary)]"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          5. Absences, Remplacements & Paramètres App
        </button>
      </div>

      {loading && (
        <div className="p-12 text-center text-sm text-slate-400 animate-pulse">
          Chargement de l&apos;espace coaching AQA Swim...
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

      {/* TAB 3: Recent Sessions, Attendance & Ratings */}
      {!loading && activeTab === "sessions" && (
        <div className="rounded-xl bg-slate-900 border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold text-white">Séances Récentes & Émargement Bassin</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Présences binaires (Présent / Absent) et notations pédagogiques attribuées par les coachs (1 à 5 étoiles).
              </p>
            </div>
            <span className="text-xs text-slate-400">{recentSessions.length} séances affichées</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 border-b border-white/10">
                <tr>
                  <th className="p-3">Date & Heure</th>
                  <th className="p-3">Groupe</th>
                  <th className="p-3">Coach Responsable</th>
                  <th className="p-3">Émargement Binaire</th>
                  <th className="p-3">Notation Séance</th>
                  <th className="p-3">Remarques Coach</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentSessions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500">
                      Aucune séance enregistrée récemment.
                    </td>
                  </tr>
                ) : (
                  recentSessions.map((s) => (
                    <tr key={s.id} className="hover:bg-white/[0.02]">
                      <td className="p-3 font-mono text-slate-300">
                        {s.sessionDate} • {s.startTime}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-white">{s.groupName}</div>
                        <div className="text-[11px] text-slate-400 uppercase">{s.category}</div>
                      </td>
                      <td className="p-3 font-semibold text-sky-400">{s.coachName}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                            Présents: {s.presentCount}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-300 border border-red-800/40">
                            Absents: {s.absentCount}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        {s.ratingStars ? (
                          <div className="flex items-center gap-1 font-mono text-amber-400 font-bold">
                            <span>{s.ratingStars} / 5</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Non notée</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-300 max-w-xs truncate">
                        {s.ratingNotes || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Suivi Technique, Bilan & Badges AQA */}
      {!loading && activeTab === "suivi" && (
        <div className="space-y-6">
          {/* Swimmer of the Month & Swimmer of the Year Nominations Comparison Panel */}
          <div className="rounded-xl bg-slate-900 border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Comparatif & Election : Nageur du Mois & Nageur de l&apos;Année
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Les coachs proposent leurs candidats depuis l&apos;étape Bilan. Dès que la direction accepte un lauréat, ce badge est verrouillé pour tous les autres coachs jusqu&apos;au mois ou à l&apos;année suivante.
                </p>
              </div>
              {honorLockStatus && (
                <div className="flex flex-wrap gap-2 text-xs">
                  <div
                    className={`px-3 py-1.5 rounded-lg border font-medium ${
                      honorLockStatus.swimmerOfTheMonthLocked
                        ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                        : "bg-slate-800/80 border-white/10 text-slate-300"
                    }`}
                  >
                    <span className="font-mono font-bold mr-1">
                      Mois {honorLockStatus.monthPeriod}:
                    </span>
                    {honorLockStatus.swimmerOfTheMonthLocked &&
                    honorLockStatus.swimmerOfTheMonthWinner
                      ? `Elu: ${honorLockStatus.swimmerOfTheMonthWinner.memberName} (Verrouillé)`
                      : "Ouvert aux nominations"}
                  </div>
                  <div
                    className={`px-3 py-1.5 rounded-lg border font-medium ${
                      honorLockStatus.swimmerOfTheYearLocked
                        ? "bg-amber-950/60 border-amber-500/40 text-amber-300"
                        : "bg-slate-800/80 border-white/10 text-slate-300"
                    }`}
                  >
                    <span className="font-mono font-bold mr-1">
                      Année {honorLockStatus.yearPeriod}:
                    </span>
                    {honorLockStatus.swimmerOfTheYearLocked &&
                    honorLockStatus.swimmerOfTheYearWinner
                      ? `Elu: ${honorLockStatus.swimmerOfTheYearWinner.memberName} (Verrouillé)`
                      : "Ouvert aux nominations"}
                  </div>
                </div>
              )}
            </div>

            {honorNominations.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Aucune demande de nomination Nageur du Mois / Nageur de l&apos;Année soumise par les coachs pour le moment.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/60 text-slate-400 border-b border-white/10">
                    <tr>
                      <th className="p-3">Distinction & Période</th>
                      <th className="p-3">Candidat Nageur</th>
                      <th className="p-3">Proposé par</th>
                      <th className="p-3">Barres 0-200%</th>
                      <th className="p-3">Distance Cumulée & Records</th>
                      <th className="p-3">Mot du Coach / Argumentaire</th>
                      <th className="p-3">Statut</th>
                      <th className="p-3 text-right">Décision ERP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {honorNominations.map((nom) => {
                      const isMonth = nom.honorType === "swimmer_of_the_month";
                      const isPeriodLocked = isMonth
                        ? honorLockStatus?.swimmerOfTheMonthLocked &&
                          honorLockStatus?.monthPeriod === nom.periodKey
                        : honorLockStatus?.swimmerOfTheYearLocked &&
                          honorLockStatus?.yearPeriod === nom.periodKey;

                      return (
                        <tr key={nom.id} className="hover:bg-white/[0.02]">
                          <td className="p-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                                isMonth
                                  ? "bg-cyan-950 text-cyan-300 border-cyan-800/50"
                                  : "bg-amber-950 text-amber-300 border-amber-800/50"
                              }`}
                            >
                              {isMonth ? "NAGEUR DU MOIS" : "NAGEUR DE L'ANNEE"}
                            </span>
                            <div className="text-[11px] font-mono text-slate-400 mt-1">
                              Période: {nom.periodKey}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-white">{nom.memberName}</div>
                            <div className="text-[11px] text-slate-400">
                              {nom.groupName} • <span className="font-mono">{nom.swimId}</span>
                            </div>
                          </td>
                          <td className="p-3 font-medium text-sky-400">{nom.coachName}</td>
                          <td className="p-3">
                            {nom.bars ? (
                              <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                  Bas: {nom.bars.basics ?? 0}%
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300">
                                  Crw: {nom.bars.crawl ?? 0}%
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-teal-300">
                                  Dos: {nom.bars.backstroke ?? 0}%
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300">
                                  Brs: {nom.bars.breaststroke ?? 0}%
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">
                                  Pap: {nom.bars.butterfly ?? 0}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                          <td className="p-3 font-mono text-[11px] text-slate-300">
                            <div className="text-teal-400 font-bold">
                              {nom.totalDistanceMeters || 0} m cumulés
                            </div>
                            <div className="text-slate-400">
                              50m: {nom.record50m ? `${nom.record50m}s` : "-"} | Apnée:{" "}
                              {nom.recordApnea ? `${nom.recordApnea}s` : "-"}
                            </div>
                          </td>
                          <td className="p-3 text-slate-300 max-w-xs">
                            {nom.wordFromCoach || nom.note || "-"}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                nom.status === "approved"
                                  ? "bg-emerald-950 text-emerald-300 border-emerald-800/40"
                                  : nom.status === "rejected"
                                  ? "bg-red-950 text-red-300 border-red-800/40"
                                  : "bg-amber-950 text-amber-300 border-amber-800/40"
                              }`}
                            >
                              {nom.status === "approved"
                                ? "ELU & VERROUILLE"
                                : nom.status === "rejected"
                                ? "REFUSE"
                                : "EN ATTENTE"}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            {nom.status === "pending" && !isPeriodLocked && (
                              <div className="flex justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleDecideHonorNomination(nom.id, "rejected")}
                                >
                                  Refuser
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleDecideHonorNomination(nom.id, "approved")}
                                >
                                  Accepter & Elire
                                </Button>
                              </div>
                            )}
                            {nom.status === "pending" && isPeriodLocked && (
                              <span className="text-[11px] text-slate-500 italic">
                                Période déjà attribuée
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Swimmers Suivi & Bilan Table */}
          <div className="rounded-xl bg-slate-900 border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Suivi Technique (5 Barres 0-200%), Bilan Physique & Badges AQA
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  0% à 100% : Evaluation Technique • 100% à 200% : Développement Elite (Endurance, Vitesse, Force) • Volume cumulé pour l&apos;App Membre AQA.
                </p>
              </div>
              <span className="text-xs text-slate-400">{swimmers.length} nageurs</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/60 text-slate-400 border-b border-white/10">
                  <tr>
                    <th className="p-3">Nageur</th>
                    <th className="p-3">Groupe & Etape</th>
                    <th className="p-3">5 Barres Progression (0-200%)</th>
                    <th className="p-3">Volume Cumulé</th>
                    <th className="p-3">Records & Physique</th>
                    <th className="p-3">Badge & Mot du Coach</th>
                    <th className="p-3">Assiduité</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {swimmers.map((m) => (
                    <tr key={m.id} className="hover:bg-white/[0.02]">
                      <td className="p-3">
                        <div className="font-semibold text-white">{m.fullName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{m.swimId}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-slate-200 font-medium">{m.groupName}</div>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-teal-300 border border-teal-800/40">
                          {m.stageLabel}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-white/5">
                            1.Bas: {m.bars?.basics ?? 0}%
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 border border-white/5">
                            2.Crw: {m.bars?.crawl ?? 0}%
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-teal-300 border border-white/5">
                            3.Dos: {m.bars?.backstroke ?? 0}%
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 border border-white/5">
                            4.Brs: {m.bars?.breaststroke ?? 0}%
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-white/5">
                            5.Pap: {m.bars?.butterfly ?? 0}%
                          </span>
                        </div>
                      </td>
                      <td className="p-3 font-mono font-bold text-teal-400">
                        {m.totalDistanceMeters ?? 0} m
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-300">
                        <div>
                          50m: {m.record50m ? `${m.record50m}s` : "-"} | Apnée:{" "}
                          {m.recordApnea ? `${m.recordApnea}s` : "-"}
                        </div>
                        <div className="text-slate-400">
                          Poids: {m.weightKg ? `${m.weightKg}kg` : "-"} | Taille:{" "}
                          {m.heightCm ? `${m.heightCm}cm` : "-"}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-950 text-sky-300 border border-sky-800/50">
                          {m.badgeLabel}
                        </span>
                        {m.wordFromCoach && (
                          <div className="text-[11px] text-slate-400 mt-1 max-w-xs truncate">
                            &ldquo;{m.wordFromCoach}&rdquo;
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`font-mono font-bold ${
                            m.attendanceRate >= 75 ? "text-emerald-400" : "text-amber-400"
                          }`}
                        >
                          {m.attendanceRate}%
                        </span>
                        <span className="text-slate-500 text-[11px] ml-1">
                          ({m.totalPresences}P / {m.totalAbsences}A)
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleOpenAwardBadge(m)}
                        >
                          Attribuer Badge
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Absences, Replacements & App Settings */}
      {!loading && activeTab === "replacements" && (
        <div className="space-y-6">
          {/* Global Coach App Settings Card */}
          <div className="rounded-xl bg-slate-900 border border-white/10 p-5">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Pilotage Global de l&apos;App AQA Coaches</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Contrôle d&apos;accès, annonce diffusée en haut du planning, et rappel 10 min avant la fin de séance.
                </p>
              </div>
              <Button size="sm" onClick={handleSaveAppConfig} disabled={savingAppConfig}>
                {savingAppConfig ? "Enregistrement..." : "Sauvegarder Paramètres"}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-800/60 border border-white/5 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-white font-medium">
                  <input
                    type="checkbox"
                    checked={appEnabledDraft}
                    onChange={(e) => setAppEnabledDraft(e.target.checked)}
                    className="rounded bg-slate-700 border-white/20 text-sky-500"
                  />
                  <span>Autoriser l&apos;accès à l&apos;application</span>
                </label>
                <p className="text-[11px] text-slate-400">
                  Si décoché, les entraîneurs verront un écran de maintenance lors de l&apos;ouverture.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-800/60 border border-white/5 space-y-2">
                <label className="block text-slate-300 font-medium">Rappel Fin de Séance (Minutes)</label>
                <Input
                  type="number"
                  min={5}
                  max={30}
                  value={reminderDraft}
                  onChange={(e) => setReminderDraft(parseInt(e.target.value, 10) || 10)}
                />
                <p className="text-[11px] text-slate-400">
                  Délai avant la fin de la séance pour inviter le coach à valider l&apos;émargement.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-800/60 border border-white/5 space-y-2">
                <label className="block text-slate-300 font-medium">Annonce Générale aux Coachs</label>
                <Input
                  type="text"
                  placeholder="Ex: Réunion technique ce jeudi 18h..."
                  value={announcementDraft}
                  onChange={(e) => setAnnouncementDraft(e.target.value)}
                />
                <p className="text-[11px] text-slate-400">
                  Bannière affichée en tête de l&apos;application pour tous les entraîneurs.
                </p>
              </div>
            </div>
          </div>

          {/* Absences Feed */}
          <div className="rounded-xl bg-slate-900 border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-sm font-semibold text-white">Demandes d&apos;Absence des Coachs</h3>
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
                    <th className="p-3 text-right">Décision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {absences.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-500">
                        Aucune absence enregistrée.
                      </td>
                    </tr>
                  ) : (
                    absences.map((a) => (
                      <tr key={a.id} className="hover:bg-white/[0.02]">
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
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-800/40"
                                : a.status === "rejected"
                                ? "bg-red-950 text-red-300 border border-red-800/40"
                                : "bg-amber-950 text-amber-300 border border-amber-800/40"
                            }`}
                          >
                            {a.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {a.status === "pending" && (
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleDecideAbsence(a.id, "rejected")}
                              >
                                Rejeter
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleDecideAbsence(a.id, "approved")}
                              >
                                Approuver
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Replacements Feed */}
          <div className="rounded-xl bg-slate-900 border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-sm font-semibold text-white">Couverture & Remplacements de Séances</h3>
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
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800/40">
                            {r.status.toUpperCase()}
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

      {/* MODAL 3: Direct Swimmer Badge Award */}
      {awardingSwimmer && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/15 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              Validation & Promotion Badge : {awardingSwimmer.fullName}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Sélectionner le Badge AQA (15 Badges Officiels)</label>
                <select
                  value={selectedBadgeKey}
                  onChange={(e) => setSelectedBadgeKey(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg p-2 text-white"
                >
                  <option value="starter">1. Starter (1 - Basics)</option>
                  <option value="beginner">2. Beginner (1 - Basics)</option>
                  <option value="floater">3. Floater (1 - Basics)</option>
                  <option value="crawler">4. Crawler (2 - Crawl)</option>
                  <option value="leaf">5. Leaf (3 - Backstroke)</option>
                  <option value="brasseur">6. Brasseur (4 - Breaststroke)</option>
                  <option value="butterfly">7. Butterfly (5 - Butterfly)</option>
                  <option value="full_swimmer">8. Full swimmer (6 - Elite)</option>
                  <option value="dolphin">9. Dolphin (6 - Elite)</option>
                  <option value="shark">10. Shark (6 - Elite)</option>
                  <option value="orca">11. Orca (6 - Elite)</option>
                  <option value="whale">12. Whale (6 - Elite)</option>
                  <option value="kraken">13. Kraken (6 - Elite)</option>
                  <option value="mosasaurus">14. Mosasaurus (6 - Elite)</option>
                  <option value="tsunami">15. Tsunami (6 - Elite)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Groupe / Niveau Recommandé</label>
                <Input
                  type="text"
                  placeholder="Ex: AQA Dauphins Perfectionnement"
                  value={badgeRecommendedLevel}
                  onChange={(e) => setBadgeRecommendedLevel(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
              <Button variant="secondary" onClick={() => setAwardingSwimmer(null)}>
                Annuler
              </Button>
              <Button onClick={handleSaveSwimmerBadge} disabled={savingBadge}>
                {savingBadge ? "Validation..." : "Valider le Badge"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

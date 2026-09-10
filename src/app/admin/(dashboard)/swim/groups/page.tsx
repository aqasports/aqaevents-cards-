"use client";

import { useEffect, useState, useId, useCallback } from "react";
import { PageHeader, Badge, Button, Input } from "@/components/admin/ui";
import {
  FRENCH_DAYS,
  SWIM_GROUP_TYPES,
  SWIM_GROUP_DEFAULT_CAPACITIES,
  SWIM_TIME_SLOTS,
  DEFAULT_SWIM_LOCATIONS,
  SwimGroupType,
  generateSwimGroupName,
  decodeSolidNotes,
} from "@/lib/swim-groups";

interface SwimGroup {
  id: string;
  name: string;
  category: string;
  level: string; // Used as Type: G10, MAX5, indiv
  coachName: string | null;
  schedule: string;
  capacity: number;
  active: boolean;
  notes: string | null;
  isSolid?: boolean;
  cleanNotes?: string;
  createdAt: string;
  _count?: {
    swimmers: number;
  };
}

interface Coach {
  id: string;
  name: string;
  phone: string | null;
  specialties: string | null;
  active: boolean;
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
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [locations, setLocations] = useState<string[]>([...DEFAULT_SWIM_LOCATIONS]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [solidFilter, setSolidFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active");

  // Add Group Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState("");
  const [addCategory, setAddCategory] = useState("homme");
  const [addType, setAddType] = useState<SwimGroupType>("G10");
  const [addCoach, setAddCoach] = useState("");
  const [addDay, setAddDay] = useState<string>("Lundi");
  const [addTime, setAddTime] = useState<string>("18:00");
  const [addLocation, setAddLocation] = useState<string>("Bassin Olympique");
  const [addIsSolid, setAddIsSolid] = useState(false);
  const [addCapacity, setAddCapacity] = useState("10");
  const [addNotes, setAddNotes] = useState("");
  const [nameManuallyEdited, setNameManuallyEdited] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Edit Group Modal State
  const [editingGroup, setEditingGroup] = useState<SwimGroup | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("homme");
  const [editType, setEditType] = useState<SwimGroupType>("G10");
  const [editCoach, setEditCoach] = useState("");
  const [editDay, setEditDay] = useState<string>("Lundi");
  const [editTime, setEditTime] = useState<string>("18:00");
  const [editLocation, setEditLocation] = useState<string>("Bassin Olympique");
  const [editIsSolid, setEditIsSolid] = useState(false);
  const [editCapacity, setEditCapacity] = useState("10");
  const [editNotes, setEditNotes] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Preferences Modal State
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [newCoachName, setNewCoachName] = useState("");
  const [newCoachPhone, setNewCoachPhone] = useState("");
  const [newCoachSpecialties, setNewCoachSpecialties] = useState("");
  const [savingCoach, setSavingCoach] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [savingLocation, setSavingLocation] = useState(false);

  // View Group Detail Modal
  const [selectedGroup, setSelectedGroup] = useState<GroupDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Accessible Form IDs
  const addCategoryId = useId();
  const addTypeId = useId();
  const addCoachId = useId();
  const addDayId = useId();
  const addTimeId = useId();
  const addLocationId = useId();
  const addNameId = useId();
  const addCapacityId = useId();
  const addNotesId = useId();
  const addSolidId = useId();

  const editCategoryId = useId();
  const editTypeId = useId();
  const editCoachId = useId();
  const editDayId = useId();
  const editTimeId = useId();
  const editLocationId = useId();
  const editNameId = useId();
  const editCapacityId = useId();
  const editNotesId = useId();
  const editSolidId = useId();

  const prefCoachNameId = useId();
  const prefCoachPhoneId = useId();
  const prefCoachSpecId = useId();
  const prefLocNameId = useId();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [groupsRes, prefsRes] = await Promise.all([
        fetch("/api/admin/swim/groups"),
        fetch("/api/admin/swim/preferences"),
      ]);

      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        setGroups(groupsData);
      }

      if (prefsRes.ok) {
        const prefsData = await prefsRes.json();
        if (prefsData.coaches) {
          setCoaches(prefsData.coaches);
          if (prefsData.coaches.length > 0) {
            setAddCoach((prev) => prev || prefsData.coaches[0].name);
          }
        }
        if (prefsData.locations && prefsData.locations.length > 0) {
          setLocations(prefsData.locations);
          setAddLocation((prev) => prev || prefsData.locations[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load swim groups data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update auto-generated name for Add Modal if user hasn't manually overridden it
  useEffect(() => {
    if (!nameManuallyEdited) {
      const generated = generateSwimGroupName(addDay, addTime, addCoach, addLocation);
      setAddName(generated);
    }
  }, [addDay, addTime, addCoach, addLocation, nameManuallyEdited]);

  function handleTypeChange(newType: SwimGroupType) {
    setAddType(newType);
    setAddCapacity(String(SWIM_GROUP_DEFAULT_CAPACITIES[newType] || 10));
  }

  function handleEditTypeChange(newType: SwimGroupType) {
    setEditType(newType);
    setEditCapacity(String(SWIM_GROUP_DEFAULT_CAPACITIES[newType] || 10));
  }

  function regenerateAddName() {
    const generated = generateSwimGroupName(addDay, addTime, addCoach, addLocation);
    setAddName(generated);
    setNameManuallyEdited(false);
  }

  function regenerateEditName() {
    const generated = generateSwimGroupName(editDay, editTime, editCoach, editLocation);
    setEditName(generated);
  }

  async function handleAddGroup(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingAdd(true);

    try {
      const scheduleString = `${addDay} ${addTime} · ${addLocation}`;

      const res = await fetch("/api/admin/swim/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName.trim(),
          category: addCategory,
          level: addType, // Stored in level column
          coachName: addCoach.trim() || null,
          schedule: scheduleString,
          capacity: parseInt(addCapacity, 10) || 10,
          notes: addNotes.trim() || null,
          isSolid: addIsSolid,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setAddName("");
        setNameManuallyEdited(false);
        setAddNotes("");
        setAddIsSolid(false);
        await loadData();
      }
    } catch (err) {
      console.error("Failed to create group:", err);
    } finally {
      setSubmittingAdd(false);
    }
  }

  function openEditModal(group: SwimGroup) {
    setEditingGroup(group);
    setEditName(group.name);
    setEditCategory(group.category || "homme");

    // Map level to SwimGroupType
    const matchedType = (SWIM_GROUP_TYPES.includes(group.level as SwimGroupType)
      ? group.level
      : "G10") as SwimGroupType;
    setEditType(matchedType);

    setEditCoach(group.coachName || (coaches[0]?.name ?? ""));
    setEditCapacity(String(group.capacity));

    const decoded = decodeSolidNotes(group.notes);
    setEditIsSolid(decoded.isSolid);
    setEditNotes(decoded.cleanNotes);

    // Try to parse day, time, location from schedule
    let foundDay = "Lundi";
    let foundTime = "18:00";
    let foundLoc = locations[0] || "Bassin Olympique";

    if (group.schedule) {
      for (const d of FRENCH_DAYS) {
        if (group.schedule.toLowerCase().includes(d.toLowerCase())) {
          foundDay = d;
          break;
        }
      }
      const timeMatch = group.schedule.match(/\b([0-2]?[0-9]:[0-5][0-9])\b/);
      if (timeMatch) {
        foundTime = timeMatch[1];
      }
      for (const loc of locations) {
        if (group.schedule.toLowerCase().includes(loc.toLowerCase())) {
          foundLoc = loc;
          break;
        }
      }
    }

    setEditDay(foundDay);
    setEditTime(foundTime);
    setEditLocation(foundLoc);
  }

  async function handleEditGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!editingGroup) return;
    setSubmittingEdit(true);

    try {
      const scheduleString = `${editDay} ${editTime} · ${editLocation}`;

      const res = await fetch(`/api/admin/swim/groups/${editingGroup.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          category: editCategory,
          level: editType,
          coachName: editCoach.trim() || null,
          schedule: scheduleString,
          capacity: parseInt(editCapacity, 10) || 10,
          notes: editNotes.trim(),
          isSolid: editIsSolid,
        }),
      });

      if (res.ok) {
        setEditingGroup(null);
        await loadData();
      }
    } catch (err) {
      console.error("Failed to update group:", err);
    } finally {
      setSubmittingEdit(false);
    }
  }

  async function handleAddCoach(e: React.FormEvent) {
    e.preventDefault();
    if (!newCoachName.trim()) return;
    setSavingCoach(true);

    try {
      const res = await fetch("/api/admin/swim/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_coach",
          name: newCoachName.trim(),
          phone: newCoachPhone.trim() || null,
          specialties: newCoachSpecialties.trim() || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.coach) {
          setCoaches((prev) => [...prev, data.coach]);
          setAddCoach(data.coach.name);
          setNewCoachName("");
          setNewCoachPhone("");
          setNewCoachSpecialties("");
        }
      }
    } catch (err) {
      console.error("Failed to add coach:", err);
    } finally {
      setSavingCoach(false);
    }
  }

  async function handleAddLocation(e: React.FormEvent) {
    e.preventDefault();
    if (!newLocationName.trim()) return;
    setSavingLocation(true);

    try {
      const res = await fetch("/api/admin/swim/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_location",
          locationName: newLocationName.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.locations) {
          setLocations(data.locations);
          setAddLocation(newLocationName.trim());
          setNewLocationName("");
        }
      }
    } catch (err) {
      console.error("Failed to add location:", err);
    } finally {
      setSavingLocation(false);
    }
  }

  async function handleDeleteLocation(locToDelete: string) {
    try {
      const res = await fetch("/api/admin/swim/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_location",
          locationName: locToDelete,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.locations) {
          setLocations(data.locations);
        }
      }
    } catch (err) {
      console.error("Failed to delete location:", err);
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
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Filter groups
  const filteredGroups = groups.filter((g) => {
    // Status filter
    if (statusFilter === "active" && !g.active) return false;
    if (statusFilter === "archived" && g.active) return false;

    // Type filter
    if (typeFilter !== "all" && g.level !== typeFilter) return false;

    // Category filter
    if (categoryFilter !== "all" && g.category !== categoryFilter) return false;

    // Solid filter
    const isSolid = g.isSolid ?? decodeSolidNotes(g.notes).isSolid;
    if (solidFilter === "solid" && !isSolid) return false;
    if (solidFilter === "regular" && isSolid) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = g.name.toLowerCase().includes(q);
      const matchCoach = (g.coachName || "").toLowerCase().includes(q);
      const matchSchedule = g.schedule.toLowerCase().includes(q);
      if (!matchName && !matchCoach && !matchSchedule) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sector 3: AQA Swim Groups Manager"
        description="Configure solid training groups, assign certified coaches, manage capacity quotas, and review enrolled swimmers."
        action={
          <div className="flex items-center gap-2.5">
            <Button
              onClick={() => setShowPreferencesModal(true)}
              variant="secondary"
              className="text-xs"
            >
              Preferences
            </Button>
            <Button onClick={() => setShowAddModal(true)} variant="primary">
              + New Group
            </Button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="md:col-span-2">
            <Input
              placeholder="Search by group name, coach, or schedule..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
            >
              <option value="all">All Types</option>
              <option value="G10">Type: G10</option>
              <option value="MAX5">Type: MAX5</option>
              <option value="indiv">Type: indiv</option>
            </select>
          </div>

          {/* Solid Filter */}
          <div>
            <select
              value={solidFilter}
              onChange={(e) => setSolidFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
            >
              <option value="all">All Cohorts</option>
              <option value="solid">Solid Groups Only</option>
              <option value="regular">Regular Groups Only</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
            >
              <option value="active">Active Groups</option>
              <option value="archived">Archived Groups</option>
              <option value="all">All Statuses</option>
            </select>
          </div>
        </div>

        {/* Quick Category Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-slate-400 text-[11px] font-medium mr-1">Category:</span>
          {["all", "homme", "femme", "enfants", "apnea"].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase transition-all ${
                categoryFilter === cat
                  ? "bg-cyan-500 text-slate-950 shadow-sm"
                  : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              {cat === "all" ? "All Categories" : cat}
            </button>
          ))}
          <span className="ml-auto text-slate-400 text-xs font-mono">
            {filteredGroups.length} / {groups.length} groups
          </span>
        </div>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            Loading groups...
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 border border-dashed border-white/10 rounded-2xl">
            No training groups match your criteria. Click &quot;+ New Group&quot; to create one.
          </div>
        ) : (
          filteredGroups.map((g) => {
            const count = g._count?.swimmers ?? 0;
            const isFull = count >= g.capacity;
            const isSolid = g.isSolid ?? decodeSolidNotes(g.notes).isSolid;
            const cleanNotes = g.cleanNotes ?? decodeSolidNotes(g.notes).cleanNotes;

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

                  {/* Badges: Category, Type (G10/MAX5/indiv), Solid */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-800 text-slate-300 border border-white/10">
                      {g.category}
                    </span>

                    {/* Type Badge */}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        g.level === "G10"
                          ? "bg-sky-950/70 text-sky-400 border border-sky-800/50"
                          : g.level === "MAX5"
                          ? "bg-indigo-950/70 text-indigo-400 border border-indigo-800/50"
                          : "bg-teal-950/70 text-teal-400 border border-teal-800/50"
                      }`}
                    >
                      Type: {g.level}
                    </span>

                    {/* Solid Badge */}
                    {isSolid && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-950/70 text-emerald-400 border border-emerald-800/50 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                        Solid
                      </span>
                    )}
                  </div>

                  {/* Coach & Schedule */}
                  <div className="space-y-1.5 text-xs text-slate-300 mb-4 bg-slate-900/40 p-3 rounded-xl border border-white/5">
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
                    {cleanNotes && (
                      <div className="pt-1 text-[11px] text-slate-400 border-t border-white/5">
                        {cleanNotes}
                      </div>
                    )}
                  </div>

                  {/* Capacity Progress Bar */}
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

                {/* Card Actions */}
                <div className="pt-3 border-t border-white/5 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1 text-xs"
                    onClick={() => openGroupDetail(g.id)}
                  >
                    Swimmers ({count})
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="text-xs"
                    onClick={() => openEditModal(g)}
                  >
                    Edit
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
          <div className="max-w-lg w-full bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Create Solid Training Group</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddGroup} className="space-y-3.5">
              {/* Category & Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={addCategoryId} className="block text-xs font-semibold text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    id={addCategoryId}
                    value={addCategory}
                    onChange={(e) => setAddCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option value="homme">Homme</option>
                    <option value="femme">Femme</option>
                    <option value="enfants">Enfants</option>
                    <option value="apnea">Apnee</option>
                  </select>
                </div>

                <div>
                  <label htmlFor={addTypeId} className="block text-xs font-semibold text-slate-300 mb-1">
                    Type *
                  </label>
                  <select
                    id={addTypeId}
                    value={addType}
                    onChange={(e) => handleTypeChange(e.target.value as SwimGroupType)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option value="G10">G10 (10 pers.)</option>
                    <option value="MAX5">MAX5 (5 pers.)</option>
                    <option value="indiv">indiv (1 pers.)</option>
                  </select>
                </div>
              </div>

              {/* Coach Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor={addCoachId} className="block text-xs font-semibold text-slate-300">
                    Coach Name *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPreferencesModal(true);
                    }}
                    className="text-[11px] text-cyan-400 hover:underline"
                  >
                    + Add Coach in Preferences
                  </button>
                </div>
                <select
                  id={addCoachId}
                  required
                  value={addCoach}
                  onChange={(e) => setAddCoach(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                >
                  <option value="">-- Select Coach --</option>
                  {coaches.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} {c.specialties ? `(${c.specialties})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Day, Time, Location Dropdowns */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor={addDayId} className="block text-xs font-semibold text-slate-300 mb-1">
                    Day *
                  </label>
                  <select
                    id={addDayId}
                    value={addDay}
                    onChange={(e) => setAddDay(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    {FRENCH_DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor={addTimeId} className="block text-xs font-semibold text-slate-300 mb-1">
                    Time (hour:min) *
                  </label>
                  <select
                    id={addTimeId}
                    value={addTime}
                    onChange={(e) => setAddTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    {SWIM_TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor={addLocationId} className="block text-xs font-semibold text-slate-300 mb-1">
                    Location *
                  </label>
                  <select
                    id={addLocationId}
                    value={addLocation}
                    onChange={(e) => setAddLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    {locations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Group Name (Auto-Generated by formula with override) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor={addNameId} className="block text-xs font-semibold text-slate-300">
                    Group Name (Auto-Generated) *
                  </label>
                  <button
                    type="button"
                    onClick={regenerateAddName}
                    className="text-[11px] text-cyan-400 hover:underline"
                  >
                    Regenerate formula
                  </button>
                </div>
                <Input
                  id={addNameId}
                  required
                  value={addName}
                  onChange={(e) => {
                    setAddName(e.target.value);
                    setNameManuallyEdited(true);
                  }}
                  placeholder="e.g. Lun 18:00 Karim B Bass"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Format: (3 letters day) (time) (7 letters coach) (4 letters location)
                </p>
              </div>

              {/* Capacity & Solid Check */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label htmlFor={addCapacityId} className="block text-xs font-semibold text-slate-300 mb-1">
                    Max Capacity
                  </label>
                  <Input
                    id={addCapacityId}
                    type="number"
                    value={addCapacity}
                    onChange={(e) => setAddCapacity(e.target.value)}
                    placeholder="10"
                  />
                </div>

                <div className="pt-5">
                  <label htmlFor={addSolidId} className="flex items-center gap-2.5 cursor-pointer bg-slate-800/80 p-2.5 rounded-xl border border-white/10 hover:border-cyan-500/50 transition-colors">
                    <input
                      id={addSolidId}
                      type="checkbox"
                      checked={addIsSolid}
                      onChange={(e) => setAddIsSolid(e.target.checked)}
                      className="h-4 w-4 accent-cyan-500 rounded"
                    />
                    <span className="text-xs font-semibold text-white">
                      Solid Group Check
                    </span>
                  </label>
                </div>
              </div>

              {/* Additional Notes */}
              <div>
                <label htmlFor={addNotesId} className="block text-xs font-semibold text-slate-300 mb-1">
                  Pool Lane / Notes
                </label>
                <textarea
                  id={addNotesId}
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  placeholder="e.g. Bassin olympique, lignes 3 et 4..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-white/10">
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
                  {submittingAdd ? "Creating..." : "Create Group"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Group Modal */}
      {editingGroup && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Edit Training Group</h3>
              <button
                type="button"
                onClick={() => setEditingGroup(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditGroup} className="space-y-3.5">
              {/* Category & Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={editCategoryId} className="block text-xs font-semibold text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    id={editCategoryId}
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
                  <label htmlFor={editTypeId} className="block text-xs font-semibold text-slate-300 mb-1">
                    Type *
                  </label>
                  <select
                    id={editTypeId}
                    value={editType}
                    onChange={(e) => handleEditTypeChange(e.target.value as SwimGroupType)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option value="G10">G10 (10 pers.)</option>
                    <option value="MAX5">MAX5 (5 pers.)</option>
                    <option value="indiv">indiv (1 pers.)</option>
                  </select>
                </div>
              </div>

              {/* Coach Selector */}
              <div>
                <label htmlFor={editCoachId} className="block text-xs font-semibold text-slate-300 mb-1">
                  Coach Name
                </label>
                <select
                  id={editCoachId}
                  value={editCoach}
                  onChange={(e) => setEditCoach(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                >
                  <option value="">-- Select Coach --</option>
                  {coaches.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} {c.specialties ? `(${c.specialties})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Day, Time, Location Dropdowns */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor={editDayId} className="block text-xs font-semibold text-slate-300 mb-1">
                    Day
                  </label>
                  <select
                    id={editDayId}
                    value={editDay}
                    onChange={(e) => setEditDay(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    {FRENCH_DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor={editTimeId} className="block text-xs font-semibold text-slate-300 mb-1">
                    Time (hour:min)
                  </label>
                  <select
                    id={editTimeId}
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    {SWIM_TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor={editLocationId} className="block text-xs font-semibold text-slate-300 mb-1">
                    Location
                  </label>
                  <select
                    id={editLocationId}
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    {locations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Group Name with Regenerate */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor={editNameId} className="block text-xs font-semibold text-slate-300">
                    Group Name
                  </label>
                  <button
                    type="button"
                    onClick={regenerateEditName}
                    className="text-[11px] text-cyan-400 hover:underline"
                  >
                    Regenerate formula
                  </button>
                </div>
                <Input
                  id={editNameId}
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              {/* Capacity & Solid Check */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label htmlFor={editCapacityId} className="block text-xs font-semibold text-slate-300 mb-1">
                    Max Capacity
                  </label>
                  <Input
                    id={editCapacityId}
                    type="number"
                    value={editCapacity}
                    onChange={(e) => setEditCapacity(e.target.value)}
                  />
                </div>

                <div className="pt-5">
                  <label htmlFor={editSolidId} className="flex items-center gap-2.5 cursor-pointer bg-slate-800/80 p-2.5 rounded-xl border border-white/10 hover:border-cyan-500/50 transition-colors">
                    <input
                      id={editSolidId}
                      type="checkbox"
                      checked={editIsSolid}
                      onChange={(e) => setEditIsSolid(e.target.checked)}
                      className="h-4 w-4 accent-cyan-500 rounded"
                    />
                    <span className="text-xs font-semibold text-white">
                      Solid Group Check
                    </span>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label htmlFor={editNotesId} className="block text-xs font-semibold text-slate-300 mb-1">
                  Pool Lane / Notes
                </label>
                <textarea
                  id={editNotesId}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-white/10">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditingGroup(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submittingEdit}
                  className="flex-1"
                >
                  {submittingEdit ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preferences Modal (Coaches & Locations Manager) */}
      {showPreferencesModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white">
                  Groups Manager Preferences
                </h3>
                <p className="text-xs text-slate-400">
                  Manage coaches and training pool locations available in dropdowns.
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowPreferencesModal(false)}
              >
                ✕ Close
              </Button>
            </div>

            {/* Section 1: Coach Adder & List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                1. Coach Adder &amp; Directory
              </h4>

              <form onSubmit={handleAddCoach} className="bg-slate-800/60 p-3 rounded-xl border border-white/5 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label htmlFor={prefCoachNameId} className="block text-[11px] text-slate-400 mb-1">Coach Name *</label>
                    <Input
                      id={prefCoachNameId}
                      required
                      placeholder="e.g. Coach Karim"
                      value={newCoachName}
                      onChange={(e) => setNewCoachName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor={prefCoachPhoneId} className="block text-[11px] text-slate-400 mb-1">Phone</label>
                    <Input
                      id={prefCoachPhoneId}
                      placeholder="0550 00 00 00"
                      value={newCoachPhone}
                      onChange={(e) => setNewCoachPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor={prefCoachSpecId} className="block text-[11px] text-slate-400 mb-1">Specialties</label>
                    <Input
                      id={prefCoachSpecId}
                      placeholder="Natation / Apnée"
                      value={newCoachSpecialties}
                      onChange={(e) => setNewCoachSpecialties(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={savingCoach || !newCoachName.trim()}
                  >
                    {savingCoach ? "Adding..." : "+ Add Coach"}
                  </Button>
                </div>
              </form>

              {/* Coach List */}
              <div className="max-h-40 overflow-y-auto divide-y divide-white/5 border border-white/5 rounded-xl bg-slate-900/50">
                {coaches.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400">
                    No coaches configured yet. Add your first coach above.
                  </div>
                ) : (
                  coaches.map((c) => (
                    <div key={c.id} className="p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-white">{c.name}</span>
                        {c.specialties && (
                          <span className="ml-2 text-[11px] text-slate-400">
                            ({c.specialties})
                          </span>
                        )}
                        {c.phone && (
                          <span className="ml-2 font-mono text-[10px] text-cyan-400">
                            {c.phone}
                          </span>
                        )}
                      </div>
                      <Badge tone={c.active ? "success" : "danger"}>
                        {c.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Section 2: Location Adder & List */}
            <div className="space-y-3 pt-3 border-t border-white/10">
              <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                2. Pool Locations
              </h4>

              <form onSubmit={handleAddLocation} className="flex gap-2">
                <label htmlFor={prefLocNameId} className="sr-only">New Pool Location Name</label>
                <Input
                  id={prefLocNameId}
                  required
                  placeholder="e.g. Piscine Olympique Kouba..."
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={savingLocation || !newLocationName.trim()}
                >
                  {savingLocation ? "Saving..." : "+ Add Location"}
                </Button>
              </form>

              {/* Locations List */}
              <div className="flex flex-wrap gap-2 pt-1">
                {locations.map((loc) => (
                  <div
                    key={loc}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 text-xs text-slate-200 border border-white/10"
                  >
                    <span>{loc}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteLocation(loc)}
                      className="text-slate-400 hover:text-rose-400 ml-1 font-bold"
                      title="Delete location"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Swimmers in Group Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">
                    {selectedGroup.name}
                  </h3>
                  {selectedGroup.isSolid && (
                    <Badge tone="success">Solid</Badge>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
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
              {loadingDetail ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading details...</div>
              ) : selectedGroup.swimmers.length === 0 ? (
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

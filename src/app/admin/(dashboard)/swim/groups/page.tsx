"use client";

import { useEffect, useState, useId, useCallback, useMemo } from "react";
import Link from "next/link";
import { PageHeader, Badge, Button, Input } from "@/components/admin/ui";
import {
  FRENCH_DAYS,
  SWIM_GROUP_TYPES,
  SWIM_GROUP_DEFAULT_CAPACITIES,
  SWIM_TIME_SLOTS,
  DEFAULT_SWIM_LOCATIONS,
  SwimGroupType,
  generateSwimGroupName,
  generateKidsGroupName,
  buildScheduleString,
  parseScheduleSlots,
  decodeSolidNotes,
  getSwimLevelLabel,
} from "@/lib/swim-groups";
import { formatWhatsAppNumber } from "@/lib/swim-whatsapp";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  createdAt: string;
  _count?: { swimmers: number };
}

interface Coach {
  id: string;
  name: string;
  phone: string | null;
  specialties: string | null;
  active: boolean;
}

interface SwimmerInGroup {
  id: string;
  swimId: string;
  fullName: string;
  phone: string;
  level: string;
  paymentStatus: string;
  groupStatus: string;
  card: { cardCode: string } | null;
}

interface GroupDetail extends SwimGroup {
  swimmers: SwimmerInGroup[];
}

interface SwimMemberSearch {
  id: string;
  swimId: string;
  fullName: string;
  phone: string;
  level: string;
  category: string;
  groupId: string | null;
  formula: string;
  effectivelyUnassigned?: boolean;
  group: { active: boolean; name: string; id: string } | null;
}

export type SwimGroupSortOption =
  | "schedule_asc"
  | "occupancy_desc"
  | "occupancy_asc"
  | "swimmers_desc"
  | "name_asc"
  | "coach_asc"
  | "created_desc";

export type SwimGroupViewMode = "split" | "grid";

const CATEGORIES = ["homme", "femme", "enfants", "apnea"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  homme: "Homme",
  femme: "Femme",
  enfants: "Enfants",
  apnea: "Apnee",
};

/**
 * Computes a deterministic chronological sort key based on French weekly days (Lundi -> Dimanche)
 * and session start times. Handles multi-slot kids groups by picking the earliest slot.
 */
function getGroupScheduleSortKey(g: SwimGroup): number {
  const slots = parseScheduleSlots(g.schedule || "");
  if (slots.length === 0 || !slots[0].day) return 999999;

  let minKey = 999999;
  for (const s of slots) {
    if (!s.day) continue;
    const dayIdx = FRENCH_DAYS.findIndex((d) => d.toLowerCase() === s.day.toLowerCase());
    const normDay = dayIdx !== -1 ? dayIdx : 90;
    let mins = 9999;
    if (s.time) {
      const [h, m] = s.time.split(":").map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        mins = h * 60 + m;
      }
    }
    const key = normDay * 10000 + mins;
    if (key < minKey) {
      minKey = key;
    }
  }
  return minKey;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SwimGroupsPage() {
  const [groups, setGroups] = useState<SwimGroup[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [locations, setLocations] = useState<string[]>([...DEFAULT_SWIM_LOCATIONS]);
  const [loading, setLoading] = useState(true);

  // View & Sort States
  const [viewMode, setViewMode] = useState<SwimGroupViewMode>("split");
  const [sortBy, setSortBy] = useState<SwimGroupSortOption>("schedule_asc");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [solidFilter, setSolidFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active");

  // Selected Group for Dynamic Live Roster Inspector
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);

  // Add Group Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState("");
  const [addCategory, setAddCategory] = useState("homme");
  const [addType, setAddType] = useState<SwimGroupType>("G10");
  const [addCoach, setAddCoach] = useState("");
  const [addDay, setAddDay] = useState<string>("Lundi");
  const [addTime, setAddTime] = useState<string>("18:00");
  const [addDay2, setAddDay2] = useState<string>("Mercredi");
  const [addTime2, setAddTime2] = useState<string>("18:00");
  const [addLocation, setAddLocation] = useState<string>("Bassin Olympique");
  const [addIsSolid, setAddIsSolid] = useState(false);
  const [addCapacity, setAddCapacity] = useState("10");
  const [addNotes, setAddNotes] = useState("");
  const [nameManuallyEdited, setNameManuallyEdited] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Edit Group Modal
  const [editingGroup, setEditingGroup] = useState<SwimGroup | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("homme");
  const [editType, setEditType] = useState<SwimGroupType>("G10");
  const [editCoach, setEditCoach] = useState("");
  const [editDay, setEditDay] = useState<string>("Lundi");
  const [editTime, setEditTime] = useState<string>("18:00");
  const [editDay2, setEditDay2] = useState<string>("Mercredi");
  const [editTime2, setEditTime2] = useState<string>("18:00");
  const [editLocation, setEditLocation] = useState<string>("Bassin Olympique");
  const [editIsSolid, setEditIsSolid] = useState(false);
  const [editCapacity, setEditCapacity] = useState("10");
  const [editNotes, setEditNotes] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Preferences Modal
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [newCoachName, setNewCoachName] = useState("");
  const [newCoachPhone, setNewCoachPhone] = useState("");
  const [newCoachSpecialties, setNewCoachSpecialties] = useState("");
  const [savingCoach, setSavingCoach] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [savingLocation, setSavingLocation] = useState(false);

  // Assign swimmer search
  const [searchAssignQuery, setSearchAssignQuery] = useState("");
  const [searchAssignResults, setSearchAssignResults] = useState<SwimMemberSearch[]>([]);
  const [searchingAssign, setSearchingAssign] = useState(false);
  const [assigningMemberId, setAssigningMemberId] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  // Accessible Form IDs
  const addCategoryId = useId();
  const addTypeId = useId();
  const addCoachId = useId();
  const addDayId = useId();
  const addTimeId = useId();
  const addDay2Id = useId();
  const addTime2Id = useId();
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
  const editDay2Id = useId();
  const editTime2Id = useId();
  const editLocationId = useId();
  const editNameId = useId();
  const editCapacityId = useId();
  const editNotesId = useId();
  const editSolidId = useId();
  const prefCoachNameId = useId();
  const prefCoachPhoneId = useId();
  const prefCoachSpecId = useId();
  const prefLocNameId = useId();

  // ─── Data Loading ───────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [groupsRes, prefsRes] = await Promise.all([
        fetch("/api/admin/swim/groups"),
        fetch("/api/admin/swim/preferences"),
      ]);

      if (groupsRes.ok) {
        const groupsData: SwimGroup[] = await groupsRes.json();
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

  // Fetch detailed roster for selected group
  const fetchGroupDetail = useCallback(async (groupId: string) => {
    setLoadingDetail(true);
    setSearchAssignQuery("");
    setSearchAssignResults([]);
    try {
      const res = await fetch(`/api/admin/swim/groups/${groupId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedGroup(data);
      }
    } catch (err) {
      console.error("Failed to fetch group detail:", err);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const selectGroup = useCallback((groupId: string, openMobile = false) => {
    setSelectedGroupId(groupId);
    fetchGroupDetail(groupId);
    if (openMobile) {
      setShowMobileDrawer(true);
    }
  }, [fetchGroupDetail]);

  // Auto-generate group name when add modal fields change
  useEffect(() => {
    if (!nameManuallyEdited) {
      const generated =
        addCategory === "enfants"
          ? generateKidsGroupName(addDay, addTime, addDay2, addTime2, addCoach, addLocation)
          : generateSwimGroupName(addDay, addTime, addCoach, addLocation);
      setAddName(generated);
    }
  }, [addDay, addTime, addDay2, addTime2, addCategory, addCoach, addLocation, nameManuallyEdited]);

  // Search assign swimmers (debounced)
  useEffect(() => {
    if (!selectedGroup || !searchAssignQuery.trim() || searchAssignQuery.trim().length < 2) {
      setSearchAssignResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingAssign(true);
      try {
        const res = await fetch(`/api/admin/swim/members?q=${encodeURIComponent(searchAssignQuery)}`);
        if (res.ok) {
          const all: SwimMemberSearch[] = await res.json();
          const eligible = all.filter((m) => {
            if (m.category !== selectedGroup.category) return false;
            if (m.groupId === selectedGroup.id) return false;
            return true;
          });
          setSearchAssignResults(eligible);
        }
      } finally {
        setSearchingAssign(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchAssignQuery, selectedGroup]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function handleTypeChange(newType: SwimGroupType) {
    setAddType(newType);
    setAddCapacity(String(SWIM_GROUP_DEFAULT_CAPACITIES[newType] || 10));
  }

  function handleEditTypeChange(newType: SwimGroupType) {
    setEditType(newType);
    setEditCapacity(String(SWIM_GROUP_DEFAULT_CAPACITIES[newType] || 10));
  }

  function regenerateAddName() {
    const generated =
      addCategory === "enfants"
        ? generateKidsGroupName(addDay, addTime, addDay2, addTime2, addCoach, addLocation)
        : generateSwimGroupName(addDay, addTime, addCoach, addLocation);
    setAddName(generated);
    setNameManuallyEdited(false);
  }

  function regenerateEditName() {
    const generated =
      editCategory === "enfants"
        ? generateKidsGroupName(editDay, editTime, editDay2, editTime2, editCoach, editLocation)
        : generateSwimGroupName(editDay, editTime, editCoach, editLocation);
    setEditName(generated);
  }

  async function handleAddGroup(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingAdd(true);
    try {
      const scheduleString =
        addCategory === "enfants"
          ? buildScheduleString(addDay, addTime, addLocation, addDay2, addTime2)
          : buildScheduleString(addDay, addTime, addLocation);
      const res = await fetch("/api/admin/swim/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName.trim(),
          category: addCategory,
          level: addType,
          coachName: addCoach.trim() || null,
          schedule: scheduleString,
          capacity: parseInt(addCapacity, 10) || 10,
          notes: addNotes.trim() || null,
          isSolid: addIsSolid,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setShowAddModal(false);
        setAddName("");
        setNameManuallyEdited(false);
        setAddNotes("");
        setAddIsSolid(false);
        await loadData();
        if (created?.id) {
          selectGroup(created.id);
        }
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
    const matchedType = (SWIM_GROUP_TYPES.includes(group.level as SwimGroupType)
      ? group.level
      : "G10") as SwimGroupType;
    setEditType(matchedType);
    setEditCoach(group.coachName || (coaches[0]?.name ?? ""));
    setEditCapacity(String(group.capacity));
    const decoded = decodeSolidNotes(group.notes);
    setEditIsSolid(decoded.isSolid);
    setEditNotes(decoded.cleanNotes);

    const slots = parseScheduleSlots(group.schedule || "");
    const slot1 = slots[0] || { day: "Lundi", time: "18:00", location: "" };
    const slot2 = slots[1] || null;

    setEditDay(slot1.day || "Lundi");
    setEditTime(slot1.time || "18:00");
    setEditDay2(slot2 ? slot2.day || "Mercredi" : "Mercredi");
    setEditTime2(slot2 ? slot2.time || "18:00" : "18:00");

    let foundLoc = locations[0] || "Bassin Olympique";
    if (slot1.location) {
      foundLoc = slot1.location;
    } else {
      for (const loc of locations) {
        if ((group.schedule || "").toLowerCase().includes(loc.toLowerCase())) {
          foundLoc = loc;
          break;
        }
      }
    }
    setEditLocation(foundLoc);
  }

  async function handleEditGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!editingGroup) return;
    setSubmittingEdit(true);
    try {
      const scheduleString =
        editCategory === "enfants"
          ? buildScheduleString(editDay, editTime, editLocation, editDay2, editTime2)
          : buildScheduleString(editDay, editTime, editLocation);
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
        if (selectedGroupId === editingGroup.id) {
          fetchGroupDetail(editingGroup.id);
        }
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

  async function handleDeleteCoach(coachId: string) {
    try {
      const res = await fetch("/api/admin/swim/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_coach", coachId }),
      });
      if (res.ok) {
        setCoaches((prev) => prev.filter((c) => c.id !== coachId));
      }
    } catch (err) {
      console.error("Failed to delete coach:", err);
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
        body: JSON.stringify({ action: "add_location", locationName: newLocationName.trim() }),
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
        body: JSON.stringify({ action: "delete_location", locationName: locToDelete }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.locations) setLocations(data.locations);
      }
    } catch (err) {
      console.error("Failed to delete location:", err);
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
        await loadData();
        if (selectedGroupId === group.id) {
          fetchGroupDetail(group.id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleAssignSwimmer(memberId: string) {
    if (!selectedGroup) return;
    setAssigningMemberId(memberId);
    try {
      const res = await fetch(`/api/admin/swim/groups/${selectedGroup.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, groupStatus: "proposed" }),
      });
      if (res.ok) {
        setSearchAssignQuery("");
        setSearchAssignResults([]);
        await fetchGroupDetail(selectedGroup.id);
        await loadData();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to assign swimmer.");
      }
    } finally {
      setAssigningMemberId(null);
    }
  }

  async function handleRemoveSwimmer(memberId: string) {
    if (!selectedGroup) return;
    if (!confirm("Remove this swimmer from the group?")) return;
    setRemovingMemberId(memberId);
    try {
      const res = await fetch(`/api/admin/swim/groups/${selectedGroup.id}/assign?memberId=${memberId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchGroupDetail(selectedGroup.id);
        await loadData();
      }
    } finally {
      setRemovingMemberId(null);
    }
  }

  // ─── Filtering & Sorting ────────────────────────────────────────────────────

  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      if (statusFilter === "active" && !g.active) return false;
      if (statusFilter === "archived" && g.active) return false;
      if (typeFilter !== "all" && g.level !== typeFilter) return false;
      if (categoryFilter !== "all" && g.category !== categoryFilter) return false;
      const isSolid = g.isSolid ?? decodeSolidNotes(g.notes).isSolid;
      if (solidFilter === "solid" && !isSolid) return false;
      if (solidFilter === "regular" && isSolid) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !g.name.toLowerCase().includes(q) &&
          !(g.coachName || "").toLowerCase().includes(q) &&
          !g.schedule.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [groups, statusFilter, typeFilter, categoryFilter, solidFilter, searchQuery]);

  const sortedGroups = useMemo(() => {
    const list = [...filteredGroups];
    list.sort((a, b) => {
      if (sortBy === "schedule_asc") {
        const keyA = getGroupScheduleSortKey(a);
        const keyB = getGroupScheduleSortKey(b);
        if (keyA !== keyB) return keyA - keyB;
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "occupancy_desc") {
        const occA = (a._count?.swimmers || 0) / (a.capacity || 1);
        const occB = (b._count?.swimmers || 0) / (b.capacity || 1);
        return occB - occA;
      }
      if (sortBy === "occupancy_asc") {
        const occA = (a._count?.swimmers || 0) / (a.capacity || 1);
        const occB = (b._count?.swimmers || 0) / (b.capacity || 1);
        return occA - occB;
      }
      if (sortBy === "swimmers_desc") {
        return (b._count?.swimmers || 0) - (a._count?.swimmers || 0);
      }
      if (sortBy === "name_asc") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "coach_asc") {
        return (a.coachName || "ZZZ").localeCompare(b.coachName || "ZZZ");
      }
      if (sortBy === "created_desc") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return 0;
    });
    return list;
  }, [filteredGroups, sortBy]);

  // Automatically select first group in sorted list if none is selected
  useEffect(() => {
    if (!loading && sortedGroups.length > 0) {
      if (!selectedGroupId || !sortedGroups.some((g) => g.id === selectedGroupId)) {
        selectGroup(sortedGroups[0].id);
      }
    }
  }, [sortedGroups, selectedGroupId, loading, selectGroup]);

  // Overall Statistics
  const totalSwimmersEnrolled = useMemo(() => {
    return groups.reduce((acc, g) => acc + (g._count?.swimmers || 0), 0);
  }, [groups]);

  const totalCapacity = useMemo(() => {
    return groups.reduce((acc, g) => acc + (g.capacity || 10), 0);
  }, [groups]);

  const overallOccupancyPct = totalCapacity > 0
    ? Math.min(100, Math.round((totalSwimmersEnrolled / totalCapacity) * 100))
    : 0;

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: groups.length };
    CATEGORIES.forEach((cat) => {
      counts[cat] = groups.filter((g) => g.category === cat).length;
    });
    return counts;
  }, [groups]);

  // ─── Render Schedule Chips Helper ───────────────────────────────────────────

  function renderScheduleChips(schedule: string) {
    const slots = parseScheduleSlots(schedule);
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {slots.map((s, idx) => (
          <span
            key={idx}
            className="px-2 py-0.5 rounded-md bg-slate-800 text-[11px] font-mono text-cyan-300 font-semibold border border-white/10"
          >
            {s.day} {s.time}
          </span>
        ))}
        {slots[0]?.location && (
          <span className="text-[10px] text-slate-400">· {slots[0].location}</span>
        )}
      </div>
    );
  }

  // ─── Render Roster Content (Shared between desktop panel and mobile drawer) ──

  function renderRosterPanelContent() {
    if (!selectedGroup) {
      return (
        <div className="p-8 text-center text-slate-400 text-xs">
          Select a group from the list to view its enrolled swimmers.
        </div>
      );
    }

    const enrolledCount = selectedGroup.swimmers.length;
    const capacity = selectedGroup.capacity || 10;
    const isFull = enrolledCount >= capacity;
    const occPct = Math.min(100, Math.round((enrolledCount / capacity) * 100));

    return (
      <div className="space-y-4">
        {/* Selected Group Header Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-cyan-500/30 shadow-[0_0_15px_rgba(0,242,255,0.08)] space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white">{selectedGroup.name}</h3>
                {selectedGroup.isSolid && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                    Solid
                  </span>
                )}
                {!selectedGroup.active && <Badge tone="danger">Archived</Badge>}
              </div>
              <p className="text-xs text-cyan-300 font-medium mt-1">
                Coach: {selectedGroup.coachName || "Non assigné"}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                size="sm"
                variant="secondary"
                className="text-xs"
                onClick={() => openEditModal(selectedGroup)}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="text-xs"
                onClick={() => toggleActive(selectedGroup)}
              >
                {selectedGroup.active ? "Archive" : "Activate"}
              </Button>
            </div>
          </div>

          {/* Schedule Chips */}
          <div className="pt-1">
            {renderScheduleChips(selectedGroup.schedule)}
          </div>

          {/* Occupancy Metric */}
          <div className="space-y-1.5 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Capacité Groupe</span>
              <span className="font-mono font-bold text-white">
                {enrolledCount} / {capacity} places ({occPct}%)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isFull ? "bg-rose-500" : occPct >= 70 ? "bg-amber-400" : "bg-cyan-400"
                }`}
                style={{ width: `${occPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick Assign Swimmer Section */}
        {selectedGroup.active && (
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                Inscrire un Nageur
              </span>
              <span className="text-[10px] text-slate-400">
                {CATEGORY_LABELS[selectedGroup.category] ?? selectedGroup.category}
              </span>
            </div>
            <Input
              placeholder="Rechercher par nom, téléphone, ou Swimmer ID..."
              value={searchAssignQuery}
              onChange={(e) => setSearchAssignQuery(e.target.value)}
            />
            {searchingAssign && (
              <div className="text-[11px] text-cyan-400 animate-pulse">Recherche en cours...</div>
            )}
            {searchAssignResults.length > 0 && (
              <div className="divide-y divide-white/5 border border-white/10 rounded-xl overflow-hidden max-h-44 overflow-y-auto bg-slate-950/80">
                {searchAssignResults.map((m) => {
                  const isTransfer = Boolean(m.groupId && m.group && m.group.active);
                  return (
                    <div
                      key={m.id}
                      className="p-2.5 flex items-center justify-between text-xs hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-white">{m.fullName}</span>
                          <span className="font-mono text-[10px] text-cyan-400">{m.swimId}</span>
                          {isTransfer && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950/70 text-amber-300 border border-amber-800/40">
                              Actuel: {m.group?.name}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {getSwimLevelLabel(m.level)} {m.phone && `· ${m.phone}`}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={isTransfer ? "secondary" : "primary"}
                        disabled={assigningMemberId === m.id}
                        onClick={() => handleAssignSwimmer(m.id)}
                        className="shrink-0 text-xs"
                      >
                        {assigningMemberId === m.id ? "..." : isTransfer ? "Transférer" : "Assigner"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
            {searchAssignQuery.trim().length >= 2 && !searchingAssign && searchAssignResults.length === 0 && (
              <p className="text-[11px] text-slate-400 italic">
                Aucun nageur éligible trouvé pour cette recherche.
              </p>
            )}
          </div>
        )}

        {/* Swimmers Roster List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Nageurs Inscrits ({enrolledCount} / {capacity})
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Accès rapide
            </span>
          </div>

          {loadingDetail ? (
            <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
              Chargement du roster...
            </div>
          ) : enrolledCount === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-white/10 rounded-2xl">
              Aucun nageur inscrit dans ce groupe pour le moment.
            </div>
          ) : (
            <div className="space-y-2">
              {selectedGroup.swimmers.map((s) => {
                const waFormatted = formatWhatsAppNumber(s.phone);
                const hasWhatsApp = Boolean(waFormatted && waFormatted.length >= 8);

                return (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl bg-slate-900/60 border border-white/10 hover:border-white/20 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/swim/profile/${s.swimId}`}
                            target="_blank"
                            className="font-bold text-white text-sm hover:text-cyan-300 transition-colors"
                          >
                            {s.fullName}
                          </Link>
                          <span className="font-mono text-[11px] text-cyan-400 font-semibold px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-800/40">
                            {s.swimId}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {getSwimLevelLabel(s.level)}
                        </div>
                      </div>

                      {/* Fast Contact Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasWhatsApp && (
                          <a
                            href={`https://wa.me/${waFormatted}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Ouvrir WhatsApp"
                            className="p-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 text-emerald-400 hover:text-emerald-300 border border-emerald-800/50 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                            </svg>
                          </a>
                        )}
                        {s.phone && (
                          <a
                            href={`tel:${s.phone.replace(/\s+/g, "")}`}
                            title="Appeler"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-white border border-white/10 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </a>
                        )}
                        <Link
                          href={`/swim/profile/${s.swimId}`}
                          target="_blank"
                          title="Fiche Nageur & Pass"
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-cyan-300 border border-white/10 transition-colors"
                        >
                          Pass ↗
                        </Link>
                      </div>
                    </div>

                    {/* Badges & Remove */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {s.paymentStatus === "paid" && <Badge tone="success">Payé</Badge>}
                        {s.paymentStatus === "partial" && <Badge tone="warning">Partiel</Badge>}
                        {s.paymentStatus === "unpaid" && <Badge tone="danger">Non payé</Badge>}

                        {s.groupStatus === "accepted" && <Badge tone="success">Confirmé</Badge>}
                        {s.groupStatus === "proposed" && <Badge tone="warning">Proposé</Badge>}
                        {s.groupStatus === "rejected" && <Badge tone="danger">Refusé</Badge>}
                      </div>

                      <button
                        type="button"
                        disabled={removingMemberId === s.id}
                        onClick={() => handleRemoveSwimmer(s.id)}
                        className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline transition-colors"
                      >
                        {removingMemberId === s.id ? "Retrait..." : "Désassigner"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Render Group Card (Used in Grid View) ──────────────────────────────────

  function renderGroupCard(g: SwimGroup) {
    const count = g._count?.swimmers ?? 0;
    const safeCapacity = g.capacity || 10;
    const isFull = count >= safeCapacity;
    const isSolid = g.isSolid ?? decodeSolidNotes(g.notes).isSolid;
    const cleanNotes = g.cleanNotes ?? decodeSolidNotes(g.notes).cleanNotes;
    const isSelected = selectedGroupId === g.id;

    return (
      <div
        key={g.id}
        onClick={() => selectGroup(g.id, true)}
        className={`rounded-2xl border p-5 flex flex-col justify-between transition-all shadow-sm cursor-pointer group ${
          isSelected
            ? "border-cyan-500 bg-slate-900/90 shadow-[0_0_20px_rgba(0,242,255,0.15)] ring-1 ring-cyan-500/50"
            : g.active
            ? "border-[var(--border)] bg-[var(--surface)]/80 hover:border-cyan-500/40 hover:bg-slate-900/60"
            : "border-white/5 bg-[var(--surface)]/40 opacity-60"
        }`}
      >
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-bold text-white text-base group-hover:text-cyan-400 transition-colors">
              {g.name}
            </h3>
            <div className="flex items-center gap-1.5 shrink-0">
              {!g.active && <Badge tone="danger">Archived</Badge>}
              {g.active && <Badge tone="success">Active</Badge>}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-800 text-slate-300 border border-white/10">
              {CATEGORY_LABELS[g.category] ?? g.category}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                g.level === "G10"
                  ? "bg-sky-950/70 text-sky-400 border border-sky-800/50"
                  : g.level === "MAX5"
                  ? "bg-indigo-950/70 text-indigo-400 border border-indigo-800/50"
                  : "bg-teal-950/70 text-teal-400 border border-teal-800/50"
              }`}
            >
              {g.level}
            </span>
            {isSolid && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-950/70 text-emerald-400 border border-emerald-800/50 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                Solid
              </span>
            )}
          </div>

          <div className="space-y-2 text-xs text-slate-300 mb-4 bg-slate-900/40 p-3 rounded-xl border border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Coach:</span>
              <span className="font-semibold text-cyan-300">{g.coachName || "Unassigned"}</span>
            </div>
            <div className="pt-1">
              {renderScheduleChips(g.schedule)}
            </div>
            {cleanNotes && (
              <div className="pt-1 text-[11px] text-slate-400 border-t border-white/5">{cleanNotes}</div>
            )}
          </div>

          <div className="space-y-1 mb-4">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Remplissage</span>
              <span className="font-mono font-bold text-white">{count} / {safeCapacity}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isFull ? "bg-rose-500" : count > safeCapacity * 0.7 ? "bg-amber-400" : "bg-cyan-400"
                }`}
                style={{ width: `${Math.min(100, Math.round((count / safeCapacity) * 100))}%` }}
              />
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-white/5 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant={isSelected ? "primary" : "secondary"}
            className="flex-1 text-xs"
            onClick={() => selectGroup(g.id, true)}
          >
            Roster ({count})
          </Button>
          <Button size="sm" variant="secondary" className="text-xs" onClick={() => openEditModal(g)}>
            Edit
          </Button>
          <Button size="sm" variant="secondary" className="text-xs" onClick={() => toggleActive(g)}>
            {g.active ? "Archive" : "Activate"}
          </Button>
        </div>
      </div>
    );
  }

  // ─── Main Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="AQA Swim Groups Manager"
        description="Gestion avancée des groupes d'entraînement, affectation des entraîneurs, suivi du remplissage et accès immédiat aux listes de nageurs."
        action={
          <div className="flex items-center gap-2.5">
            <Button onClick={() => setShowPreferencesModal(true)} variant="secondary" className="text-xs">
              Préférences
            </Button>
            <Button onClick={() => setShowAddModal(true)} variant="primary">
              + Nouveau Groupe
            </Button>
          </div>
        }
      />

      {/* Top Operations & Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-[var(--surface)]/80 border border-[var(--border)]">
          <span className="text-[11px] text-slate-400 uppercase font-semibold block">Total Groupes</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-black text-white font-mono">{groups.length}</span>
            <span className="text-xs text-slate-400">
              ({groups.filter((g) => g.active).length} actifs)
            </span>
          </div>
        </div>
        <div className="p-3.5 rounded-2xl bg-[var(--surface)]/80 border border-[var(--border)]">
          <span className="text-[11px] text-slate-400 uppercase font-semibold block">Nageurs Affectés</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-black text-cyan-400 font-mono">{totalSwimmersEnrolled}</span>
            <span className="text-xs text-slate-400">inscrits</span>
          </div>
        </div>
        <div className="p-3.5 rounded-2xl bg-[var(--surface)]/80 border border-[var(--border)]">
          <span className="text-[11px] text-slate-400 uppercase font-semibold block">Taux de Remplissage</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-black text-emerald-400 font-mono">{overallOccupancyPct}%</span>
            <span className="text-xs text-slate-400">global</span>
          </div>
        </div>
        <div className="p-3.5 rounded-2xl bg-[var(--surface)]/80 border border-[var(--border)]">
          <span className="text-[11px] text-slate-400 uppercase font-semibold block">Groupes Solid</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-black text-white font-mono">
              {groups.filter((g) => decodeSolidNotes(g.notes).isSolid).length}
            </span>
            <span className="text-xs text-emerald-400 font-semibold">garantis</span>
          </div>
        </div>
      </div>

      {/* Filter, Sort & View Controls Bar */}
      <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="md:col-span-4">
            <Input
              placeholder="Rechercher par nom, coach, horaire ou lieu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Sort Selector */}
          <div className="md:col-span-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SwimGroupSortOption)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 font-medium"
            >
              <option value="schedule_asc">Planning (Lundi à Dimanche)</option>
              <option value="occupancy_desc">Remplissage (Plein en premier)</option>
              <option value="occupancy_asc">Remplissage (Places libres d&apos;abord)</option>
              <option value="swimmers_desc">Nombre de nageurs (Décroissant)</option>
              <option value="name_asc">Nom du groupe (A à Z)</option>
              <option value="coach_asc">Entraîneur (A à Z)</option>
              <option value="created_desc">Plus récents d&apos;abord</option>
            </select>
          </div>

          {/* Cohort Level Filter */}
          <div className="md:col-span-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
            >
              <option value="all">Tous Formats</option>
              <option value="G10">G10 (10 pers.)</option>
              <option value="MAX5">MAX5 (5 pers.)</option>
              <option value="indiv">Individuel</option>
            </select>
          </div>

          {/* Solid Filter */}
          <div className="md:col-span-2">
            <select
              value={solidFilter}
              onChange={(e) => setSolidFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
            >
              <option value="all">Tous types Solid</option>
              <option value="solid">Groupes Solid uniquement</option>
              <option value="regular">Réguliers uniquement</option>
            </select>
          </div>

          {/* View Mode Switcher */}
          <div className="md:col-span-1 flex items-center justify-end">
            <div className="flex bg-slate-900 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setViewMode("split")}
                title="Split View (Roster direct)"
                className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  viewMode === "split"
                    ? "bg-cyan-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                title="Grid Cards View"
                className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  viewMode === "grid"
                    ? "bg-cyan-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs border-t border-white/5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 text-[11px] font-medium mr-1">Catégorie:</span>
            {["all", "homme", "femme", "enfants", "apnea"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase transition-all flex items-center gap-1.5 ${
                  categoryFilter === cat
                    ? "bg-cyan-500 text-slate-950 shadow-sm"
                    : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                }`}
              >
                <span>{cat === "all" ? "Toutes" : CATEGORY_LABELS[cat] ?? cat}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    categoryFilter === cat
                      ? "bg-slate-950/40 text-slate-950"
                      : "bg-slate-900 text-slate-400"
                  }`}
                >
                  {categoryCounts[cat] ?? 0}
                </span>
              </button>
            ))}
          </div>

          <span className="text-slate-400 text-xs font-mono">
            {sortedGroups.length} sur {groups.length} groupes affichés
          </span>
        </div>
      </div>

      {/* Main Groups Workspace */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm animate-pulse">
          Chargement des groupes d&apos;entraînement...
        </div>
      ) : sortedGroups.length === 0 ? (
        <div className="py-20 text-center text-slate-400 border border-dashed border-white/10 rounded-2xl space-y-2">
          <p className="text-base font-semibold text-white">Aucun groupe ne correspond à vos critères.</p>
          <p className="text-xs">Modifiez vos filtres ou créez un nouveau groupe d&apos;entraînement.</p>
          <Button onClick={() => setShowAddModal(true)} variant="primary" size="sm" className="mt-2">
            + Nouveau Groupe
          </Button>
        </div>
      ) : viewMode === "split" ? (
        /* ─── SPLIT VIEW: Interactive Groups Table (Left) + Live Roster Inspector (Right) ─── */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Groups List Column (Left) */}
          <div className="lg:col-span-7 space-y-2.5">
            {sortedGroups.map((g) => {
              const count = g._count?.swimmers ?? 0;
              const isFull = count >= g.capacity;
              const isSolid = g.isSolid ?? decodeSolidNotes(g.notes).isSolid;
              const isSelected = selectedGroupId === g.id;
              const occPct = Math.min(100, Math.round((count / (g.capacity || 10)) * 100));

              return (
                <div
                  key={g.id}
                  onClick={() => selectGroup(g.id, true)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                    isSelected
                      ? "border-cyan-500 bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/40 shadow-[0_0_20px_rgba(0,242,255,0.18)] ring-1 ring-cyan-500/60"
                      : "border-white/5 bg-[var(--surface)]/70 hover:border-cyan-500/40 hover:bg-slate-900/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-bold text-sm truncate ${isSelected ? "text-cyan-300" : "text-white"}`}>
                          {g.name}
                        </h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-800 text-slate-300 border border-white/10">
                          {CATEGORY_LABELS[g.category] ?? g.category}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            g.level === "G10"
                              ? "bg-sky-950/70 text-sky-400 border border-sky-800/50"
                              : g.level === "MAX5"
                              ? "bg-indigo-950/70 text-indigo-400 border border-indigo-800/50"
                              : "bg-teal-950/70 text-teal-400 border border-teal-800/50"
                          }`}
                        >
                          {g.level}
                        </span>
                        {isSolid && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950/70 text-emerald-400 border border-emerald-800/50">
                            Solid
                          </span>
                        )}
                        {!g.active && <Badge tone="danger">Archived</Badge>}
                      </div>

                      {/* Coach & Schedule */}
                      <div className="flex items-center gap-3 text-xs text-slate-300 flex-wrap">
                        <span className="text-cyan-400 font-medium">
                          Coach: {g.coachName || "Non assigné"}
                        </span>
                        <div className="shrink-0">{renderScheduleChips(g.schedule)}</div>
                      </div>
                    </div>

                    {/* Occupancy Indicator & Action */}
                    <div className="text-right shrink-0 space-y-1.5 min-w-[100px]">
                      <div className="flex items-center justify-end gap-1.5">
                        <Badge tone={isFull ? "danger" : occPct >= 70 ? "warning" : "info"}>
                          {count} / {g.capacity}
                        </Badge>
                      </div>
                      <div className="w-24 ml-auto h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isFull ? "bg-rose-500" : occPct >= 70 ? "bg-amber-400" : "bg-cyan-400"
                          }`}
                          style={{ width: `${occPct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 block">
                        {occPct}% plein
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Dynamic Roster Inspector (Right Sticky Desktop Column) */}
          <div className="hidden lg:block lg:col-span-5 sticky top-6">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md p-4 shadow-xl max-h-[calc(100vh-100px)] overflow-y-auto">
              {renderRosterPanelContent()}
            </div>
          </div>
        </div>
      ) : (
        /* ─── GRID CARDS VIEW ─── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedGroups.map(renderGroupCard)}
        </div>
      )}

      {/* ─── MOBILE SLIDE-OVER DRAWER (for fast reach on small screens) ─── */}
      {showMobileDrawer && (
        <div className="fixed inset-0 z-50 lg:hidden bg-black/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-slate-900 border-l border-white/10 p-5 overflow-y-auto h-full flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Roster du Groupe
                </h3>
                <button
                  type="button"
                  onClick={() => setShowMobileDrawer(false)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-xs text-slate-300 hover:text-white"
                >
                  Fermer ✕
                </button>
              </div>
              {renderRosterPanelContent()}
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD GROUP MODAL ─────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Créer un Groupe d&apos;Entraînement</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1"
              >
                Fermer
              </button>
            </div>

            <form onSubmit={handleAddGroup} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={addCategoryId} className="block text-xs font-semibold text-slate-300 mb-1">
                    Catégorie
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
                    Format *
                  </label>
                  <select
                    id={addTypeId}
                    value={addType}
                    onChange={(e) => handleTypeChange(e.target.value as SwimGroupType)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option value="G10">G10 (10 pers.)</option>
                    <option value="MAX5">MAX5 (5 pers.)</option>
                    <option value="indiv">Individuel (1 pers.)</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor={addCoachId} className="block text-xs font-semibold text-slate-300">
                    Entraîneur *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPreferencesModal(true)}
                    className="text-[11px] text-cyan-400 hover:underline"
                  >
                    + Gérer Entraîneurs
                  </button>
                </div>
                <select
                  id={addCoachId}
                  required
                  value={addCoach}
                  onChange={(e) => setAddCoach(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                >
                  <option value="">-- Sélectionner un Entraîneur --</option>
                  {coaches.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                      {c.specialties ? ` (${c.specialties})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Day / Time Selectors (Dual-slot for enfants) */}
              {addCategory === "enfants" ? (
                <div className="space-y-3 p-3 rounded-xl bg-slate-950/40 border border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-cyan-300">
                      Horaires Enfants (2 séances d&apos;1h séparées / semaine)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/70 text-cyan-400 border border-cyan-800/40 font-mono">
                      1h + 1h
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor={addDayId} className="block text-xs font-semibold text-slate-300 mb-1">
                        Séance 1 - Jour *
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
                        Séance 1 - Heure *
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
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor={addDay2Id} className="block text-xs font-semibold text-slate-300 mb-1">
                        Séance 2 - Jour *
                      </label>
                      <select
                        id={addDay2Id}
                        value={addDay2}
                        onChange={(e) => setAddDay2(e.target.value)}
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
                      <label htmlFor={addTime2Id} className="block text-xs font-semibold text-slate-300 mb-1">
                        Séance 2 - Heure *
                      </label>
                      <select
                        id={addTime2Id}
                        value={addTime2}
                        onChange={(e) => setAddTime2(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                      >
                        {SWIM_TIME_SLOTS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label htmlFor={addLocationId} className="block text-xs font-semibold text-slate-300 mb-1">
                      Lieu / Bassin *
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
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor={addDayId} className="block text-xs font-semibold text-slate-300 mb-1">
                      Jour *
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
                      Heure *
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
                      Lieu *
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
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor={addNameId} className="block text-xs font-semibold text-slate-300">
                    Nom du Groupe (Généré Automatiquement) *
                  </label>
                  <button
                    type="button"
                    onClick={regenerateAddName}
                    className="text-[11px] text-cyan-400 hover:underline"
                  >
                    Régénérer
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
                  placeholder={
                    addCategory === "enfants"
                      ? "ex: Sam 18:00+Mer 18:00 Karim B Bass"
                      : "ex: Lun 18:00 Karim B Bass"
                  }
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  {addCategory === "enfants"
                    ? "Format enfants: (jour 1) (heure 1)+(jour 2) (heure 2) (7 lettres coach) (4 lettres lieu)"
                    : "Format: (3 letters day) (time) (7 letters coach) (4 letters location)"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label htmlFor={addCapacityId} className="block text-xs font-semibold text-slate-300 mb-1">
                    Capacité Maximale
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
                  <label
                    htmlFor={addSolidId}
                    className="flex items-center gap-2.5 cursor-pointer bg-slate-800/80 p-2.5 rounded-xl border border-white/10 hover:border-cyan-500/50 transition-colors"
                  >
                    <input
                      id={addSolidId}
                      type="checkbox"
                      checked={addIsSolid}
                      onChange={(e) => setAddIsSolid(e.target.checked)}
                      className="h-4 w-4 accent-cyan-500 rounded"
                    />
                    <span className="text-xs font-semibold text-white">Marquer comme Solid</span>
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor={addNotesId} className="block text-xs font-semibold text-slate-300 mb-1">
                  Lignes d&apos;eau / Notes
                </label>
                <textarea
                  id={addNotesId}
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  placeholder="ex: Bassin olympique, lignes 3 et 4..."
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
                  Annuler
                </Button>
                <Button type="submit" variant="primary" disabled={submittingAdd} className="flex-1">
                  {submittingAdd ? "Création..." : "Créer le Groupe"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EDIT GROUP MODAL ─────────────────────────────────────────────── */}
      {editingGroup && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Modifier le Groupe</h3>
              <button
                type="button"
                onClick={() => setEditingGroup(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1"
              >
                Fermer
              </button>
            </div>

            <form onSubmit={handleEditGroup} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={editCategoryId} className="block text-xs font-semibold text-slate-300 mb-1">
                    Catégorie
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
                    Format *
                  </label>
                  <select
                    id={editTypeId}
                    value={editType}
                    onChange={(e) => handleEditTypeChange(e.target.value as SwimGroupType)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option value="G10">G10 (10 pers.)</option>
                    <option value="MAX5">MAX5 (5 pers.)</option>
                    <option value="indiv">Individuel (1 pers.)</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor={editCoachId} className="block text-xs font-semibold text-slate-300 mb-1">
                  Entraîneur
                </label>
                <select
                  id={editCoachId}
                  value={editCoach}
                  onChange={(e) => setEditCoach(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                >
                  <option value="">-- Sélectionner un Entraîneur --</option>
                  {coaches.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                      {c.specialties ? ` (${c.specialties})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Day / Time Selectors (Dual-slot for enfants) */}
              {editCategory === "enfants" ? (
                <div className="space-y-3 p-3 rounded-xl bg-slate-950/40 border border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-cyan-300">
                      Horaires Enfants (2 séances d&apos;1h séparées / semaine)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/70 text-cyan-400 border border-cyan-800/40 font-mono">
                      1h + 1h
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor={editDayId} className="block text-xs font-semibold text-slate-300 mb-1">
                        Séance 1 - Jour
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
                        Séance 1 - Heure
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
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor={editDay2Id} className="block text-xs font-semibold text-slate-300 mb-1">
                        Séance 2 - Jour
                      </label>
                      <select
                        id={editDay2Id}
                        value={editDay2}
                        onChange={(e) => setEditDay2(e.target.value)}
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
                      <label htmlFor={editTime2Id} className="block text-xs font-semibold text-slate-300 mb-1">
                        Séance 2 - Heure
                      </label>
                      <select
                        id={editTime2Id}
                        value={editTime2}
                        onChange={(e) => setEditTime2(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                      >
                        {SWIM_TIME_SLOTS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label htmlFor={editLocationId} className="block text-xs font-semibold text-slate-300 mb-1">
                      Lieu / Bassin
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
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor={editDayId} className="block text-xs font-semibold text-slate-300 mb-1">
                      Jour
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
                      Heure
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
                      Lieu
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
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor={editNameId} className="block text-xs font-semibold text-slate-300">
                    Nom du Groupe
                  </label>
                  <button
                    type="button"
                    onClick={regenerateEditName}
                    className="text-[11px] text-cyan-400 hover:underline"
                  >
                    Régénérer
                  </button>
                </div>
                <Input
                  id={editNameId}
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  {editCategory === "enfants"
                    ? "Format enfants: (jour 1) (heure 1)+(jour 2) (heure 2) (7 lettres coach) (4 lettres lieu)"
                    : "Format: (3 letters day) (time) (7 letters coach) (4 letters location)"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label htmlFor={editCapacityId} className="block text-xs font-semibold text-slate-300 mb-1">
                    Capacité Maximale
                  </label>
                  <Input
                    id={editCapacityId}
                    type="number"
                    value={editCapacity}
                    onChange={(e) => setEditCapacity(e.target.value)}
                  />
                </div>
                <div className="pt-5">
                  <label
                    htmlFor={editSolidId}
                    className="flex items-center gap-2.5 cursor-pointer bg-slate-800/80 p-2.5 rounded-xl border border-white/10 hover:border-cyan-500/50 transition-colors"
                  >
                    <input
                      id={editSolidId}
                      type="checkbox"
                      checked={editIsSolid}
                      onChange={(e) => setEditIsSolid(e.target.checked)}
                      className="h-4 w-4 accent-cyan-500 rounded"
                    />
                    <span className="text-xs font-semibold text-white">Marquer comme Solid</span>
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor={editNotesId} className="block text-xs font-semibold text-slate-300 mb-1">
                  Lignes d&apos;eau / Notes
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
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submittingEdit}
                  className="flex-1"
                >
                  {submittingEdit ? "Enregistrement..." : "Sauvegarder"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── PREFERENCES MODAL ───────────────────────────────────────────── */}
      {showPreferencesModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white">Préférences du Manager de Groupes</h3>
                <p className="text-xs text-slate-400">Configurez les entraîneurs et les bassins disponibles.</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setShowPreferencesModal(false)}>
                Fermer
              </Button>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">1. Entraîneurs AQA</h4>
              <form onSubmit={handleAddCoach} className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label htmlFor={prefCoachNameId} className="sr-only">Nom</label>
                  <Input
                    id={prefCoachNameId}
                    required
                    placeholder="Nom complet..."
                    value={newCoachName}
                    onChange={(e) => setNewCoachName(e.target.value)}
                  />
                  <label htmlFor={prefCoachPhoneId} className="sr-only">Téléphone</label>
                  <Input
                    id={prefCoachPhoneId}
                    placeholder="Téléphone..."
                    value={newCoachPhone}
                    onChange={(e) => setNewCoachPhone(e.target.value)}
                  />
                  <label htmlFor={prefCoachSpecId} className="sr-only">Spécialités</label>
                  <Input
                    id={prefCoachSpecId}
                    placeholder="ex: Crawl, Enfants..."
                    value={newCoachSpecialties}
                    onChange={(e) => setNewCoachSpecialties(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="primary" size="sm" disabled={savingCoach || !newCoachName.trim()}>
                  {savingCoach ? "Enregistrement..." : "+ Ajouter Entraîneur"}
                </Button>
              </form>
              <div className="divide-y divide-white/5 border border-white/10 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                {coaches.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400">Aucun entraîneur configuré.</div>
                ) : (
                  coaches.map((c) => (
                    <div key={c.id} className="p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-white">{c.name}</span>
                        {c.specialties && (
                          <span className="ml-2 text-[11px] text-slate-400">({c.specialties})</span>
                        )}
                        {c.phone && (
                          <span className="ml-2 font-mono text-[10px] text-cyan-400">{c.phone}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={c.active ? "success" : "danger"}>
                          {c.active ? "Actif" : "Inactif"}
                        </Badge>
                        <button
                          type="button"
                          onClick={() => handleDeleteCoach(c.id)}
                          className="text-slate-400 hover:text-rose-400 text-xs px-1"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-white/10">
              <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">2. Bassins & Piscines</h4>
              <form onSubmit={handleAddLocation} className="flex gap-2">
                <label htmlFor={prefLocNameId} className="sr-only">Nom du bassin</label>
                <Input
                  id={prefLocNameId}
                  required
                  placeholder="ex: Bassin Olympique Kouba..."
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
                  {savingLocation ? "Enregistrement..." : "+ Ajouter"}
                </Button>
              </form>
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
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// AQA Swim - Pool Direction Correspondence Utilities
// Standard Western Arabic numerals only (0-9). No emojis anywhere.
// Production-grade domain logic for Pool Administration dispatches.

import { FRENCH_DAYS, parseScheduleSlots, decodeMemberGroupIds } from "./swim-groups";

export type PoolCorrespondenceMode = "preview" | "real_final";

export interface PoolPricingConfig {
  defaultPrice: number;
  categoryPrices: {
    homme: number;
    femme: number;
    enfants: number;
    apnea: number;
  };
  individualOverrides: Record<string, number>;
}

export const DEFAULT_POOL_PRICING: PoolPricingConfig = {
  defaultPrice: 2000,
  categoryPrices: {
    homme: 2000,
    femme: 2000,
    enfants: 1500,
    apnea: 2500,
  },
  individualOverrides: {},
};

export type PoolColumnKey =
  | "number"
  | "name"
  | "swimId"
  | "groups"
  | "schedule"
  | "category"
  | "poolPrice"
  | "currentMonth"
  | "phone"
  | "paymentStatus";

export type PoolColumnConfig = Record<PoolColumnKey, boolean>;

export const DEFAULT_PREVIEW_COLUMNS: PoolColumnConfig = {
  number: true,
  name: true,
  swimId: false,
  groups: true,
  schedule: true,
  category: true,
  poolPrice: false, // In preview, price is hidden by default
  currentMonth: true,
  phone: false,
  paymentStatus: false,
};

export const DEFAULT_REAL_FINAL_COLUMNS: PoolColumnConfig = {
  number: true,
  name: true,
  swimId: false,
  groups: true,
  schedule: true,
  category: true,
  poolPrice: true, // Prominent in RealFinalPool
  currentMonth: true,
  phone: false,
  paymentStatus: false,
};

export interface SwimGroupReference {
  id: string;
  name: string;
  category?: string;
  level?: string;
  coachName?: string | null;
  schedule: string;
  capacity?: number;
  active?: boolean;
}

export interface SwimMemberReference {
  id: string;
  swimId: string;
  fullName: string;
  phone: string;
  email?: string | null;
  category: string;
  level: string;
  paymentStatus: "unpaid" | "paid" | "partial";
  notes: string | null;
  groupId: string | null;
  group?: {
    id: string;
    name: string;
    coachName?: string | null;
    schedule: string;
    capacity?: number;
    category?: string;
    active?: boolean;
  } | null;
}

export interface ParsedSlot {
  day: string;
  time: string;
  location: string;
  isPeak: boolean;
}

export interface PoolSwimmerRow {
  memberId: string;
  swimId: string;
  fullName: string;
  category: string;
  level: string;
  phone: string;
  paymentStatus: "unpaid" | "paid" | "partial";
  assignedGroupIds: string[];
  assignedGroupNames: string[];
  assignedSchedules: string[];
  parsedSlots: ParsedSlot[];
  hasBusySlot: boolean;
  busySlotLabels: string[];
  poolPriceDA: number;
  hasPriceOverride: boolean;
  currentMonth: string;
}

export interface SlotOccupancySummary {
  key: string; // e.g. "Samedi_18:00"
  day: string;
  time: string;
  isPeak: boolean;
  swimmerCount: number;
  swimmerIds: string[];
  groupNames: string[];
}

export interface RealFinalPoolSummary {
  totalSwimmers: number;
  selectedCount: number;
  totalDuePoolDA: number;
  averageFeePerSwimmerDA: number;
  categoryBreakdown: Record<string, { count: number; subtotalDA: number }>;
}

export interface PoolSlotReservation {
  id: string;
  groupId: string;
  groupName: string;
  category: string;
  coachName?: string | null;
  day: string;
  time: string;
  timeSlot: string;
  location: string;
  isPeak: boolean;
  reservedPlaces: number;
  capacity: number;
  actualAssignedCount: number;
  hasCustomPlaces: boolean;
}

export interface PoolSlotReservationSummary {
  totalReservations: number;
  selectedReservationsCount: number;
  totalReservedPlaces: number;
  peakReservedPlaces: number;
  normalReservedPlaces: number;
}

export interface PoolDispatchSnapshot {
  id: string;
  mode: PoolCorrespondenceMode;
  month: string; // YYYY-MM
  monthLabel: string;
  createdAt: string;
  swimmerCount: number;
  totalPoolPriceDA: number;
  notes?: string;
  rows: Array<{
    swimId: string;
    fullName: string;
    category: string;
    groupNames: string;
    schedule: string;
    poolPriceDA: number;
  }>;
}

export const STORAGE_KEYS = {
  PRICING: "aqa_swim_pool_pricing_v1",
  COLUMNS_PREVIEW: "aqa_swim_pool_cols_preview_v1",
  COLUMNS_FINAL: "aqa_swim_pool_cols_final_v1",
  SNAPSHOTS: "aqa_swim_realfinalpool_snapshots_v1",
  SELECTED_MEMBERS: "aqa_swim_pool_selected_members_v1",
  RESERVATION_OVERRIDES: "aqa_swim_pool_places_overrides_v1",
  SELECTED_RESERVATIONS: "aqa_swim_pool_selected_reservations_v1",
};

/**
 * Determines whether a time slot falls in busy peak hours.
 * Peak hours:
 * 1. Weekday evening slots (17:00 and onwards)
 * 2. Weekend (Samedi / Vendredi) slots: morning (09:00 - 12:30) and afternoon/evening (16:00 - 21:30)
 */
export function isPeakTimeSlot(time: string, day?: string): boolean {
  if (!time) return false;
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return false;
  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const totalMinutes = hour * 60 + minute;

  const normalizedDay = day ? day.toLowerCase().trim() : "";
  const isWeekend = normalizedDay.includes("samedi") || normalizedDay.includes("vendredi");

  if (isWeekend) {
    // Weekend peak: 09:00 to 12:30 or 15:30 to 21:30
    if (totalMinutes >= 9 * 60 && totalMinutes <= 12 * 60 + 30) return true;
    if (totalMinutes >= 15 * 60 + 30 && totalMinutes <= 21 * 60 + 30) return true;
  }

  // Weekday evening peak: 17:00 (1020 mins) to 22:00 (1320 mins)
  if (totalMinutes >= 17 * 60 && totalMinutes <= 22 * 60) {
    return true;
  }

  return false;
}

/**
 * Calculates the pool fee for a member based on individual overrides, category rates, or default rate.
 */
export function calculateMemberPoolPrice(
  member: { id: string; swimId?: string; category?: string },
  config: PoolPricingConfig
): { priceDA: number; hasOverride: boolean } {
  // Check override by swimId or member id
  if (member.swimId && config.individualOverrides[member.swimId] !== undefined) {
    return {
      priceDA: Number(config.individualOverrides[member.swimId]) || 0,
      hasOverride: true,
    };
  }
  if (member.id && config.individualOverrides[member.id] !== undefined) {
    return {
      priceDA: Number(config.individualOverrides[member.id]) || 0,
      hasOverride: true,
    };
  }

  // Check category price
  const cat = (member.category || "").toLowerCase().trim();
  if (cat.includes("homme") && typeof config.categoryPrices.homme === "number") {
    return { priceDA: config.categoryPrices.homme, hasOverride: false };
  }
  if (cat.includes("femme") && typeof config.categoryPrices.femme === "number") {
    return { priceDA: config.categoryPrices.femme, hasOverride: false };
  }
  if (cat.includes("enfant") && typeof config.categoryPrices.enfants === "number") {
    return { priceDA: config.categoryPrices.enfants, hasOverride: false };
  }
  if (cat.includes("apne") && typeof config.categoryPrices.apnea === "number") {
    return { priceDA: config.categoryPrices.apnea, hasOverride: false };
  }

  // Fallback to default
  return { priceDA: config.defaultPrice ?? 2000, hasOverride: false };
}

/**
 * Resolves all groups a member belongs to, combining primary groupId and secondary groups from notes.
 */
export function resolveMemberGroups(
  member: { groupId: string | null; notes: string | null; group?: SwimGroupReference | null },
  allGroups: SwimGroupReference[]
): SwimGroupReference[] {
  const groupIds = decodeMemberGroupIds(member.notes, member.groupId);
  if (groupIds.length === 0) {
    if (member.group) return [member.group];
    return [];
  }

  const groupMap = new Map<string, SwimGroupReference>();
  for (const g of allGroups) {
    groupMap.set(g.id, g);
  }
  if (member.group) {
    groupMap.set(member.group.id, member.group);
  }

  const resolved: SwimGroupReference[] = [];
  for (const gid of groupIds) {
    const found = groupMap.get(gid);
    if (found) {
      resolved.push(found);
    }
  }
  return resolved;
}

/**
 * Builds the complete list of dispatch rows for all members.
 */
export function buildPoolDispatchRows(
  members: SwimMemberReference[],
  allGroups: SwimGroupReference[],
  pricingConfig: PoolPricingConfig,
  currentMonthLabel: string
): PoolSwimmerRow[] {
  return members.map((m) => {
    const assignedGroups = resolveMemberGroups(m, allGroups);
    const assignedGroupIds = assignedGroups.map((g) => g.id);
    const assignedGroupNames = assignedGroups.map((g) => g.name);
    const assignedSchedules = assignedGroups.map((g) => g.schedule).filter(Boolean);

    const parsedSlots: ParsedSlot[] = [];
    const busySlotLabels: string[] = [];

    for (const group of assignedGroups) {
      if (!group.schedule) continue;
      const slots = parseScheduleSlots(group.schedule);
      for (const slot of slots) {
        if (!slot.day && !slot.time) continue;
        const isPeak = isPeakTimeSlot(slot.time, slot.day);
        parsedSlots.push({
          day: slot.day,
          time: slot.time,
          location: slot.location,
          isPeak,
        });
        if (isPeak) {
          const label = `${slot.day} ${slot.time}`.trim();
          if (!busySlotLabels.includes(label)) {
            busySlotLabels.push(label);
          }
        }
      }
    }

    const { priceDA, hasOverride } = calculateMemberPoolPrice(m, pricingConfig);

    return {
      memberId: m.id,
      swimId: m.swimId,
      fullName: m.fullName,
      category: m.category,
      level: m.level,
      phone: m.phone,
      paymentStatus: m.paymentStatus,
      assignedGroupIds,
      assignedGroupNames,
      assignedSchedules,
      parsedSlots,
      hasBusySlot: busySlotLabels.length > 0,
      busySlotLabels,
      poolPriceDA: priceDA,
      hasPriceOverride: hasOverride,
      currentMonth: currentMonthLabel,
    };
  });
}

/**
 * Computes slot occupancy matrix for Method ONE (busy hours & schedule preview).
 */
export function computeSlotOccupancy(rows: PoolSwimmerRow[]): SlotOccupancySummary[] {
  const map = new Map<string, SlotOccupancySummary>();

  for (const row of rows) {
    for (const slot of row.parsedSlots) {
      if (!slot.day || !slot.time) continue;
      const key = `${slot.day}_${slot.time}`;
      let entry = map.get(key);
      if (!entry) {
        entry = {
          key,
          day: slot.day,
          time: slot.time,
          isPeak: slot.isPeak,
          swimmerCount: 0,
          swimmerIds: [],
          groupNames: [],
        };
        map.set(key, entry);
      }
      if (!entry.swimmerIds.includes(row.swimId)) {
        entry.swimmerCount += 1;
        entry.swimmerIds.push(row.swimId);
      }
      for (const gname of row.assignedGroupNames) {
        if (!entry.groupNames.includes(gname)) {
          entry.groupNames.push(gname);
        }
      }
    }
  }

  // Sort by French days order, then time
  const dayIndex = (d: string) => {
    const idx = FRENCH_DAYS.findIndex((fd) => fd.toLowerCase() === d.toLowerCase());
    return idx === -1 ? 99 : idx;
  };

  return Array.from(map.values()).sort((a, b) => {
    const dDiff = dayIndex(a.day) - dayIndex(b.day);
    if (dDiff !== 0) return dDiff;
    return a.time.localeCompare(b.time);
  });
}

/**
 * Computes summary statistics for Method TWO (RealFinalPool).
 */
export function computeRealFinalPoolSummary(
  rows: PoolSwimmerRow[],
  selectedIds: Set<string>
): RealFinalPoolSummary {
  const totalSwimmers = rows.length;
  let selectedCount = 0;
  let totalDuePoolDA = 0;
  const categoryBreakdown: Record<string, { count: number; subtotalDA: number }> = {};

  for (const row of rows) {
    if (!selectedIds.has(row.swimId) && !selectedIds.has(row.memberId)) {
      continue;
    }
    selectedCount += 1;
    totalDuePoolDA += row.poolPriceDA;

    const cat = row.category || "other";
    if (!categoryBreakdown[cat]) {
      categoryBreakdown[cat] = { count: 0, subtotalDA: 0 };
    }
    categoryBreakdown[cat].count += 1;
    categoryBreakdown[cat].subtotalDA += row.poolPriceDA;
  }

  const averageFeePerSwimmerDA = selectedCount > 0 ? Math.round(totalDuePoolDA / selectedCount) : 0;

  return {
    totalSwimmers,
    selectedCount,
    totalDuePoolDA,
    averageFeePerSwimmerDA,
    categoryBreakdown,
  };
}

/**
 * Formats standard month label in the chosen language.
 * Standard Western Arabic numerals only (0-9).
 */
export function formatMonthLabel(year: number, monthIndex: number, locale: string): string {
  const date = new Date(year, monthIndex, 1);
  const loc = locale === "ar" ? "ar-DZ" : locale === "fr" ? "fr-FR" : "en-US";
  const raw = date.toLocaleString(loc, { month: "long", year: "numeric" });
  // Ensure Western Arabic numerals
  return raw.replace(/[\u0660-\u0669\u06f0-\u06f9]/g, (d) => {
    const code = d.charCodeAt(0);
    return code >= 0x0660 && code <= 0x0669
      ? String(code - 0x0660)
      : String(code - 0x06f0);
  });
}

/**
 * Exports dispatch rows to CSV with UTF-8 BOM for Microsoft Excel compatibility.
 */
export function exportPoolRowsToCSV(
  rows: PoolSwimmerRow[],
  activeColumns: PoolColumnConfig,
  monthLabel: string,
  selectedOnly: boolean,
  selectedIds: Set<string>
): string {
  const headers: string[] = [];
  if (activeColumns.number) headers.push("N");
  if (activeColumns.name) headers.push("Nom et Prenom");
  if (activeColumns.swimId) headers.push("ID Adherent");
  if (activeColumns.groups) headers.push("Groupe(s) Assigne(s)");
  if (activeColumns.schedule) headers.push("Creneau / Horaire");
  if (activeColumns.category) headers.push("Categorie");
  if (activeColumns.poolPrice) headers.push("Tarif Piscine (DA)");
  if (activeColumns.currentMonth) headers.push("Mois");
  if (activeColumns.phone) headers.push("Telephone");
  if (activeColumns.paymentStatus) headers.push("Statut Paiement");

  const escapeCSV = (val: string | number) => {
    const s = String(val ?? "").replace(/"/g, '""');
    return `"${s}"`;
  };

  const lines: string[] = [headers.join(";")];
  let rowIndex = 1;

  for (const r of rows) {
    if (selectedOnly && !selectedIds.has(r.swimId) && !selectedIds.has(r.memberId)) {
      continue;
    }
    const cols: string[] = [];
    if (activeColumns.number) cols.push(escapeCSV(rowIndex++));
    if (activeColumns.name) cols.push(escapeCSV(r.fullName));
    if (activeColumns.swimId) cols.push(escapeCSV(r.swimId));
    if (activeColumns.groups) cols.push(escapeCSV(r.assignedGroupNames.join(" + ") || "Non assigne"));
    if (activeColumns.schedule) cols.push(escapeCSV(r.assignedSchedules.join(" | ") || "-"));
    if (activeColumns.category) cols.push(escapeCSV(r.category));
    if (activeColumns.poolPrice) cols.push(escapeCSV(r.poolPriceDA));
    if (activeColumns.currentMonth) cols.push(escapeCSV(monthLabel));
    if (activeColumns.phone) cols.push(escapeCSV(r.phone));
    if (activeColumns.paymentStatus) cols.push(escapeCSV(r.paymentStatus));

    lines.push(cols.join(";"));
  }

  // BOM for Excel UTF-8
  return "\uFEFF" + lines.join("\r\n");
}

/**
 * Generates structured communication message for WhatsApp / Email dispatch to pool direction.
 * No emojis anywhere.
 */
export function generatePoolDispatchMessage(params: {
  mode: PoolCorrespondenceMode;
  monthLabel: string;
  totalSwimmers: number;
  totalDueDA?: number;
  busySlots?: Array<{ slot: string; count: number }>;
}): string {
  const { mode, monthLabel, totalSwimmers, totalDueDA, busySlots } = params;

  if (mode === "preview") {
    let msg = `*AQA SPORTS - ETAT PREVISIONNEL DEBUT DE MOIS*\n`;
    msg += `A l'attention de la Direction de la Piscine\n`;
    msg += `Periode: ${monthLabel}\n`;
    msg += `Nombre total d'adherents prevus: ${totalSwimmers}\n\n`;

    if (busySlots && busySlots.length > 0) {
      msg += `*Repartition Creneaux & Heures de Pointe :*\n`;
      for (const slot of busySlots.slice(0, 10)) {
        msg += `- ${slot.slot}: ${slot.count} adherents\n`;
      }
      msg += `\n`;
    }

    msg += `Nous restons a votre disposition pour tout ajustement des lignes d'eau.\n`;
    msg += `Cordialement,\nDirection AQA Sports`;
    return msg;
  }

  // RealFinalPool message
  let msg = `*AQA SPORTS - BORDEREAU RECAPITULATIF DEFINITIF (REALFINALPOOL)*\n`;
  msg += `A l'attention de la Direction de la Piscine\n`;
  msg += `Periode: ${monthLabel}\n`;
  msg += `Effectif reel d'adherents ayant frequente le bassin: ${totalSwimmers}\n`;
  if (typeof totalDueDA === "number") {
    const formatted = totalDueDA.toLocaleString("fr-DZ").replace(/[\u202F\u00A0]/g, " ");
    msg += `Montant total de la redevance piscine: ${formatted} DA\n`;
  }
  msg += `\nLe document officiel signe et cachete est a votre disposition pour reglement.\n`;
  msg += `Cordialement,\nDirection AQA Sports`;
  return msg;
}

/**
 * Builds simple place reservations for Method ONE (slots and capacity places only, NO client names).
 */
export function buildPoolSlotReservations(
  groups: SwimGroupReference[],
  members: SwimMemberReference[],
  placeOverrides: Record<string, number> = {}
): PoolSlotReservation[] {
  // Count assigned members per group
  const memberCountsByGroup = new Map<string, number>();
  for (const m of members) {
    const assigned = resolveMemberGroups(m, groups);
    for (const g of assigned) {
      memberCountsByGroup.set(g.id, (memberCountsByGroup.get(g.id) || 0) + 1);
    }
  }

  const reservations: PoolSlotReservation[] = [];

  for (const g of groups) {
    if (!g.schedule) continue;
    const slots = parseScheduleSlots(g.schedule);
    const assignedCount = memberCountsByGroup.get(g.id) || 0;

    slots.forEach((s, idx) => {
      if (!s.day && !s.time) return;
      const resId = `${g.id}_slot_${idx}`;
      const isPeak = isPeakTimeSlot(s.time, s.day);
      const defaultPlaces = assignedCount > 0 ? assignedCount : (g.capacity || 10);
      const hasCustom = placeOverrides[resId] !== undefined;
      const reservedPlaces = hasCustom ? placeOverrides[resId] : defaultPlaces;

      reservations.push({
        id: resId,
        groupId: g.id,
        groupName: g.name,
        category: g.category || "homme",
        coachName: g.coachName,
        day: s.day || "Samedi",
        time: s.time || "18:00",
        timeSlot: `${s.day} ${s.time}`.trim(),
        location: s.location || "Piscine",
        isPeak,
        reservedPlaces,
        capacity: g.capacity || 10,
        actualAssignedCount: assignedCount,
        hasCustomPlaces: hasCustom,
      });
    });
  }

  const dayIndex = (d: string) => {
    const idx = FRENCH_DAYS.findIndex((fd) => fd.toLowerCase() === d.toLowerCase());
    return idx === -1 ? 99 : idx;
  };

  return reservations.sort((a, b) => {
    const dDiff = dayIndex(a.day) - dayIndex(b.day);
    if (dDiff !== 0) return dDiff;
    return a.time.localeCompare(b.time);
  });
}

/**
 * Computes summary of place reservations for Method ONE.
 */
export function computeSlotReservationsSummary(
  reservations: PoolSlotReservation[],
  selectedIds: Set<string>
): PoolSlotReservationSummary {
  const totalReservations = reservations.length;
  let selectedReservationsCount = 0;
  let totalReservedPlaces = 0;
  let peakReservedPlaces = 0;
  let normalReservedPlaces = 0;

  for (const r of reservations) {
    if (!selectedIds.has(r.id)) continue;
    selectedReservationsCount += 1;
    totalReservedPlaces += r.reservedPlaces;
    if (r.isPeak) {
      peakReservedPlaces += r.reservedPlaces;
    } else {
      normalReservedPlaces += r.reservedPlaces;
    }
  }

  return {
    totalReservations,
    selectedReservationsCount,
    totalReservedPlaces,
    peakReservedPlaces,
    normalReservedPlaces,
  };
}

/**
 * Exports place reservations to CSV for Method ONE (No client names).
 */
export function exportSlotReservationsToCSV(
  reservations: PoolSlotReservation[],
  monthLabel: string,
  selectedOnly: boolean,
  selectedIds: Set<string>
): string {
  const headers = [
    "N",
    "Jour",
    "Horaire",
    "Groupe",
    "Categorie",
    "Places Reservees",
    "Heure de Pointe",
    "Mois",
  ];

  const escapeCSV = (val: string | number) => {
    const s = String(val ?? "").replace(/"/g, '""');
    return `"${s}"`;
  };

  const lines = [headers.join(";")];
  let rowIndex = 1;

  for (const r of reservations) {
    if (selectedOnly && !selectedIds.has(r.id)) continue;
    const cols = [
      escapeCSV(rowIndex++),
      escapeCSV(r.day),
      escapeCSV(r.time),
      escapeCSV(r.groupName),
      escapeCSV(r.category),
      escapeCSV(r.reservedPlaces),
      escapeCSV(r.isPeak ? "Oui (Pointe)" : "Non"),
      escapeCSV(monthLabel),
    ];
    lines.push(cols.join(";"));
  }

  return "\uFEFF" + lines.join("\r\n");
}

/**
 * Generates place reservation message for Method ONE without any client names.
 */
export function generatePlaceReservationMessage(params: {
  monthLabel: string;
  reservations: PoolSlotReservation[];
  totalPlaces: number;
}): string {
  const { monthLabel, reservations, totalPlaces } = params;

  let msg = `*AQA SPORTS - ETAT PREVISIONNEL DE RESERVATION DES PLACES (DEBUT DE MOIS)*\n`;
  msg += `A l'attention de la Direction de la Piscine\n`;
  msg += `Periode: ${monthLabel}\n`;
  msg += `Nombre total de places reservees: ${totalPlaces} places\n\n`;

  msg += `*Detail des Creneaux & Reservations de Places :*\n`;
  for (const r of reservations) {
    const peakTag = r.isPeak ? " [Heure de pointe]" : "";
    msg += `- ${r.day} ${r.time} | ${r.groupName} (${r.category}) : ${r.reservedPlaces} places${peakTag}\n`;
  }
  msg += `\nCe previsionnel est transmis a titre indicatif pour securiser les creneaux et lignes d'eau.\n`;
  msg += `Cordialement,\nDirection AQA Sports`;
  return msg;
}


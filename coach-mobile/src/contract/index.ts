export * from "./coach-contract";

import type { CoachRole, StrokeBars } from "./coach-contract";

export interface CoachUserProfile {
  id: string;
  coachId: string;
  name: string;
  email: string;
  phone?: string | null;
  primaryPool?: string | null;
  role: CoachRole;
  roleDisplay: string;
  isHeadCoach: boolean;
  isAssistant: boolean;
  specialties: string[];
  categories: string[];
  status?: string;
}

export interface SwimGroupSummary {
  id: string;
  name: string;
  category: string;
  level: string;
  schedule: string;
  pool: string;
  scheduleDays: string[];
  startTime: string;
  endTime: string;
  capacity: number;
  activeMembersCount: number;
  memberCount: number;
  coachName?: string | null;
  roleInGroup: string;
  isPrimary: boolean;
  canEdit: boolean;
  isViewOnly: boolean;
}

export interface SessionRatingSummary {
  rating: number;
  intensity?: string | null;
  focus?: string | null;
  discipline?: number | null;
  waterTempC?: number | null;
  summary?: string | null;
  coachName?: string | null;
  ratedAt?: string | null;
}

export interface SwimSessionSummary {
  id: string;
  groupId: string;
  groupName: string;
  category: string;
  level: string;
  pool: string;
  location: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  status: string;
  attendanceCount: number;
  presentCount: number;
  absentCount: number;
  markedCount: number;
  totalMembers: number;
  isReplacement: boolean;
  canEdit: boolean;
  isViewOnly: boolean;
  isCompleted: boolean;
  isCancelled: boolean;
  sessionRating?: SessionRatingSummary | null;
}

export interface SwimMemberSummary {
  id: string;
  swimId: string;
  fullName: string;
  name: string;
  phone?: string | null;
  category: string;
  groupId?: string | null;
  groupName?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  active: boolean;
  currentLevel?: string | null;
  level?: string | null;
  formula?: string | null;
  cardCode?: string | null;
  paymentStatus?: string | null;
  emergencyContact?: string | null;
  photoUrl?: string | null;
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
  unlockedBadges: string[];
  bars: StrokeBars;
  lastTouchedBar: keyof StrokeBars;
  totalDistanceMeters: number;
  record50m?: number | null;
  recordApnea?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  wordFromCoach?: string | null;
  isNewClient: boolean;
  isMultiGroup: boolean;
}

export interface ReplacementItem {
  id: string;
  absenceId: string;
  sessionId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  groupName: string;
  category: string;
  pool: string;
  originalCoachId: string;
  originalCoachName: string;
  replacementCoachId: string;
  replacementCoachName: string;
  substituteCoachId?: string | null;
  substituteCoachName?: string | null;
  status: string;
  reason?: string | null;
  note?: string | null;
  declineReason?: string | null;
  isIncomingRequest: boolean;
  isPending: boolean;
  isAccepted: boolean;
  isDeclined: boolean;
}

export interface CoachAbsenceItem {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  notes?: string | null;
  status: string;
  createdAt?: string | null;
}

export interface CoachNotificationItem {
  id: string;
  type: string;
  title: string;
  message?: string;
  createdAt?: string;
}

export interface CoachColleague {
  id: string;
  name: string;
  phone?: string | null;
  role?: string;
}

export interface CoachBootstrapPayload {
  coach: CoachUserProfile;
  allCoaches: CoachColleague[];
  colleagues: CoachColleague[];
  groups: SwimGroupSummary[];
  sessions: SwimSessionSummary[];
  todaySessions: SwimSessionSummary[];
  swimmers: SwimMemberSummary[];
  members: SwimMemberSummary[];
  pendingRequests: ReplacementItem[];
  activeReplacements: ReplacementItem[];
  outgoingRequests: ReplacementItem[];
  myAbsences: CoachAbsenceItem[];
  coachNotifications: CoachNotificationItem[];
  appConfig: Record<string, unknown>;
  todayDate: string;
  serverTime: string;
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim().length > 0 ? v : fallback;
}

function asNum(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const parsed = Number(v);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function computeEndTime(start: string): string {
  if (!start.includes(":")) return "19:00";
  const parts = start.split(":");
  const h = parseInt(parts[0] ?? "18", 10) || 18;
  const m = parseInt(parts[1] ?? "0", 10) || 0;
  const total = h * 60 + m + 60;
  const eh = Math.floor(total / 60) % 24;
  const em = total % 60;
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
}

export function normalizeCoachUser(raw: Record<string, unknown>): CoachUserProfile {
  const roleRaw = asString(raw.role, "coach").toLowerCase();
  const role: CoachRole =
    roleRaw === "head_coach"
      ? "head_coach"
      : roleRaw === "assistant"
      ? "assistant"
      : roleRaw === "lead"
      ? "lead"
      : "coach";
  const isHeadCoach = role === "head_coach";
  const isAssistant = role === "assistant";
  const roleDisplay = isHeadCoach ? "Head Coach" : isAssistant ? "Assistant" : "Coach";

  const specialties = Array.isArray(raw.specialties)
    ? raw.specialties.map((s) => String(s))
    : typeof raw.specialties === "string" && raw.specialties.trim().length > 0
    ? raw.specialties.split(",").map((s) => s.trim())
    : [];

  const categories = Array.isArray(raw.categories)
    ? raw.categories.map((s) => String(s))
    : [];

  return {
    id: asString(raw.id, asString(raw.coachId, "")),
    coachId: asString(raw.coachId, asString(raw.id, "")),
    name: asString(raw.name, asString(raw.fullName, "Coach AQA")),
    email: asString(raw.email, ""),
    phone: typeof raw.phone === "string" ? raw.phone : null,
    primaryPool: typeof raw.primaryPool === "string" ? raw.primaryPool : null,
    role,
    roleDisplay,
    isHeadCoach,
    isAssistant,
    specialties,
    categories,
    status: asString(raw.status, "active"),
  };
}

export function normalizeGroup(raw: Record<string, unknown>): SwimGroupSummary {
  let scheduleDays: string[] = [];
  if (Array.isArray(raw.scheduleDays)) {
    scheduleDays = raw.scheduleDays.map((d) => String(d));
  } else if (typeof raw.scheduleDays === "string" && raw.scheduleDays.trim().length > 0) {
    scheduleDays = raw.scheduleDays.split(",").map((s) => s.trim()).filter(Boolean);
  }

  const rawSchedule = asString(raw.schedule, "");
  const pool =
    asString(raw.pool) ||
    (rawSchedule.includes("•")
      ? rawSchedule.split("•").pop()?.trim() || "Piscine AQA"
      : "Piscine AQA");

  const countObj =
    raw._count && typeof raw._count === "object"
      ? (raw._count as Record<string, unknown>)
      : null;

  const activeMembersCount =
    asNum(raw.activeMembersCount, -1) >= 0
      ? asNum(raw.activeMembersCount, 0)
      : asNum(raw.memberCount, -1) >= 0
      ? asNum(raw.memberCount, 0)
      : asNum(raw.swimmerCount, -1) >= 0
      ? asNum(raw.swimmerCount, 0)
      : countObj
      ? asNum(countObj.swimmers, asNum(countObj.members, 0))
      : 0;

  const roleInGroup = asString(raw.roleInGroup, "coach");
  const canEdit = typeof raw.canEdit === "boolean" ? raw.canEdit : roleInGroup !== "assistant";
  const isViewOnly = !canEdit || roleInGroup === "assistant";

  return {
    id: asString(raw.id),
    name: asString(raw.name, "Groupe AQA"),
    category: asString(raw.category, "homme"),
    level: asString(raw.level, ""),
    schedule: rawSchedule,
    pool,
    scheduleDays,
    startTime: asString(raw.startTime, "18:00"),
    endTime: asString(raw.endTime, "19:00"),
    capacity: asNum(raw.capacity, 20),
    activeMembersCount,
    memberCount: activeMembersCount,
    coachName: typeof raw.coachName === "string" ? raw.coachName : null,
    roleInGroup,
    isPrimary: typeof raw.isPrimary === "boolean" ? raw.isPrimary : true,
    canEdit,
    isViewOnly,
  };
}

export function normalizeSession(raw: Record<string, unknown>): SwimSessionSummary {
  const groupData =
    raw.group && typeof raw.group === "object"
      ? (raw.group as Record<string, unknown>)
      : null;
  const stats =
    raw.attendanceStats && typeof raw.attendanceStats === "object"
      ? (raw.attendanceStats as Record<string, unknown>)
      : null;
  const countObj =
    raw._count && typeof raw._count === "object"
      ? (raw._count as Record<string, unknown>)
      : null;
  const ratingRaw =
    raw.sessionRating && typeof raw.sessionRating === "object"
      ? (raw.sessionRating as Record<string, unknown>)
      : null;

  const startTime = asString(raw.startTime, asString(groupData?.startTime, "18:00"));
  const endTime =
    asString(raw.endTime) ||
    asString(groupData?.endTime) ||
    computeEndTime(startTime);

  const pool =
    asString(raw.pool) ||
    asString(raw.location) ||
    asString(groupData?.pool, "Piscine AQA");

  const attendanceCount =
    asNum(raw.attendanceCount, -1) >= 0
      ? asNum(raw.attendanceCount, 0)
      : asNum(raw.presentCount, -1) >= 0
      ? asNum(raw.presentCount, 0)
      : stats && asNum(stats.present, -1) >= 0
      ? asNum(stats.present, 0)
      : countObj
      ? asNum(countObj.attendance, 0)
      : 0;

  const absentCount = stats ? asNum(stats.absent, 0) : asNum(raw.absentCount, 0);
  const markedCount = stats ? asNum(stats.marked, attendanceCount) : attendanceCount;
  const totalMembers =
    asNum(raw.totalMembers, -1) >= 0
      ? asNum(raw.totalMembers, 0)
      : stats
      ? asNum(stats.total, 0)
      : 0;

  const status = asString(raw.status, "scheduled");
  const statusUpper = status.toUpperCase();
  const isCompleted =
    statusUpper === "COMPLETED" || statusUpper === "HELD" || markedCount > 0;
  const isCancelled = statusUpper === "CANCELLED";
  const canEdit = typeof raw.canEdit === "boolean" ? raw.canEdit : true;
  const isViewOnly =
    typeof raw.isViewOnly === "boolean" ? raw.isViewOnly : !canEdit;

  return {
    id: asString(raw.id),
    groupId: asString(raw.groupId, asString(groupData?.id)),
    groupName: asString(groupData?.name, asString(raw.groupName, "Groupe AQA")),
    category: asString(groupData?.category, asString(raw.category, "")),
    level: asString(groupData?.level, asString(raw.level, "")),
    pool,
    location: pool,
    sessionDate: asString(raw.sessionDate).slice(0, 10),
    startTime,
    endTime,
    status,
    attendanceCount,
    presentCount: attendanceCount,
    absentCount,
    markedCount,
    totalMembers,
    isReplacement: Boolean(raw.isReplacement),
    canEdit,
    isViewOnly,
    isCompleted,
    isCancelled,
    sessionRating: ratingRaw
      ? {
          rating: asNum(ratingRaw.rating, 5),
          intensity: typeof ratingRaw.intensity === "string" ? ratingRaw.intensity : null,
          focus: typeof ratingRaw.focus === "string" ? ratingRaw.focus : null,
          discipline:
            ratingRaw.discipline != null ? asNum(ratingRaw.discipline, 5) : null,
          waterTempC:
            ratingRaw.waterTempC != null ? asNum(ratingRaw.waterTempC, 27) : null,
          summary: typeof ratingRaw.summary === "string" ? ratingRaw.summary : null,
          coachName: typeof ratingRaw.coachName === "string" ? ratingRaw.coachName : null,
          ratedAt: typeof ratingRaw.ratedAt === "string" ? ratingRaw.ratedAt : null,
        }
      : null,
  };
}

export function normalizeMember(raw: Record<string, unknown>): SwimMemberSummary {
  const rawBars =
    raw.bars && typeof raw.bars === "object"
      ? (raw.bars as Record<string, unknown>)
      : {};
  const bars: StrokeBars = {
    basics: Math.max(0, Math.min(200, Math.round(asNum(rawBars.basics, 0)))),
    crawl: Math.max(0, Math.min(200, Math.round(asNum(rawBars.crawl, 0)))),
    backstroke: Math.max(0, Math.min(200, Math.round(asNum(rawBars.backstroke, 0)))),
    breaststroke: Math.max(0, Math.min(200, Math.round(asNum(rawBars.breaststroke, 0)))),
    butterfly: Math.max(0, Math.min(200, Math.round(asNum(rawBars.butterfly, 0)))),
  };

  const fullName = asString(raw.fullName, asString(raw.name, "Nageur AQA"));
  const rawUnlocked = Array.isArray(raw.unlockedBadges)
    ? raw.unlockedBadges.map((b) => String(b))
    : ["starter"];

  const lastTouchedRaw = asString(raw.lastTouchedBar, "basics");
  const lastTouchedBar: keyof StrokeBars =
    lastTouchedRaw === "crawl" ||
    lastTouchedRaw === "backstroke" ||
    lastTouchedRaw === "breaststroke" ||
    lastTouchedRaw === "butterfly"
      ? lastTouchedRaw
      : "basics";

  return {
    id: asString(raw.id, asString(raw.memberId)),
    swimId: asString(raw.swimId, ""),
    fullName,
    name: fullName,
    phone: typeof raw.phone === "string" ? raw.phone : null,
    category: asString(raw.category, "homme"),
    groupId: typeof raw.groupId === "string" ? raw.groupId : null,
    groupName: typeof raw.groupName === "string" ? raw.groupName : null,
    dateOfBirth: typeof raw.dateOfBirth === "string" ? raw.dateOfBirth : null,
    gender: typeof raw.gender === "string" ? raw.gender : null,
    active: typeof raw.active === "boolean" ? raw.active : true,
    currentLevel: asString(raw.currentLevel, asString(raw.level, "")),
    level: asString(raw.currentLevel, asString(raw.level, "")),
    formula: typeof raw.formula === "string" ? raw.formula : null,
    cardCode: typeof raw.cardCode === "string" ? raw.cardCode : null,
    paymentStatus: typeof raw.paymentStatus === "string" ? raw.paymentStatus : null,
    emergencyContact:
      typeof raw.emergencyContact === "string" ? raw.emergencyContact : null,
    photoUrl: typeof raw.photoUrl === "string" ? raw.photoUrl : null,
    totalPresences: asNum(raw.totalPresences, 0),
    totalAbsences: asNum(raw.totalAbsences, 0),
    attendanceRate: asNum(raw.attendanceRate, 100),
    reviewCount: asNum(raw.reviewCount, 0),
    avgSkillScore: asNum(raw.avgSkillScore, 0),
    badgeKey: asString(raw.badgeKey, "starter"),
    badgeLabel: asString(raw.badgeLabel, "Starter"),
    badgeAsset: asString(raw.badgeAsset, "starter.png"),
    stageKey: asString(raw.stageKey, "basics"),
    stageLabel: asString(raw.stageLabel, "1. Basics"),
    stageAsset: asString(raw.stageAsset, "elephant.png"),
    unlockedBadges: rawUnlocked,
    bars,
    lastTouchedBar,
    totalDistanceMeters: asNum(raw.totalDistanceMeters, 0),
    record50m: raw.record50m != null ? asNum(raw.record50m) : null,
    recordApnea: raw.recordApnea != null ? asNum(raw.recordApnea) : null,
    weightKg: raw.weightKg != null ? asNum(raw.weightKg) : null,
    heightCm: raw.heightCm != null ? asNum(raw.heightCm) : null,
    wordFromCoach: typeof raw.wordFromCoach === "string" ? raw.wordFromCoach : null,
    isNewClient: Boolean(raw.isNewClient),
    isMultiGroup: Boolean(raw.isMultiGroup),
  };
}

export function normalizeReplacement(
  raw: Record<string, unknown>,
  currentCoachId?: string
): ReplacementItem {
  const sessionData =
    raw.session && typeof raw.session === "object"
      ? (raw.session as Record<string, unknown>)
      : null;
  const groupData =
    sessionData?.group && typeof sessionData.group === "object"
      ? (sessionData.group as Record<string, unknown>)
      : null;
  const origCoachData =
    raw.originalCoach && typeof raw.originalCoach === "object"
      ? (raw.originalCoach as Record<string, unknown>)
      : null;
  const repCoachData =
    (raw.substituteCoach ?? raw.replacementCoach) &&
    typeof (raw.substituteCoach ?? raw.replacementCoach) === "object"
      ? ((raw.substituteCoach ?? raw.replacementCoach) as Record<string, unknown>)
      : null;

  const replacementCoachId = asString(
    raw.substituteCoachId,
    asString(raw.replacementCoachId, asString(repCoachData?.id))
  );
  const replacementCoachName = asString(
    raw.substituteCoachName,
    asString(raw.replacementCoachName, asString(repCoachData?.name, "Equipe AQA"))
  );

  const status = asString(raw.status, "PROPOSED").toUpperCase();
  const isPending =
    status === "REQUESTED" || status === "PROPOSED" || status === "PENDING";
  const isAccepted = status === "ACCEPTED" || status === "ASSIGNED";
  const isDeclined = status === "DECLINED";

  const isIncomingRequest =
    typeof raw.isIncomingForMe === "boolean"
      ? raw.isIncomingForMe
      : Boolean(
          currentCoachId &&
            (replacementCoachId.length === 0 || replacementCoachId === currentCoachId)
        );

  const reason = asString(raw.note, asString(raw.reason, "")) || null;

  return {
    id: asString(raw.id),
    absenceId: asString(raw.absenceId),
    sessionId: asString(raw.sessionId, asString(sessionData?.id)),
    sessionDate: asString(raw.sessionDate, asString(sessionData?.sessionDate)).slice(0, 10),
    startTime: asString(
      raw.startTime,
      asString(sessionData?.startTime, asString(groupData?.startTime, "18:00"))
    ),
    endTime: asString(
      raw.endTime,
      asString(sessionData?.endTime, asString(groupData?.endTime, "19:00"))
    ),
    groupName: asString(raw.groupName, asString(groupData?.name, "Groupe AQA")),
    category: asString(raw.category, asString(groupData?.category, "")),
    pool: asString(
      raw.pool,
      asString(raw.location, asString(sessionData?.location, asString(groupData?.pool, "Piscine AQA")))
    ),
    originalCoachId: asString(raw.originalCoachId, asString(origCoachData?.id)),
    originalCoachName: asString(
      raw.originalCoachName,
      asString(origCoachData?.name, "Coach AQA")
    ),
    replacementCoachId,
    replacementCoachName,
    substituteCoachId: replacementCoachId,
    substituteCoachName: replacementCoachName,
    status,
    reason,
    note: reason,
    declineReason: typeof raw.declineReason === "string" ? raw.declineReason : null,
    isIncomingRequest,
    isPending,
    isAccepted,
    isDeclined,
  };
}

export function normalizeBootstrapPayload(
  raw: Record<string, unknown>
): CoachBootstrapPayload {
  const coachRaw =
    raw.coach && typeof raw.coach === "object"
      ? (raw.coach as Record<string, unknown>)
      : {};
  const coach = normalizeCoachUser(coachRaw);
  const currentCoachId = coach.coachId || coach.id;

  const rawGroups = Array.isArray(raw.groups) ? raw.groups : [];
  const groups = rawGroups
    .filter((g): g is Record<string, unknown> => Boolean(g && typeof g === "object"))
    .map(normalizeGroup);

  const rawSessions = Array.isArray(raw.sessions)
    ? raw.sessions
    : Array.isArray(raw.todaySessions)
    ? raw.todaySessions
    : [];
  const sessions = rawSessions
    .filter((s): s is Record<string, unknown> => Boolean(s && typeof s === "object"))
    .map(normalizeSession);

  const rawTodaySessions = Array.isArray(raw.todaySessions)
    ? raw.todaySessions
    : rawSessions;
  const todaySessions = rawTodaySessions
    .filter((s): s is Record<string, unknown> => Boolean(s && typeof s === "object"))
    .map(normalizeSession);

  const rawSwimmers = Array.isArray(raw.swimmers)
    ? raw.swimmers
    : Array.isArray(raw.members)
    ? raw.members
    : [];
  const swimmers = rawSwimmers
    .filter((m): m is Record<string, unknown> => Boolean(m && typeof m === "object"))
    .map(normalizeMember);

  const rawCoaches = Array.isArray(raw.allCoaches)
    ? raw.allCoaches
    : Array.isArray(raw.colleagues)
    ? raw.colleagues
    : [];
  const allCoaches: CoachColleague[] = rawCoaches
    .filter((c): c is Record<string, unknown> => Boolean(c && typeof c === "object"))
    .map((c) => ({
      id: asString(c.id, asString(c.coachId)),
      name: asString(c.name, asString(c.fullName, "Coach AQA")),
      phone: typeof c.phone === "string" ? c.phone : null,
      role: asString(c.role, "coach"),
    }));

  const rawPending = Array.isArray(raw.pendingRequests)
    ? raw.pendingRequests
    : Array.isArray(raw.pendingReplacements)
    ? raw.pendingReplacements
    : [];
  const pendingRequests = rawPending
    .filter((r): r is Record<string, unknown> => Boolean(r && typeof r === "object"))
    .map((r) => normalizeReplacement(r, currentCoachId));

  const rawActive = Array.isArray(raw.activeReplacements)
    ? raw.activeReplacements
    : Array.isArray(raw.outgoingRequests)
    ? raw.outgoingRequests
    : [];
  const activeReplacements = rawActive
    .filter((r): r is Record<string, unknown> => Boolean(r && typeof r === "object"))
    .map((r) => normalizeReplacement(r, currentCoachId));

  const rawAbsences = Array.isArray(raw.myAbsences) ? raw.myAbsences : [];
  const myAbsences: CoachAbsenceItem[] = rawAbsences
    .filter((a): a is Record<string, unknown> => Boolean(a && typeof a === "object"))
    .map((a) => ({
      id: asString(a.id),
      startDate: asString(a.startDate).slice(0, 10),
      endDate: asString(a.endDate).slice(0, 10),
      reason: asString(a.reason, "Personnel"),
      notes: typeof a.notes === "string" ? a.notes : null,
      status: asString(a.status, "DECLARED"),
      createdAt: typeof a.createdAt === "string" ? a.createdAt : null,
    }));

  const rawNotifs = Array.isArray(raw.coachNotifications)
    ? raw.coachNotifications
    : [];
  const coachNotifications: CoachNotificationItem[] = rawNotifs
    .filter((n): n is Record<string, unknown> => Boolean(n && typeof n === "object"))
    .map((n, idx) => ({
      id: asString(n.id, `notif-${idx}`),
      type: asString(n.type, "general"),
      title: asString(n.title, "AQA Swim"),
      message: asString(n.message, ""),
      createdAt: asString(n.createdAt, ""),
    }));

  const appConfig =
    raw.appConfig && typeof raw.appConfig === "object"
      ? (raw.appConfig as Record<string, unknown>)
      : {};

  return {
    coach,
    allCoaches,
    colleagues: allCoaches,
    groups,
    sessions,
    todaySessions,
    swimmers,
    members: swimmers,
    pendingRequests,
    activeReplacements,
    outgoingRequests: activeReplacements,
    myAbsences,
    coachNotifications,
    appConfig,
    todayDate: asString(raw.todayDate, new Date().toISOString().slice(0, 10)),
    serverTime: asString(raw.serverTime, new Date().toISOString()),
  };
}

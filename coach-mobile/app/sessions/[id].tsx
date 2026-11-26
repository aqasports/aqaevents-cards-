import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { coachApiClient } from "../../src/api/client";
import {
  AQA_OFFICIAL_BADGES,
  AQA_STROKE_BARS,
  getBadgeImageSource,
  getBadgeLabel,
  getStrokeBarShortLabel,
} from "../../src/assets/badges";
import {
  AqaAmbientBackground,
  AqaDoubleBezelCard,
  AqaIslandButton,
  AqaNewClientBadge,
  AqaSectionHeader,
  AqaSegmentedControl,
  AqaStrokeBar200,
} from "../../src/components/AqaUi";
import type {
  AttendanceMethod,
  AttendanceStatus,
  HonorBadgeType,
  StrokeBarKey,
  StrokeBars,
} from "../../src/contract";
import { useCoachStore } from "../../src/state/CoachStore";
import { AqaTokens, aqaColors } from "../../src/theme/tokens";

const T = AqaTokens;
// The camera reports the same card many times per second; ignore repeats inside this window.
const QR_REPEAT_IGNORE_MS = 2500;

interface SwimmerSessionState {
  memberId: string;
  swimId: string;
  name: string;
  cardCode?: string | null;
  level?: string | null;
  status: AttendanceStatus;
  method: AttendanceMethod;
  isGuest: boolean;
  isNewClient: boolean;
  bars: StrokeBars;
  lastTouchedBar: StrokeBarKey;
  showAllBars: boolean;
  storedTotalDistanceMeters: number;
  sessionVolumeMeters: string;
  observation: string;
  record50m: string;
  recordApnea: string;
  recordsUnlocked: boolean;
  weightKg: string;
  heightCm: string;
  badgeKey: string | null;
  badgeLabel: string | null;
  honorRequestType: HonorBadgeType | null;
  wordFromCoach: string;
}

export default function SessionAttendanceAndQuickLoggerScreen() {
  const { id, qr, mode } = useLocalSearchParams<{
    id: string;
    qr?: string;
    mode?: string;
  }>();
  const router = useRouter();
  const { t, locale, isRtl, refreshWorkspace } = useCoachStore();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const insets = useSafeAreaInsets();
  const lastQrScanRef = useRef<{ code: string; at: number } | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [sessionMeta, setSessionMeta] = useState<{
    groupName: string;
    sessionDate: string;
    startTime: string;
    endTime: string;
    pool: string;
  }>({
    groupName: "Seance AQA",
    sessionDate: "",
    startTime: "",
    endTime: "",
    pool: "Piscine AQA",
  });

  // 0 = Step 1 Presences, 1 = Step 2 Evaluation (0-200%), 2 = Step 3 Bilan & Closure
  const [activeStep, setActiveStep] = useState<number>(mode === "quick" ? 0 : 0);
  const [showAllBarsGlobal, setShowAllBarsGlobal] = useState(false);
  const [selectedBilanMemberId, setSelectedBilanMemberId] = useState<string | null>(
    null
  );

  const [rows, setRows] = useState<SwimmerSessionState[]>([]);
  const [clubSwimmers, setClubSwimmers] = useState<
    Array<{ id: string; fullName: string; level?: string }>
  >([]);

  // Guest Modal
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [guestNameInput, setGuestNameInput] = useState("");
  const [selectedClubSwimmerId, setSelectedClubSwimmerId] = useState<string | null>(
    null
  );

  // QR Scanner
  const [qrScannerActive, setQrScannerActive] = useState(qr === "1");
  const [qrBanner, setQrBanner] = useState<string | null>(null);
  const [qrBannerOk, setQrBannerOk] = useState(true);

  // Honor Lock Status
  const [monthHonorLocked, setMonthHonorLocked] = useState(false);
  const [monthHonorWinner, setMonthHonorWinner] = useState<string | null>(null);
  const [yearHonorLocked, setYearHonorLocked] = useState(false);
  const [yearHonorWinner, setYearHonorWinner] = useState<string | null>(null);

  // Session Rating & Summary
  const [rating, setRating] = useState(5);
  const [focus, setFocus] = useState("Technique de Nage");
  const [discipline, setDiscipline] = useState(5);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const detail = await coachApiClient.getSessionDetail(id);
        const sessObj =
          detail.session && typeof detail.session === "object"
            ? (detail.session as Record<string, unknown>)
            : {};
        setSessionMeta({
          groupName: String(sessObj.groupName || "Seance AQA"),
          sessionDate: String(sessObj.sessionDate || "").slice(0, 10),
          startTime: String(sessObj.startTime || "18:00"),
          endTime: String(sessObj.endTime || "19:00"),
          pool: String(sessObj.pool || sessObj.location || "Piscine AQA"),
        });
        setIsViewOnly(Boolean(detail.isViewOnly));

        const rawClub = Array.isArray(detail.clubSwimmers)
          ? (detail.clubSwimmers as Array<Record<string, unknown>>)
          : [];
        setClubSwimmers(
          rawClub.map((c) => ({
            id: String(c.id || ""),
            fullName: String(c.fullName || c.name || "Nageur"),
            level: typeof c.level === "string" ? c.level : undefined,
          }))
        );

        const rawMembers = Array.isArray(detail.groupMembers)
          ? (detail.groupMembers as Array<Record<string, unknown>>)
          : Array.isArray(detail.members)
          ? (detail.members as Array<Record<string, unknown>>)
          : [];

        const rawAtt = Array.isArray(detail.attendance)
          ? (detail.attendance as Array<Record<string, unknown>>)
          : [];
        const attByMember = new Map<string, Record<string, unknown>>();
        for (const a of rawAtt) {
          const mid = String(a.memberId || "");
          if (mid) attByMember.set(mid, a);
        }

        const parsedRows: SwimmerSessionState[] = rawMembers.map((m) => {
          const mid = String(m.id || m.memberId || "");
          const existingAtt = attByMember.get(mid);
          const rawStatus = String(
            existingAtt?.status ?? m.status ?? "present"
          ).toLowerCase();
          const rawBars =
            m.bars && typeof m.bars === "object"
              ? (m.bars as Record<string, unknown>)
              : {};
          const bars: StrokeBars = {
            basics: Number(rawBars.basics ?? 0) || 0,
            crawl: Number(rawBars.crawl ?? 0) || 0,
            backstroke: Number(rawBars.backstroke ?? 0) || 0,
            breaststroke: Number(rawBars.breaststroke ?? 0) || 0,
            butterfly: Number(rawBars.butterfly ?? 0) || 0,
          };
          const ltRaw = String(m.lastTouchedBar || "basics");
          const lastTouchedBar: StrokeBarKey =
            ltRaw === "crawl" ||
            ltRaw === "backstroke" ||
            ltRaw === "breaststroke" ||
            ltRaw === "butterfly"
              ? ltRaw
              : "basics";

          return {
            memberId: mid,
            swimId: String(m.swimId || ""),
            name: String(m.fullName || m.name || "Nageur"),
            cardCode: typeof m.cardCode === "string" ? m.cardCode : null,
            level:
              typeof m.badgeLabel === "string"
                ? m.badgeLabel
                : typeof m.level === "string"
                ? m.level
                : null,
            status: rawStatus === "absent" ? "absent" : "present",
            method: existingAtt?.method === "qr" ? "qr" : "manual",
            isGuest: Boolean(m.isGuest),
            isNewClient: Boolean(m.isNewClient),
            bars,
            lastTouchedBar,
            showAllBars: false,
            storedTotalDistanceMeters: Number(m.totalDistanceMeters ?? 0) || 0,
            sessionVolumeMeters: "",
            observation: "",
            record50m: m.record50m != null ? String(m.record50m) : "",
            recordApnea: m.recordApnea != null ? String(m.recordApnea) : "",
            recordsUnlocked: false,
            weightKg: m.weightKg != null ? String(m.weightKg) : "",
            heightCm: m.heightCm != null ? String(m.heightCm) : "",
            badgeKey: typeof m.badgeKey === "string" ? m.badgeKey : null,
            badgeLabel: typeof m.badgeLabel === "string" ? m.badgeLabel : null,
            honorRequestType: null,
            wordFromCoach:
              typeof m.wordFromCoach === "string" ? m.wordFromCoach : "",
          };
        });

        setRows(parsedRows);
        const firstPresent = parsedRows.find((r) => r.status === "present");
        setSelectedBilanMemberId(
          firstPresent?.memberId ?? parsedRows[0]?.memberId ?? null
        );

        const lockStatus =
          detail.honorLockStatus && typeof detail.honorLockStatus === "object"
            ? (detail.honorLockStatus as Record<string, unknown>)
            : null;
        if (lockStatus) {
          setMonthHonorLocked(Boolean(lockStatus.swimmerOfTheMonthLocked));
          const mw = lockStatus.swimmerOfTheMonthWinner as
            | Record<string, unknown>
            | undefined;
          setMonthHonorWinner(
            mw && typeof mw.memberName === "string" ? mw.memberName : null
          );
          setYearHonorLocked(Boolean(lockStatus.swimmerOfTheYearLocked));
          const yw = lockStatus.swimmerOfTheYearWinner as
            | Record<string, unknown>
            | undefined;
          setYearHonorWinner(
            yw && typeof yw.memberName === "string" ? yw.memberName : null
          );
        }

        const existingRating =
          (detail.sessionRating as Record<string, unknown> | undefined) ??
          (sessObj.sessionRating as Record<string, unknown> | undefined);
        if (existingRating) {
          setRating(Number(existingRating.rating ?? 5) || 5);
          if (typeof existingRating.focus === "string") {
            setFocus(existingRating.focus);
          }
          setDiscipline(Number(existingRating.discipline ?? 5) || 5);
          if (typeof existingRating.summary === "string") {
            setSummary(existingRating.summary);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const updateRow = (
    memberId: string,
    updater: (prev: SwimmerSessionState) => SwimmerSessionState
  ) => {
    setRows((prev) =>
      prev.map((r) => (r.memberId === memberId ? updater(r) : r))
    );
  };

  const setStatus = (memberId: string, status: AttendanceStatus) => {
    if (isViewOnly) return;
    updateRow(memberId, (r) =>
      r.status === status ? r : { ...r, status, method: "manual" }
    );
  };

  const markAllPresent = () => {
    if (isViewOnly) return;
    setRows((prev) => prev.map((r) => ({ ...r, status: "present" })));
  };

  const handleQrScanned = ({ data }: { data: string }) => {
    const code = data.trim().toLowerCase();
    const now = Date.now();
    const last = lastQrScanRef.current;
    if (last && last.code === code && now - last.at < QR_REPEAT_IGNORE_MS) return;
    lastQrScanRef.current = { code, at: now };
    const matched = rows.find(
      (r) =>
        (r.cardCode && r.cardCode.toLowerCase() === code) ||
        (r.swimId && r.swimId.toLowerCase() === code) ||
        r.memberId.toLowerCase() === code
    );
    if (matched) {
      updateRow(matched.memberId, (r) => ({
        ...r,
        status: "present",
        method: "qr",
      }));
      setQrBanner(t("attendance.qr_matched", { name: matched.name }));
      setQrBannerOk(true);
    } else {
      setQrBanner(t("attendance.qr_unmatched"));
      setQrBannerOk(false);
    }
  };

  const handleAddGuest = () => {
    if (selectedClubSwimmerId) {
      const found = clubSwimmers.find((c) => c.id === selectedClubSwimmerId);
      if (found && !rows.some((r) => r.memberId === found.id)) {
        setRows((prev) => [
          ...prev,
          {
            memberId: found.id,
            swimId: "",
            name: found.fullName,
            level: found.level || "Club",
            status: "present",
            method: "manual",
            isGuest: true,
            isNewClient: false,
            bars: {
              basics: 0,
              crawl: 0,
              backstroke: 0,
              breaststroke: 0,
              butterfly: 0,
            },
            lastTouchedBar: "basics",
            showAllBars: false,
            storedTotalDistanceMeters: 0,
            sessionVolumeMeters: "",
            observation: "",
            record50m: "",
            recordApnea: "",
            recordsUnlocked: false,
            weightKg: "",
            heightCm: "",
            badgeKey: null,
            badgeLabel: null,
            honorRequestType: null,
            wordFromCoach: "",
          },
        ]);
      }
      setSelectedClubSwimmerId(null);
      setGuestModalOpen(false);
      return;
    }

    const name = guestNameInput.trim();
    if (!name) return;
    setRows((prev) => [
      ...prev,
      {
        memberId: `guest-${Date.now()}`,
        swimId: "",
        name,
        level: "Invite",
        status: "present",
        method: "manual",
        isGuest: true,
        isNewClient: false,
        bars: {
          basics: 0,
          crawl: 0,
          backstroke: 0,
          breaststroke: 0,
          butterfly: 0,
        },
        lastTouchedBar: "basics",
        showAllBars: false,
        storedTotalDistanceMeters: 0,
        sessionVolumeMeters: "",
        observation: "",
        record50m: "",
        recordApnea: "",
        recordsUnlocked: false,
        weightKg: "",
        heightCm: "",
        badgeKey: null,
        badgeLabel: null,
        honorRequestType: null,
        wordFromCoach: "",
      },
    ]);
    setGuestNameInput("");
    setGuestModalOpen(false);
  };

  // Closing a session is final on the server, so confirm with the counts first.
  const confirmCloseSession = () => {
    if (!id || saving || isViewOnly) return;
    const present = rows.filter((r) => r.status === "present").length;
    Alert.alert(
      t("attendance.confirm_close_title"),
      t("attendance.confirm_close_body", {
        present,
        absent: rows.length - present,
      }),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("attendance.close_and_save"), onPress: () => void handleSaveSession() },
      ]
    );
  };

  const handleSaveSession = async () => {
    if (!id || saving || isViewOnly) return;
    setSaving(true);
    try {
      const presentRealSwimmers = rows.filter(
        (r) => r.status === "present" && !r.memberId.startsWith("guest-")
      );

      const quickEvolutions = presentRealSwimmers.map((r) => {
        const isVolUnlocked =
          r.bars.basics >= 1 &&
          (r.lastTouchedBar !== "basics" ||
            r.bars.crawl > 0 ||
            r.bars.backstroke > 0 ||
            r.bars.breaststroke > 0 ||
            r.bars.butterfly > 0 ||
            r.bars.basics >= 1);
        const volNum = isVolUnlocked ? Number(r.sessionVolumeMeters) : 0;
        const r50 = Number(r.record50m);
        const rApnea = Number(r.recordApnea);
        const wKg = Number(r.weightKg);
        const hCm = Number(r.heightCm);

        return {
          memberId: r.memberId,
          bars: r.bars,
          lastTouchedBar: r.lastTouchedBar,
          ...(volNum > 0 ? { sessionVolumeMeters: volNum } : {}),
          ...(r.observation.trim() ? { observation: r.observation.trim() } : {}),
          ...(r50 > 0 ? { record50m: r50 } : {}),
          ...(rApnea > 0 ? { recordApnea: rApnea } : {}),
          ...(wKg > 0 ? { weightKg: wKg } : {}),
          ...(hCm > 0 ? { heightCm: hCm } : {}),
          ...(r.wordFromCoach.trim()
            ? { wordFromCoach: r.wordFromCoach.trim() }
            : {}),
          ...(r.badgeKey ? { badgeKey: r.badgeKey } : {}),
          ...(r.badgeLabel ? { recommendedLevel: r.badgeLabel } : {}),
          ...(r.honorRequestType
            ? { honorRequestType: r.honorRequestType }
            : {}),
        };
      });

      const res = await coachApiClient.submitAttendance(id, {
        records: rows.map((r) => ({
          memberId: r.memberId,
          status: r.status,
          method: r.method,
          isGuest: r.isGuest,
          guestName: r.isGuest ? r.name : null,
        })),
        closeSession: true,
        sessionRating: {
          rating,
          focus,
          discipline,
          summary: summary.trim() || null,
        },
        quickEvolutions,
      });

      await refreshWorkspace();
      Alert.alert(
        t("app.title"),
        res.mode === "online"
          ? t("attendance.saved_online")
          : t("attendance.saved_offline")
      );
      router.back();
    } catch (err) {
      Alert.alert(
        t("common.error"),
        err instanceof Error ? err.message : t("common.error")
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AqaAmbientBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={aqaColors.accent} />
        </View>
      </AqaAmbientBackground>
    );
  }

  const presentRows = rows.filter((r) => r.status === "present");
  const absentCount = rows.length - presentRows.length;
  const ratePct =
    rows.length > 0 ? Math.round((presentRows.length / rows.length) * 100) : 100;

  const activeBilanRow =
    presentRows.find((r) => r.memberId === selectedBilanMemberId) ??
    presentRows[0] ??
    null;

  return (
    <AqaAmbientBackground>
      <View style={{ flex: 1 }}>
        {/* Top Session Header */}
        <View style={[styles.topHeader, { paddingTop: insets.top + 8 }]}>
          <View style={styles.topHeaderRow}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={t("common.back")}
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.82 }]}
            >
              {/* Mirrors in Arabic so "back" always points to where the user came from. */}
              <Ionicons
                name={isRtl ? "chevron-forward" : "chevron-back"}
                size={T.icon.lg}
                color={aqaColors.accent}
              />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={styles.headerTitle} accessibilityRole="header">
                {sessionMeta.groupName}
              </Text>
              <Text numberOfLines={1} style={styles.headerSubtitle}>
                {sessionMeta.sessionDate} • {sessionMeta.startTime}-
                {sessionMeta.endTime} • {sessionMeta.pool}
              </Text>
            </View>
            {!isViewOnly ? (
              <Pressable
                onPress={() => setGuestModalOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={t("attendance.add_guest")}
                style={({ pressed }) => [styles.guestBtn, pressed && { opacity: 0.82 }]}
              >
                <Ionicons name="person-add-outline" size={T.icon.md} color={aqaColors.accent} />
              </Pressable>
            ) : null}
          </View>

          {/* 3-Step Segmented Selector */}
          <View style={{ marginTop: 10 }}>
            <AqaSegmentedControl
              values={[0, 1, 2] as const}
              labels={[
                t("quick_logger.step1"),
                t("quick_logger.step2"),
                t("quick_logger.step3"),
              ]}
              selectedValue={activeStep}
              onValueChanged={(val) => setActiveStep(val)}
            />
          </View>
        </View>

        {/* Step Content */}
        <ScrollView contentContainerStyle={styles.scrollBody}>
          {/* STEP 0: Binary Presences + QR Scanner */}
          {activeStep === 0 ? (
            <>
              <AqaDoubleBezelCard glowEffect padding={14}>
                <View style={styles.kpiRow}>
                  <View style={[styles.kpiChip, styles.kpiChipPresent]}>
                    <Text style={[styles.kpiCount, { color: aqaColors.success }]}>
                      {presentRows.length}
                    </Text>
                    <Text style={styles.kpiLabel}>{t("attendance.present")}</Text>
                  </View>
                  <View style={[styles.kpiChip, styles.kpiChipAbsent]}>
                    <Text style={[styles.kpiCount, { color: aqaColors.danger }]}>
                      {absentCount}
                    </Text>
                    <Text style={styles.kpiLabel}>{t("attendance.absent")}</Text>
                  </View>
                  <View style={[styles.kpiChip, styles.kpiChipRate]}>
                    <Text style={[styles.kpiCount, { color: aqaColors.accent }]}>
                      {ratePct}%
                    </Text>
                    <Text style={styles.kpiLabel}>{t("attendance.rate")}</Text>
                  </View>
                </View>

                <View style={styles.quickBarRow}>
                  {!isViewOnly ? (
                    <AqaIslandButton
                      label={t("attendance.mark_all_present")}
                      icon="checkmark-done"
                      compact
                      secondary
                      onPress={markAllPresent}
                      style={{ flex: 1 }}
                    />
                  ) : null}
                  {!isViewOnly ? (
                    <AqaIslandButton
                      label={qrScannerActive ? t("attendance.qr_close") : t("today.scan_qr")}
                      icon={qrScannerActive ? "close" : "qr-code-outline"}
                      compact
                      secondary
                      onPress={async () => {
                        if (!cameraPermission?.granted) {
                          await requestCameraPermission();
                        }
                        setQrScannerActive((prev) => !prev);
                      }}
                    />
                  ) : null}
                </View>
              </AqaDoubleBezelCard>

              {/* QR Camera Box */}
              {qrScannerActive && cameraPermission?.granted ? (
                <AqaDoubleBezelCard accentColor={aqaColors.accent} padding={10}>
                  <Text style={styles.qrTitle}>{t("attendance.qr_mode")}</Text>
                  <View style={styles.cameraContainer}>
                    <CameraView
                      style={StyleSheet.absoluteFill}
                      barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                      onBarcodeScanned={handleQrScanned}
                    />
                  </View>
                  {qrBanner ? (
                    // Announced by screen readers as soon as it changes.
                    <View style={styles.qrBannerRow} accessibilityLiveRegion="polite">
                      <Ionicons
                        name={qrBannerOk ? "checkmark-circle" : "help-circle"}
                        size={T.icon.md}
                        color={qrBannerOk ? aqaColors.success : aqaColors.warning}
                        accessible={false}
                      />
                      <Text
                        style={[
                          styles.qrBannerText,
                          { color: qrBannerOk ? aqaColors.success : aqaColors.warning },
                        ]}
                      >
                        {qrBanner}
                      </Text>
                    </View>
                  ) : null}
                </AqaDoubleBezelCard>
              ) : null}

              {/* Swimmer Binary Attendance List.
                  One control per row (the Present/Absent switch) so a stray tap on the card
                  while scrolling never flips a swimmer by accident. */}
              {rows.map((row) => {
                const isPresent = row.status === "present";
                const color = isPresent ? aqaColors.success : aqaColors.dangerText;
                return (
                  <AqaDoubleBezelCard key={row.memberId} accentColor={color} padding={13}>
                    <View style={styles.swimmerAttRow}>
                      <View
                        style={[
                          styles.avatarCircle,
                          {
                            borderColor: color,
                            backgroundColor: `${color}22`,
                          },
                        ]}
                        importantForAccessibility="no-hide-descendants"
                      >
                        <Text style={[styles.avatarInitial, { color }]}>
                          {row.name.slice(0, 1).toUpperCase()}
                        </Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={styles.swimmerNameRow}>
                          <Text numberOfLines={1} style={styles.swimmerName}>
                            {row.name}
                          </Text>
                          {row.isNewClient ? <AqaNewClientBadge compact /> : null}
                          {row.isGuest ? (
                            <View style={styles.guestBadge}>
                              <Text style={styles.guestBadgeText}>
                                {t("attendance.guest_badge")}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <View style={styles.swimmerMetaRow}>
                          <Ionicons
                            name={isPresent ? "checkmark-circle" : "close-circle"}
                            size={14}
                            color={color}
                            accessible={false}
                          />
                          <Text style={[styles.statusSubText, { color }]}>
                            {isPresent ? t("attendance.present") : t("attendance.absent")}
                            {row.method === "qr" ? " • QR" : ""}
                          </Text>
                          {!row.memberId.startsWith("guest-") ? (
                            <Pressable
                              onPress={() => router.push(`/members/${row.memberId}`)}
                              hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
                              accessibilityRole="link"
                              accessibilityLabel={`${t("attendance.open_profile")}: ${row.name}`}
                              style={({ pressed }) => [styles.suiviLink, pressed && { opacity: 0.7 }]}
                            >
                              <Text style={styles.suiviLinkText}>
                                {t("attendance.open_profile")}
                              </Text>
                              <Ionicons
                                name={isRtl ? "chevron-back" : "chevron-forward"}
                                size={14}
                                color={aqaColors.accent}
                                accessible={false}
                              />
                            </Pressable>
                          ) : null}
                        </View>
                      </View>

                      {/* Present / Absent switch: icon + word + colour, 44pt each. */}
                      <View
                        style={styles.binaryTogglePill}
                        accessibilityRole="radiogroup"
                        accessibilityLabel={row.name}
                      >
                        {(["present", "absent"] as const).map((option) => {
                          const selected = row.status === option;
                          const fill = option === "present" ? aqaColors.success : aqaColors.danger;
                          return (
                            <Pressable
                              key={option}
                              disabled={isViewOnly}
                              onPress={() => setStatus(row.memberId, option)}
                              accessibilityRole="radio"
                              accessibilityLabel={`${row.name}: ${t(`attendance.${option}`)}`}
                              accessibilityState={{ checked: selected, disabled: isViewOnly }}
                              style={({ pressed }) => [
                                styles.binaryOption,
                                selected && { backgroundColor: fill },
                                pressed && { opacity: 0.82 },
                              ]}
                            >
                              <Ionicons
                                name={option === "present" ? "checkmark" : "close"}
                                size={18}
                                color={selected ? aqaColors.onPrimary : aqaColors.textMuted}
                                accessible={false}
                              />
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  </AqaDoubleBezelCard>
                );
              })}
            </>
          ) : null}

          {/* STEP 1: Evaluation — 5 Stroke Progress Bars (0% to 200%) */}
          {activeStep === 1 ? (
            <>
              <AqaDoubleBezelCard padding={14}>
                <AqaSectionHeader
                  eyebrow={t("session.bars_eyebrow")}
                  title={t("session.bars_title")}
                  subtitle={t("session.bars_subtitle")}
                />
                <AqaIslandButton
                  label={
                    showAllBarsGlobal
                      ? t("session.show_last_bar")
                      : t("session.show_all_bars")
                  }
                  icon={showAllBarsGlobal ? "contract-outline" : "expand-outline"}
                  compact
                  secondary
                  onPress={() => {
                    const next = !showAllBarsGlobal;
                    setShowAllBarsGlobal(next);
                    setRows((prev) =>
                      prev.map((r) => ({ ...r, showAllBars: next }))
                    );
                  }}
                  style={{ marginTop: 12 }}
                />
              </AqaDoubleBezelCard>

              {presentRows.map((row) => {
                const visibleBars = row.showAllBars
                  ? AQA_STROKE_BARS
                  : AQA_STROKE_BARS.filter(
                      (b) => b.key === row.lastTouchedBar
                    );

                return (
                  <AqaDoubleBezelCard key={row.memberId} padding={14}>
                    <View style={styles.evalSwimmerHeader}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          flex: 1,
                        }}
                      >
                        <Text numberOfLines={1} style={styles.swimmerName}>
                          {row.name}
                        </Text>
                        {row.isNewClient ? <AqaNewClientBadge compact /> : null}
                      </View>
                      <Pressable
                        onPress={() =>
                          updateRow(row.memberId, (r) => ({
                            ...r,
                            showAllBars: !r.showAllBars,
                          }))
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`${row.name}: ${
                          row.showAllBars ? t("session.one_bar") : t("session.five_bars")
                        }`}
                        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                      >
                        <Text style={styles.toggleFiveText}>
                          {row.showAllBars ? t("session.one_bar") : t("session.five_bars")}
                        </Text>
                      </Pressable>
                    </View>

                    {/* Stroke Selector Pills when showing single bar */}
                    {!row.showAllBars ? (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 6, marginVertical: 8 }}
                      >
                        {AQA_STROKE_BARS.map((def) => {
                          const active = row.lastTouchedBar === def.key;
                          const val = row.bars[def.key] ?? 0;
                          return (
                            <Pressable
                              key={def.key}
                              onPress={() =>
                                updateRow(row.memberId, (r) => ({
                                  ...r,
                                  lastTouchedBar: def.key,
                                }))
                              }
                              accessibilityRole="tab"
                              accessibilityLabel={`${getStrokeBarShortLabel(def, locale)} ${val}%`}
                              accessibilityState={{ selected: active }}
                              style={[
                                styles.strokeMiniPill,
                                active && styles.strokeMiniPillActive,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.strokeMiniPillText,
                                  active && { color: aqaColors.accent },
                                ]}
                              >
                                {getStrokeBarShortLabel(def, locale)} ({val}%)
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    ) : null}

                    <View style={{ gap: 10, marginTop: 6 }}>
                      {visibleBars.map((def) => (
                        <AqaStrokeBar200
                          key={def.key}
                          barKey={def.key}
                          value={row.bars[def.key] ?? 0}
                          locale={locale}
                          isLastTouched={row.lastTouchedBar === def.key}
                          compact
                          readOnly={isViewOnly}
                          onChange={(nextVal) =>
                            updateRow(row.memberId, (r) => ({
                              ...r,
                              lastTouchedBar: def.key,
                              bars: {
                                ...r.bars,
                                [def.key]: nextVal,
                              },
                            }))
                          }
                        />
                      ))}
                    </View>
                  </AqaDoubleBezelCard>
                );
              })}
            </>
          ) : null}

          {/* STEP 2: Swimmer Bilan + Badges + Session Rating */}
          {activeStep === 2 ? (
            <>
              {activeBilanRow ? (
                <>
                  {/* Swimmer Selector Strip */}
                  <AqaDoubleBezelCard padding={13}>
                    <Text style={styles.bilanHintLabel}>
                      {t("session.pick_bilan_swimmer")}
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8, marginTop: 8 }}
                    >
                      {presentRows.map((r) => {
                        const selected = r.memberId === activeBilanRow.memberId;
                        return (
                          <Pressable
                            key={r.memberId}
                            onPress={() => setSelectedBilanMemberId(r.memberId)}
                            accessibilityRole="radio"
                            accessibilityLabel={r.name}
                            accessibilityState={{ checked: selected }}
                            style={[
                              styles.bilanSwimmerPill,
                              selected && styles.bilanSwimmerPillActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.bilanSwimmerPillText,
                                selected && { color: aqaColors.accent },
                              ]}
                            >
                              {r.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </AqaDoubleBezelCard>

                  {/* 1. Session Swim Volume (Meters) */}
                  <AqaDoubleBezelCard padding={14}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.cardTitle}>
                        {t("suivi.volume_meters")}
                      </Text>
                      <Text style={styles.cumulText}>
                        {t("session.total_meters", {
                          meters:
                            activeBilanRow.storedTotalDistanceMeters +
                            (Number(activeBilanRow.sessionVolumeMeters) || 0),
                        })}
                      </Text>
                    </View>
                    {activeBilanRow.bars.basics < 1 ? (
                      <Text style={styles.lockedHint}>
                        {t("suivi.volume_locked_hint")}
                      </Text>
                    ) : (
                      <TextInput
                        value={activeBilanRow.sessionVolumeMeters}
                        onChangeText={(v) =>
                          updateRow(activeBilanRow.memberId, (r) => ({
                            ...r,
                            sessionVolumeMeters: v,
                          }))
                        }
                        keyboardType="numeric"
                        placeholder="Ex: 800"
                        placeholderTextColor={aqaColors.textLight}
                        style={styles.input}
                      />
                    )}
                  </AqaDoubleBezelCard>

                  {/* 2. Stored Records (50m & Apnea) with Lock/Unlock Toggle */}
                  <AqaDoubleBezelCard padding={14}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.cardTitle}>{t("session.records_title")}</Text>
                      <Pressable
                        onPress={() =>
                          updateRow(activeBilanRow.memberId, (r) => ({
                            ...r,
                            recordsUnlocked: !r.recordsUnlocked,
                          }))
                        }
                        accessibilityRole="button"
                        accessibilityLabel={
                          activeBilanRow.recordsUnlocked
                            ? t("session.records_lock")
                            : t("session.records_edit")
                        }
                        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                        style={({ pressed }) => [styles.recordToggle, pressed && { opacity: 0.7 }]}
                      >
                        <Ionicons
                          name={activeBilanRow.recordsUnlocked ? "lock-closed-outline" : "create-outline"}
                          size={16}
                          color={activeBilanRow.recordsUnlocked ? aqaColors.warning : aqaColors.accent}
                          accessible={false}
                        />
                        <Text
                          style={{
                            color: activeBilanRow.recordsUnlocked
                              ? aqaColors.warning
                              : aqaColors.accent,
                            fontSize: 12,
                            fontWeight: "800",
                          }}
                        >
                          {activeBilanRow.recordsUnlocked
                            ? t("session.records_lock")
                            : t("session.records_edit")}
                        </Text>
                      </Pressable>
                    </View>
                    <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.subFieldLabel}>{t("session.record_50m")}</Text>
                        <TextInput
                          value={activeBilanRow.record50m}
                          editable={activeBilanRow.recordsUnlocked}
                          onChangeText={(v) =>
                            updateRow(activeBilanRow.memberId, (r) => ({
                              ...r,
                              record50m: v,
                            }))
                          }
                          keyboardType="decimal-pad"
                          placeholder="34.5"
                          placeholderTextColor={aqaColors.textLight}
                          style={[
                            styles.input,
                            !activeBilanRow.recordsUnlocked && { opacity: 0.6 },
                          ]}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.subFieldLabel}>{t("session.record_apnea")}</Text>
                        <TextInput
                          value={activeBilanRow.recordApnea}
                          editable={activeBilanRow.recordsUnlocked}
                          onChangeText={(v) =>
                            updateRow(activeBilanRow.memberId, (r) => ({
                              ...r,
                              recordApnea: v,
                            }))
                          }
                          keyboardType="decimal-pad"
                          placeholder="45"
                          placeholderTextColor={aqaColors.textLight}
                          style={[
                            styles.input,
                            !activeBilanRow.recordsUnlocked && { opacity: 0.6 },
                          ]}
                        />
                      </View>
                    </View>

                    <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.subFieldLabel}>
                          {t("suivi.weight_kg")}
                        </Text>
                        <TextInput
                          value={activeBilanRow.weightKg}
                          onChangeText={(v) =>
                            updateRow(activeBilanRow.memberId, (r) => ({
                              ...r,
                              weightKg: v,
                            }))
                          }
                          keyboardType="decimal-pad"
                          placeholder="62"
                          placeholderTextColor={aqaColors.textLight}
                          style={styles.input}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.subFieldLabel}>
                          {t("suivi.height_cm")}
                        </Text>
                        <TextInput
                          value={activeBilanRow.heightCm}
                          onChangeText={(v) =>
                            updateRow(activeBilanRow.memberId, (r) => ({
                              ...r,
                              heightCm: v,
                            }))
                          }
                          keyboardType="decimal-pad"
                          placeholder="172"
                          placeholderTextColor={aqaColors.textLight}
                          style={styles.input}
                        />
                      </View>
                    </View>
                  </AqaDoubleBezelCard>

                  {/* 3. Official 15 AQA Badges Picker + Honor Nominations */}
                  <AqaDoubleBezelCard padding={14}>
                    <Text style={styles.cardTitle}>{t("session.badge_pick_title")}</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8, marginTop: 10 }}
                    >
                      {AQA_OFFICIAL_BADGES.map((badge) => {
                        const selected = activeBilanRow.badgeKey === badge.key;
                        return (
                          <Pressable
                            key={badge.key}
                            accessibilityRole="radio"
                            accessibilityLabel={getBadgeLabel(badge, locale)}
                            accessibilityState={{ checked: selected }}
                            onPress={() =>
                              updateRow(activeBilanRow.memberId, (r) => ({
                                ...r,
                                badgeKey: selected ? null : badge.key,
                                badgeLabel: selected
                                  ? null
                                  : getBadgeLabel(badge, locale),
                              }))
                            }
                            style={[
                              styles.badgeSelectCard,
                              selected && styles.badgeSelectCardActive,
                            ]}
                          >
                            <Image
                              source={getBadgeImageSource(badge.asset)}
                              style={styles.badgeSelectImg}
                              resizeMode="contain"
                            />
                            <Text
                              numberOfLines={1}
                              style={[
                                styles.badgeSelectText,
                                selected && { color: aqaColors.accent },
                              ]}
                            >
                              {getBadgeLabel(badge, locale)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>

                    {/* Honor Nominations: Swimmer of the Month / Year */}
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                      <Pressable
                        disabled={monthHonorLocked}
                        accessibilityRole="button"
                        accessibilityLabel={t("suivi.honor_month")}
                        accessibilityState={{
                          disabled: monthHonorLocked,
                          selected: activeBilanRow.honorRequestType === "swimmer_of_the_month",
                        }}
                        onPress={() =>
                          updateRow(activeBilanRow.memberId, (r) => ({
                            ...r,
                            honorRequestType:
                              r.honorRequestType === "swimmer_of_the_month"
                                ? null
                                : "swimmer_of_the_month",
                          }))
                        }
                        style={[
                          styles.honorCard,
                          activeBilanRow.honorRequestType ===
                            "swimmer_of_the_month" && styles.honorCardActive,
                          monthHonorLocked && { opacity: 0.5 },
                        ]}
                      >
                        <Text style={styles.honorCardTitle}>
                          {t("suivi.honor_month")}
                        </Text>
                        <Text style={styles.honorCardSub}>
                          {monthHonorLocked
                            ? monthHonorWinner
                              ? t("honor.elected", { name: monthHonorWinner })
                              : t("honor.locked")
                            : activeBilanRow.honorRequestType ===
                              "swimmer_of_the_month"
                            ? t("honor.selected")
                            : t("honor.propose")}
                        </Text>
                      </Pressable>

                      <Pressable
                        disabled={yearHonorLocked}
                        accessibilityRole="button"
                        accessibilityLabel={t("suivi.honor_year")}
                        accessibilityState={{
                          disabled: yearHonorLocked,
                          selected: activeBilanRow.honorRequestType === "swimmer_of_the_year",
                        }}
                        onPress={() =>
                          updateRow(activeBilanRow.memberId, (r) => ({
                            ...r,
                            honorRequestType:
                              r.honorRequestType === "swimmer_of_the_year"
                                ? null
                                : "swimmer_of_the_year",
                          }))
                        }
                        style={[
                          styles.honorCard,
                          activeBilanRow.honorRequestType ===
                            "swimmer_of_the_year" && styles.honorCardActive,
                          yearHonorLocked && { opacity: 0.5 },
                        ]}
                      >
                        <Text style={styles.honorCardTitle}>
                          {t("suivi.honor_year")}
                        </Text>
                        <Text style={styles.honorCardSub}>
                          {yearHonorLocked
                            ? yearHonorWinner
                              ? t("honor.elected", { name: yearHonorWinner })
                              : t("honor.locked")
                            : activeBilanRow.honorRequestType ===
                              "swimmer_of_the_year"
                            ? t("honor.selected")
                            : t("honor.propose")}
                        </Text>
                      </Pressable>
                    </View>
                  </AqaDoubleBezelCard>

                  {/* 4. Word from Coach & Observation */}
                  <AqaDoubleBezelCard padding={14}>
                    <Text style={styles.cardTitle}>
                      {t("suivi.word_from_coach")}
                    </Text>
                    <TextInput
                      value={activeBilanRow.wordFromCoach}
                      onChangeText={(v) =>
                        updateRow(activeBilanRow.memberId, (r) => ({
                          ...r,
                          wordFromCoach: v,
                        }))
                      }
                      multiline
                      placeholder={t("session.word_placeholder")}
                      placeholderTextColor={aqaColors.textLight}
                      style={[styles.input, { minHeight: 64, marginTop: 8 }]}
                    />

                    <Text style={[styles.cardTitle, { marginTop: 12 }]}>
                      {t("suivi.observation")}
                    </Text>
                    <TextInput
                      value={activeBilanRow.observation}
                      onChangeText={(v) =>
                        updateRow(activeBilanRow.memberId, (r) => ({
                          ...r,
                          observation: v,
                        }))
                      }
                      multiline
                      placeholder={t("session.observation_placeholder")}
                      placeholderTextColor={aqaColors.textLight}
                      style={[styles.input, { minHeight: 56, marginTop: 8 }]}
                    />
                  </AqaDoubleBezelCard>
                </>
              ) : null}

              {/* Overall Session Evaluation & Rating Card */}
              <AqaDoubleBezelCard padding={15}>
                <View style={styles.rowBetween}>
                  <Text style={styles.cardTitle}>
                    {t("attendance.session_rating")}
                  </Text>
                  <Text style={styles.starScoreBadge} accessibilityLabel={t("common.rating_out_of", { value: rating })}>
                    {rating} / 5
                  </Text>
                </View>
                <View style={styles.ratingRow} accessibilityRole="radiogroup">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Pressable
                      key={star}
                      onPress={() => setRating(star)}
                      accessibilityRole="radio"
                      accessibilityLabel={t("common.rating_out_of", { value: star })}
                      accessibilityState={{ checked: rating === star }}
                      style={({ pressed }) => [
                        styles.starBtn,
                        rating >= star && styles.starBtnActive,
                        pressed && { opacity: 0.82 },
                      ]}
                    >
                      <Ionicons
                        name={rating >= star ? "star" : "star-outline"}
                        size={18}
                        color={rating >= star ? aqaColors.warning : aqaColors.textMuted}
                        accessible={false}
                      />
                      <Text
                        style={[
                          styles.starText,
                          rating >= star && styles.starTextActive,
                        ]}
                      >
                        {star}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={[styles.subFieldLabel, { marginTop: 12 }]}>
                  {t("attendance.session_notes")}
                </Text>
                <TextInput
                  value={summary}
                  onChangeText={setSummary}
                  multiline
                  placeholder={t("session.summary_placeholder")}
                  placeholderTextColor={aqaColors.textLight}
                  style={[styles.input, { minHeight: 68 }]}
                />
              </AqaDoubleBezelCard>
            </>
          ) : null}
        </ScrollView>

        {/* Sticky Bottom Navigation / Save Bar */}
        {!isViewOnly ? (
          // Clears the Android gesture bar / iPhone home indicator.
          <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            {activeStep > 0 ? (
              <Pressable
                onPress={() => setActiveStep((s) => Math.max(0, s - 1))}
                accessibilityRole="button"
                accessibilityLabel={t("common.previous_step")}
                style={({ pressed }) => [styles.bottomIconBtn, pressed && { opacity: 0.82 }]}
              >
                <Ionicons
                  name={isRtl ? "arrow-forward" : "arrow-back"}
                  size={T.icon.md}
                  color={aqaColors.accent}
                />
              </Pressable>
            ) : null}
            {activeStep < 2 ? (
              <AqaIslandButton
                label={t("common.next")}
                icon={isRtl ? "arrow-back" : "arrow-forward"}
                secondary
                accessibilityLabel={`${t("common.next")}: ${t(
                  activeStep === 0 ? "quick_logger.step2" : "quick_logger.step3"
                )}`}
                onPress={() => setActiveStep((s) => Math.min(2, s + 1))}
                style={{ flex: 1 }}
              />
            ) : null}
            <AqaIslandButton
              label={
                saving
                  ? t("common.saving")
                  : activeStep < 2
                  ? t("attendance.close_short")
                  : t("attendance.close_and_save")
              }
              icon="checkmark-done"
              accessibilityLabel={t("attendance.close_and_save")}
              loading={saving}
              success
              onPress={confirmCloseSession}
              style={{ flex: 1 }}
            />
          </View>
        ) : null}
      </View>

      {/* Add Guest Swimmer Modal */}
      <Modal
        visible={guestModalOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setGuestModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox} accessibilityViewIsModal>
            <Text style={styles.modalTitle} accessibilityRole="header">
              {t("attendance.add_guest")}
            </Text>

            {clubSwimmers.length > 0 ? (
              <View style={{ maxHeight: 200, marginVertical: 10 }}>
                <Text style={styles.subFieldLabel}>
                  {t("attendance.pick_club_swimmer")}
                </Text>
                <ScrollView style={{ marginTop: 6 }} accessibilityRole="radiogroup">
                  {clubSwimmers.slice(0, 25).map((cs) => {
                    const selected = selectedClubSwimmerId === cs.id;
                    return (
                      <Pressable
                        key={cs.id}
                        onPress={() =>
                          setSelectedClubSwimmerId(selected ? null : cs.id)
                        }
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        style={({ pressed }) => [
                          styles.clubSwimmerOption,
                          selected && styles.clubSwimmerOptionActive,
                          pressed && { opacity: 0.82 },
                        ]}
                      >
                        <Ionicons
                          name={selected ? "radio-button-on" : "radio-button-off"}
                          size={T.icon.md}
                          color={selected ? aqaColors.accent : aqaColors.textMuted}
                          accessible={false}
                        />
                        <Text style={styles.clubSwimmerOptionText} numberOfLines={1}>
                          {cs.fullName} {cs.level ? `(${cs.level})` : ""}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            <Text style={styles.subFieldLabel} nativeID="guestNameLabel">
              {t("attendance.guest_name")}
            </Text>
            <TextInput
              value={guestNameInput}
              onChangeText={setGuestNameInput}
              accessibilityLabelledBy="guestNameLabel"
              accessibilityLabel={t("attendance.guest_name")}
              autoCapitalize="words"
              textContentType="name"
              returnKeyType="done"
              placeholder={t("attendance.guest_name_placeholder")}
              placeholderTextColor={aqaColors.textLight}
              style={styles.input}
            />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <AqaIslandButton
                label={t("common.cancel")}
                compact
                secondary
                onPress={() => setGuestModalOpen(false)}
                style={{ flex: 1 }}
              />
              <AqaIslandButton
                label={t("common.confirm")}
                compact
                onPress={handleAddGuest}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </AqaAmbientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  topHeader: {
    backgroundColor: "#060B16",
    borderBottomWidth: 1,
    borderBottomColor: aqaColors.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  topHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backBtn: {
    backgroundColor: aqaColors.surface,
    width: T.touch.min,
    height: T.touch.min,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: aqaColors.textPrimary,
    fontSize: T.fontSize.title,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: aqaColors.textMuted,
    fontSize: T.fontSize.label,
    marginTop: 2,
  },
  guestBtn: {
    backgroundColor: "rgba(0, 242, 255, 0.14)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: aqaColors.accent,
    paddingHorizontal: 0,
    paddingVertical: 0,
    width: T.touch.min,
    height: T.touch.min,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollBody: {
    padding: 16,
    gap: 12,
    paddingBottom: T.spacing.lg,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 8,
  },
  kpiChip: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  kpiChipPresent: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.4)",
  },
  kpiChipAbsent: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  kpiChipRate: {
    backgroundColor: "rgba(0, 242, 255, 0.12)",
    borderColor: "rgba(0, 242, 255, 0.4)",
  },
  kpiCount: {
    fontSize: T.fontSize.headline,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  kpiLabel: {
    color: aqaColors.textMuted,
    fontSize: T.fontSize.caption,
    fontWeight: "800",
    marginTop: 2,
  },
  quickBarRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  qrTitle: {
    color: aqaColors.accent,
    fontSize: T.fontSize.label,
    fontWeight: "800",
    marginBottom: 8,
  },
  cameraContainer: {
    height: 190,
    borderRadius: 12,
    overflow: "hidden",
  },
  qrBannerText: {

    fontSize: T.fontSize.label,
    fontWeight: "800",
    flex: 1,
  },
  swimmerAttRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 15,
    fontWeight: "900",
  },
  swimmerName: {
    color: aqaColors.textPrimary,
    fontSize: T.fontSize.body,
    fontWeight: "800",
    flexShrink: 1,
  },
  guestBadge: {
    backgroundColor: "rgba(56, 189, 248, 0.16)",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  guestBadgeText: {
    color: aqaColors.primaryHover,
    fontSize: T.fontSize.caption,
    fontWeight: "900",
  },
  statusSubText: {
    fontSize: T.fontSize.label,
    fontWeight: "800",
  },
  suiviLinkText: {
    color: aqaColors.accent,
    fontSize: T.fontSize.label,
    fontWeight: "800",
  },
  binaryTogglePill: {
    flexDirection: "row",
    backgroundColor: "#060B16",
    borderRadius: 999,
    padding: 3,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    gap: 4,
  },
  binaryOption: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 999,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  evalSwimmerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleFiveText: {
    color: aqaColors.accent,
    fontSize: 12,
    fontWeight: "800",
  },
  strokeMiniPill: {
    backgroundColor: "#060B16",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    paddingHorizontal: 9,
    paddingVertical: 5,
    minHeight: 40,
    justifyContent: "center",
  },
  strokeMiniPillActive: {
    backgroundColor: "rgba(14, 165, 233, 0.18)",
    borderColor: aqaColors.primaryHover,
  },
  strokeMiniPillText: {
    color: aqaColors.textMuted,
    fontSize: 12,
    fontWeight: "800",
  },
  bilanHintLabel: {
    color: aqaColors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  bilanSwimmerPill: {
    backgroundColor: "#060B16",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: "center",
  },
  bilanSwimmerPillActive: {
    backgroundColor: "rgba(0, 242, 255, 0.16)",
    borderColor: aqaColors.accent,
  },
  bilanSwimmerPillText: {
    color: aqaColors.textPrimary,
    fontSize: 12,
    fontWeight: "800",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    color: aqaColors.textPrimary,
    fontSize: 13.5,
    fontWeight: "800",
  },
  cumulText: {
    color: aqaColors.accent,
    fontSize: 12,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  lockedHint: {
    color: aqaColors.warning,
    fontSize: 12,
    marginTop: 6,
  },
  subFieldLabel: {
    color: aqaColors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 5,
  },
  input: {
    backgroundColor: "#060B16",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    color: aqaColors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    marginTop: 4,
  },
  badgeSelectCard: {
    width: 88,
    backgroundColor: "#060B16",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    padding: 8,
    alignItems: "center",
    gap: 5,
  },
  badgeSelectCardActive: {
    backgroundColor: "rgba(0, 242, 255, 0.16)",
    borderColor: aqaColors.accent,
  },
  badgeSelectImg: {
    width: 38,
    height: 38,
  },
  badgeSelectText: {
    color: aqaColors.textMuted,
    fontSize: 12,
    fontWeight: "800",
  },
  honorCard: {
    flex: 1,
    backgroundColor: "#060B16",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    padding: 10,
    minHeight: 56,
  },
  honorCardActive: {
    backgroundColor: "rgba(245, 158, 11, 0.16)",
    borderColor: aqaColors.warning,
  },
  honorCardTitle: {
    color: aqaColors.textPrimary,
    fontSize: 12,
    fontWeight: "800",
  },
  honorCardSub: {
    color: aqaColors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  starScoreBadge: {
    color: aqaColors.warning,
    fontSize: 14,
    fontWeight: "900",
  },
  ratingRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  starBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#060B16",
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    alignItems: "center",
    minHeight: 48,
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
  },
  starBtnActive: {
    backgroundColor: "rgba(245, 158, 11, 0.22)",
    borderColor: aqaColors.warning,
  },
  starText: {
    color: aqaColors.textMuted,
    fontWeight: "900",
  },
  starTextActive: {
    color: aqaColors.warning,
  },
  bottomBar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 0,
    backgroundColor: "#060B16",
    borderTopWidth: 1,
    borderTopColor: aqaColors.borderSubtle,
    paddingTop: 12,
    alignItems: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(3, 7, 18, 0.82)",
    justifyContent: "center",
    padding: 20,
  },
  modalBox: {
    backgroundColor: "#0B1120",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: aqaColors.accent,
    padding: 18,
  },
  modalTitle: {
    color: aqaColors.textPrimary,
    fontSize: T.fontSize.title,
    fontWeight: "800",
    marginBottom: 8,
  },
  clubSwimmerOption: {
    paddingVertical: 0,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    marginBottom: 6,
    minHeight: T.touch.min,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  clubSwimmerOptionActive: {
    backgroundColor: "rgba(0, 242, 255, 0.16)",
    borderColor: aqaColors.accent,
  },
  clubSwimmerOptionText: {
    color: aqaColors.textPrimary,
    fontSize: T.fontSize.body,
    fontWeight: "700",
    flex: 1,
  },
  qrBannerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  swimmerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  swimmerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  suiviLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginLeft: 6,
  },
  bottomIconBtn: {
    width: T.touch.min,
    height: T.touch.min,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.35)",
    backgroundColor: aqaColors.surfaceControl,
    alignItems: "center",
    justifyContent: "center",
  },
  recordToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 32,
  },
});

import React, { useEffect, useState } from "react";
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
  LanguageSwitcherPill,
} from "../../src/components/AqaUi";
import type {
  AttendanceMethod,
  AttendanceStatus,
  HonorBadgeType,
  StrokeBarKey,
  StrokeBars,
} from "../../src/contract";
import { useCoachStore } from "../../src/state/CoachStore";
import { aqaColors } from "../../src/theme/tokens";

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
  const { t, locale, refreshWorkspace } = useCoachStore();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

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

  const toggleStatus = (memberId: string) => {
    if (isViewOnly) return;
    updateRow(memberId, (r) => ({
      ...r,
      status: r.status === "present" ? "absent" : "present",
      method: "manual",
    }));
  };

  const markAllPresent = () => {
    if (isViewOnly) return;
    setRows((prev) => prev.map((r) => ({ ...r, status: "present" })));
  };

  const handleQrScanned = ({ data }: { data: string }) => {
    const code = data.trim().toLowerCase();
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
    } else {
      setQrBanner(t("attendance.qr_unmatched"));
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
        <View style={styles.topHeader}>
          <View style={styles.topHeaderRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backBtnText}>{"<"}</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={styles.headerTitle}>
                {sessionMeta.groupName}
              </Text>
              <Text numberOfLines={1} style={styles.headerSubtitle}>
                {sessionMeta.sessionDate} • {sessionMeta.startTime}-
                {sessionMeta.endTime} • {sessionMeta.pool}
              </Text>
            </View>
            <LanguageSwitcherPill compact />
            {!isViewOnly ? (
              <Pressable
                onPress={() => setGuestModalOpen(true)}
                style={styles.guestBtn}
              >
                <Text style={styles.guestBtnText}>+ INVITE</Text>
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
                    <Text style={styles.kpiLabel}>ASSIDUITE</Text>
                  </View>
                </View>

                <View style={styles.quickBarRow}>
                  {!isViewOnly ? (
                    <AqaIslandButton
                      label={t("attendance.mark_all_present")}
                      compact
                      secondary
                      onPress={markAllPresent}
                      style={{ flex: 1 }}
                    />
                  ) : null}
                  {!isViewOnly ? (
                    <AqaIslandButton
                      label={qrScannerActive ? "Fermer QR" : t("today.scan_qr")}
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
                    <Text style={styles.qrBannerText}>{qrBanner}</Text>
                  ) : null}
                </AqaDoubleBezelCard>
              ) : null}

              {/* Swimmer Binary Attendance List */}
              {rows.map((row) => {
                const isPresent = row.status === "present";
                const color = isPresent ? aqaColors.success : aqaColors.danger;
                return (
                  <AqaDoubleBezelCard
                    key={row.memberId}
                    accentColor={color}
                    padding={13}
                    onPress={
                      isViewOnly ? undefined : () => toggleStatus(row.memberId)
                    }
                  >
                    <View style={styles.swimmerAttRow}>
                      <View
                        style={[
                          styles.avatarCircle,
                          {
                            borderColor: color,
                            backgroundColor: `${color}22`,
                          },
                        ]}
                      >
                        <Text style={[styles.avatarInitial, { color }]}>
                          {row.name.slice(0, 1).toUpperCase()}
                        </Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <Text numberOfLines={1} style={styles.swimmerName}>
                            {row.name}
                          </Text>
                          {row.isNewClient ? (
                            <AqaNewClientBadge compact />
                          ) : null}
                          {row.isGuest ? (
                            <View style={styles.guestBadge}>
                              <Text style={styles.guestBadgeText}>INVITE</Text>
                            </View>
                          ) : null}
                        </View>

                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10,
                            marginTop: 4,
                          }}
                        >
                          <Text style={[styles.statusSubText, { color }]}>
                            {isPresent
                              ? t("attendance.present").toUpperCase()
                              : t("attendance.absent").toUpperCase()}
                            {row.method === "qr" ? " • QR" : ""}
                          </Text>
                          {!row.memberId.startsWith("guest-") ? (
                            <Pressable
                              onPress={() =>
                                router.push(`/members/${row.memberId}`)
                              }
                            >
                              <Text style={styles.suiviLinkText}>
                                Dossier Suivi {">"}
                              </Text>
                            </Pressable>
                          ) : null}
                        </View>
                      </View>

                      {/* Binary Pill Toggle */}
                      <View style={styles.binaryTogglePill}>
                        <Pressable
                          onPress={() =>
                            !isViewOnly &&
                            updateRow(row.memberId, (r) => ({
                              ...r,
                              status: "present",
                            }))
                          }
                          style={[
                            styles.binaryOption,
                            isPresent && { backgroundColor: aqaColors.success },
                          ]}
                        >
                          <Text
                            style={[
                              styles.binaryOptionText,
                              isPresent && { color: "#FFFFFF" },
                            ]}
                          >
                            {t("attendance.present").toUpperCase()}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() =>
                            !isViewOnly &&
                            updateRow(row.memberId, (r) => ({
                              ...r,
                              status: "absent",
                            }))
                          }
                          style={[
                            styles.binaryOption,
                            !isPresent && { backgroundColor: aqaColors.danger },
                          ]}
                        >
                          <Text
                            style={[
                              styles.binaryOptionText,
                              !isPresent && { color: "#FFFFFF" },
                            ]}
                          >
                            {t("attendance.absent").toUpperCase()}
                          </Text>
                        </Pressable>
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
                  eyebrow="AQA BIOMECHANICAL BARS (0% - 200%)"
                  title={
                    locale === "ar"
                      ? "تقييم السباحة (0-100% تقني | 100-200% نخبة)"
                      : "Evaluation Nage (0-100% Technique | 100-200% Elite)"
                  }
                  subtitle={
                    locale === "ar"
                      ? "الأشرطة الخمسة لكل سباح حاضر"
                      : "Ajustez la progression technique ou elite des nageurs presents"
                  }
                />
                <AqaIslandButton
                  label={
                    showAllBarsGlobal
                      ? locale === "ar"
                        ? "إظهار الشريط النشط فقط"
                        : "Afficher uniquement la derniere barre touchee"
                      : locale === "ar"
                      ? "إظهار جميع الأشرطة الخمسة (5 أشرطة)"
                      : "Afficher les 5 barres de progression"
                  }
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
                      >
                        <Text style={styles.toggleFiveText}>
                          {row.showAllBars ? "1 Barre" : "5 Barres"}
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
                      {locale === "ar"
                        ? "اختر السباح لتعبئة الحصيلة (Bilan):"
                        : "Selectionnez le nageur present pour son Bilan :"}
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
                        Total:{" "}
                        {activeBilanRow.storedTotalDistanceMeters +
                          (Number(activeBilanRow.sessionVolumeMeters) || 0)}{" "}
                        m
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
                      <Text style={styles.cardTitle}>
                        Records (50m & Apnee)
                      </Text>
                      <Pressable
                        onPress={() =>
                          updateRow(activeBilanRow.memberId, (r) => ({
                            ...r,
                            recordsUnlocked: !r.recordsUnlocked,
                          }))
                        }
                      >
                        <Text
                          style={{
                            color: activeBilanRow.recordsUnlocked
                              ? aqaColors.warning
                              : aqaColors.accent,
                            fontSize: 11.5,
                            fontWeight: "800",
                          }}
                        >
                          {activeBilanRow.recordsUnlocked
                            ? "Verrouiller"
                            : "Modifier Record"}
                        </Text>
                      </Pressable>
                    </View>
                    <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.subFieldLabel}>Record 50m (s)</Text>
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
                        <Text style={styles.subFieldLabel}>
                          Record Apnee (m)
                        </Text>
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
                    <Text style={styles.cardTitle}>
                      Attribution Badge Officiel AQA (15 Badges)
                    </Text>
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
                              ? `Elu: ${monthHonorWinner}`
                              : "Verrouille"
                            : activeBilanRow.honorRequestType ===
                              "swimmer_of_the_month"
                            ? "Selectionne pour ERP"
                            : "Proposer a l'ERP"}
                        </Text>
                      </Pressable>

                      <Pressable
                        disabled={yearHonorLocked}
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
                              ? `Elu: ${yearHonorWinner}`
                              : "Verrouille"
                            : activeBilanRow.honorRequestType ===
                              "swimmer_of_the_year"
                            ? "Selectionne pour ERP"
                            : "Proposer a l'ERP"}
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
                      placeholder="Message d'encouragement visible sur le dossier..."
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
                      placeholder="Observation technique de la seance..."
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
                  <Text style={styles.starScoreBadge}>{rating} / 5</Text>
                </View>
                <View style={styles.ratingRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Pressable
                      key={star}
                      onPress={() => setRating(star)}
                      style={[
                        styles.starBtn,
                        rating >= star && styles.starBtnActive,
                      ]}
                    >
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
                  placeholder="Resume global de la seance, exercices realises..."
                  placeholderTextColor={aqaColors.textLight}
                  style={[styles.input, { minHeight: 68 }]}
                />
              </AqaDoubleBezelCard>
            </>
          ) : null}
        </ScrollView>

        {/* Sticky Bottom Navigation / Save Bar */}
        {!isViewOnly ? (
          <View style={styles.bottomBar}>
            {activeStep > 0 ? (
              <AqaIslandButton
                label="Retour"
                compact
                secondary
                onPress={() => setActiveStep((s) => Math.max(0, s - 1))}
                style={{ minWidth: 90 }}
              />
            ) : null}
            {activeStep < 2 ? (
              <AqaIslandButton
                label={
                  activeStep === 0
                    ? "Suivant : 2. Evaluation (0-200%)"
                    : "Suivant : 3. Bilan & Cloture"
                }
                onPress={() => setActiveStep((s) => Math.min(2, s + 1))}
                style={{ flex: 1 }}
              />
            ) : null}
            <AqaIslandButton
              label={
                saving ? t("common.saving") : t("attendance.close_and_save")
              }
              loading={saving}
              success
              onPress={handleSaveSession}
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
        onRequestClose={() => setGuestModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{t("attendance.add_guest")}</Text>

            {clubSwimmers.length > 0 ? (
              <View style={{ maxHeight: 160, marginVertical: 10 }}>
                <Text style={styles.subFieldLabel}>
                  Choisir un nageur du club AQA :
                </Text>
                <ScrollView style={{ marginTop: 6 }}>
                  {clubSwimmers.slice(0, 25).map((cs) => {
                    const selected = selectedClubSwimmerId === cs.id;
                    return (
                      <Pressable
                        key={cs.id}
                        onPress={() =>
                          setSelectedClubSwimmerId(selected ? null : cs.id)
                        }
                        style={[
                          styles.clubSwimmerOption,
                          selected && styles.clubSwimmerOptionActive,
                        ]}
                      >
                        <Text style={styles.clubSwimmerOptionText}>
                          {cs.fullName} {cs.level ? `(${cs.level})` : ""}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            <Text style={styles.subFieldLabel}>{t("attendance.guest_name")}</Text>
            <TextInput
              value={guestNameInput}
              onChangeText={setGuestNameInput}
              placeholder="Nom complet de l'invite..."
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
    backgroundColor: "#0F172A",
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: {
    color: aqaColors.accent,
    fontSize: 15,
    fontWeight: "900",
  },
  headerTitle: {
    color: aqaColors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: aqaColors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  guestBtn: {
    backgroundColor: "rgba(0, 242, 255, 0.14)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: aqaColors.accent,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  guestBtnText: {
    color: aqaColors.accent,
    fontSize: 10,
    fontWeight: "900",
  },
  scrollBody: {
    padding: 16,
    gap: 12,
    paddingBottom: 110,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 8,
  },
  kpiChip: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8,
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
    fontSize: 16,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  kpiLabel: {
    color: aqaColors.textMuted,
    fontSize: 9.5,
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
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
  },
  cameraContainer: {
    height: 190,
    borderRadius: 12,
    overflow: "hidden",
  },
  qrBannerText: {
    color: aqaColors.success,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 8,
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
    fontSize: 14,
    fontWeight: "800",
  },
  guestBadge: {
    backgroundColor: "rgba(56, 189, 248, 0.16)",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
  },
  guestBadgeText: {
    color: aqaColors.primaryHover,
    fontSize: 8.5,
    fontWeight: "900",
  },
  statusSubText: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  suiviLinkText: {
    color: aqaColors.accent,
    fontSize: 11,
    fontWeight: "800",
  },
  binaryTogglePill: {
    flexDirection: "row",
    backgroundColor: "#060B16",
    borderRadius: 999,
    padding: 3,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    gap: 3,
  },
  binaryOption: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  binaryOptionText: {
    color: aqaColors.textLight,
    fontSize: 9.5,
    fontWeight: "900",
  },
  evalSwimmerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleFiveText: {
    color: aqaColors.accent,
    fontSize: 11.5,
    fontWeight: "800",
  },
  strokeMiniPill: {
    backgroundColor: "#060B16",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  strokeMiniPillActive: {
    backgroundColor: "rgba(14, 165, 233, 0.18)",
    borderColor: aqaColors.primaryHover,
  },
  strokeMiniPillText: {
    color: aqaColors.textMuted,
    fontSize: 10.5,
    fontWeight: "800",
  },
  bilanHintLabel: {
    color: aqaColors.textMuted,
    fontSize: 11.5,
    fontWeight: "700",
  },
  bilanSwimmerPill: {
    backgroundColor: "#060B16",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    fontSize: 11.5,
    marginTop: 6,
  },
  subFieldLabel: {
    color: aqaColors.textMuted,
    fontSize: 11,
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
    fontSize: 10,
    fontWeight: "800",
  },
  honorCard: {
    flex: 1,
    backgroundColor: "#060B16",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    padding: 10,
  },
  honorCardActive: {
    backgroundColor: "rgba(245, 158, 11, 0.16)",
    borderColor: aqaColors.warning,
  },
  honorCardTitle: {
    color: aqaColors.textPrimary,
    fontSize: 11.5,
    fontWeight: "800",
  },
  honorCardSub: {
    color: aqaColors.textMuted,
    fontSize: 10,
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
    paddingVertical: 12,
    backgroundColor: "#060B16",
    borderTopWidth: 1,
    borderTopColor: aqaColors.borderSubtle,
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
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },
  clubSwimmerOption: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    marginBottom: 6,
  },
  clubSwimmerOptionActive: {
    backgroundColor: "rgba(0, 242, 255, 0.16)",
    borderColor: aqaColors.accent,
  },
  clubSwimmerOptionText: {
    color: aqaColors.textPrimary,
    fontSize: 12.5,
    fontWeight: "700",
  },
});

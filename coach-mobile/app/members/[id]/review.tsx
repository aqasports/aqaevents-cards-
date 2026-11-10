import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { coachApiClient } from "../../../src/api/client";
import {
  AQA_OFFICIAL_BADGES,
  AQA_STROKE_BARS,
  getBadgeImageSource,
  getBadgeLabel,
  getStrokeBarShortLabel,
} from "../../../src/assets/badges";
import {
  AqaAmbientBackground,
  AqaDoubleBezelCard,
  AqaIslandButton,
  AqaSectionHeader,
  AqaSegmentedControl,
  AqaStrokeBar200,
  LanguageSwitcherPill,
} from "../../../src/components/AqaUi";
import {
  normalizeMember,
  type HonorBadgeType,
  type StrokeBarKey,
  type StrokeBars,
} from "../../../src/contract";
import { useCoachStore } from "../../../src/state/CoachStore";
import { aqaColors } from "../../../src/theme/tokens";

export default function TechReviewAndBilanFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, locale, refreshWorkspace } = useCoachStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [swimmerName, setSwimmerName] = useState("Nageur AQA");

  const [bars, setBars] = useState<StrokeBars>({
    basics: 0,
    crawl: 0,
    backstroke: 0,
    breaststroke: 0,
    butterfly: 0,
  });
  const [lastTouchedBar, setLastTouchedBar] = useState<StrokeBarKey>("basics");
  const [showAllFiveBars, setShowAllFiveBars] = useState(false);

  const [storedTotalDistance, setStoredTotalDistance] = useState(0);
  const [sessionVolumeMeters, setSessionVolumeMeters] = useState("");
  const [observation, setObservation] = useState("");
  const [record50m, setRecord50m] = useState("");
  const [recordApnea, setRecordApnea] = useState("");
  const [recordsUnlocked, setRecordsUnlocked] = useState(false);
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [selectedBadgeKey, setSelectedBadgeKey] = useState<string | null>(null);
  const [honorRequestType, setHonorRequestType] =
    useState<HonorBadgeType | null>(null);
  const [wordFromCoach, setWordFromCoach] = useState("");

  const [monthHonorLocked, setMonthHonorLocked] = useState(false);
  const [monthHonorWinner, setMonthHonorWinner] = useState<string | null>(null);
  const [yearHonorLocked, setYearHonorLocked] = useState(false);
  const [yearHonorWinner, setYearHonorWinner] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await coachApiClient.getMemberProfile(id);
        const mRaw =
          res.member && typeof res.member === "object"
            ? (res.member as Record<string, unknown>)
            : res;
        const m = normalizeMember(mRaw);
        setSwimmerName(m.fullName);
        setBars(m.bars);
        setLastTouchedBar(m.lastTouchedBar);
        setStoredTotalDistance(m.totalDistanceMeters);
        if (m.record50m != null) setRecord50m(String(m.record50m));
        if (m.recordApnea != null) setRecordApnea(String(m.recordApnea));
        if (m.weightKg != null) setWeightKg(String(m.weightKg));
        if (m.heightCm != null) setHeightCm(String(m.heightCm));
        if (m.badgeKey) setSelectedBadgeKey(m.badgeKey);
        if (m.wordFromCoach) setWordFromCoach(m.wordFromCoach);

        const lockStatus =
          res.honorLockStatus && typeof res.honorLockStatus === "object"
            ? (res.honorLockStatus as Record<string, unknown>)
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
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const isVolumeUnlocked =
    bars.basics >= 1 &&
    (lastTouchedBar !== "basics" ||
      bars.crawl > 0 ||
      bars.backstroke > 0 ||
      bars.breaststroke > 0 ||
      bars.butterfly > 0 ||
      bars.basics >= 1);

  const handleSave = async () => {
    if (!id || saving) return;
    setSaving(true);
    try {
      const selectedBadgeDef = selectedBadgeKey
        ? AQA_OFFICIAL_BADGES.find((b) => b.key === selectedBadgeKey)
        : null;
      const volNum = isVolumeUnlocked ? Number(sessionVolumeMeters) : 0;
      const r50 = Number(record50m);
      const rApnea = Number(recordApnea);
      const wKg = Number(weightKg);
      const hCm = Number(heightCm);

      const res = await coachApiClient.submitReview(id, {
        bars,
        lastTouchedBar,
        sessionVolumeMeters: volNum > 0 ? volNum : null,
        record50m: r50 > 0 ? r50 : null,
        recordApnea: rApnea > 0 ? rApnea : null,
        weightKg: wKg > 0 ? wKg : null,
        heightCm: hCm > 0 ? hCm : null,
        wordFromCoach: wordFromCoach.trim() || null,
        observation: observation.trim() || null,
        awardedBadgeKey: selectedBadgeDef ? selectedBadgeDef.key : null,
        recommendedLevel: selectedBadgeDef
          ? getBadgeLabel(selectedBadgeDef, locale)
          : null,
        honorRequestType,
      });

      await refreshWorkspace();
      Alert.alert(
        t("app.title"),
        res.mode === "online" ? t("suivi.saved_online") : t("suivi.saved_offline")
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

  const visibleBars = showAllFiveBars
    ? AQA_STROKE_BARS
    : AQA_STROKE_BARS.filter((b) => b.key === lastTouchedBar);

  const projectedTotalMeters =
    storedTotalDistance + (isVolumeUnlocked ? Number(sessionVolumeMeters) || 0 : 0);

  return (
    <AqaAmbientBackground>
      <View style={styles.topHeader}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{"<"}</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={styles.headerTitle}>
            {swimmerName}
          </Text>
          <Text style={styles.headerSub}>
            {currentStep === 0
              ? "1. Evaluation Nage (0% - 200%)"
              : "2. Bilan Nageur & Badges"}
          </Text>
        </View>
        <LanguageSwitcherPill compact />
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
        <AqaSegmentedControl
          values={[0, 1] as const}
          labels={["1. Evaluation (0-200%)", "2. Bilan & Badges"]}
          selectedValue={currentStep}
          onValueChanged={setCurrentStep}
        />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {currentStep === 0 ? (
          <>
            <AqaDoubleBezelCard padding={15}>
              <AqaSectionHeader
                eyebrow="AQA 2-ZONE PROGRESS BARS"
                title={t("suivi.bars_title")}
                subtitle="0-100% Technique • 100-200% Elite (Endurance, Vitesse, Force)"
              />
              <AqaIslandButton
                label={
                  showAllFiveBars
                    ? "Afficher uniquement la derniere barre touchee"
                    : "Afficher les 5 barres de progression"
                }
                compact
                secondary
                onPress={() => setShowAllFiveBars((prev) => !prev)}
                style={{ marginTop: 12 }}
              />

              {!showAllFiveBars ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6, marginTop: 10 }}
                >
                  {AQA_STROKE_BARS.map((def) => {
                    const active = lastTouchedBar === def.key;
                    return (
                      <Pressable
                        key={def.key}
                        onPress={() => setLastTouchedBar(def.key)}
                        style={[
                          styles.strokeSelectorChip,
                          active && styles.strokeSelectorChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.strokeSelectorText,
                            active && { color: aqaColors.accent },
                          ]}
                        >
                          {getStrokeBarShortLabel(def, locale)} (
                          {bars[def.key] ?? 0}%)
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : null}
            </AqaDoubleBezelCard>

            {visibleBars.map((def) => (
              <AqaStrokeBar200
                key={def.key}
                barKey={def.key}
                value={bars[def.key] ?? 0}
                locale={locale}
                isLastTouched={lastTouchedBar === def.key}
                onChange={(nextVal) => {
                  setLastTouchedBar(def.key);
                  setBars((prev) => ({
                    ...prev,
                    [def.key]: nextVal,
                  }));
                }}
              />
            ))}
          </>
        ) : (
          <>
            {/* 1. Session Volume */}
            <AqaDoubleBezelCard padding={15}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{t("suivi.volume_meters")}</Text>
                <Text style={styles.cumulBadge}>
                  Total: {projectedTotalMeters} m
                </Text>
              </View>
              {!isVolumeUnlocked ? (
                <Text style={styles.lockedHint}>
                  {t("suivi.volume_locked_hint")}
                </Text>
              ) : (
                <TextInput
                  value={sessionVolumeMeters}
                  onChangeText={setSessionVolumeMeters}
                  keyboardType="numeric"
                  placeholder="Ex: 800"
                  placeholderTextColor={aqaColors.textLight}
                  style={styles.input}
                />
              )}
            </AqaDoubleBezelCard>

            {/* 2. Stored Records (50m & Apnea) with Lock/Unlock */}
            <AqaDoubleBezelCard padding={15}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>
                  Records Enregistres (50m & Apnee)
                </Text>
                <Pressable
                  onPress={() => setRecordsUnlocked((prev) => !prev)}
                >
                  <Text
                    style={{
                      color: recordsUnlocked
                        ? aqaColors.warning
                        : aqaColors.accent,
                      fontSize: 11.5,
                      fontWeight: "800",
                    }}
                  >
                    {recordsUnlocked ? "Verrouiller" : "Nouveau Record"}
                  </Text>
                </Pressable>
              </View>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subLabel}>{t("suivi.record_50m")}</Text>
                  <TextInput
                    value={record50m}
                    editable={recordsUnlocked}
                    onChangeText={setRecord50m}
                    keyboardType="decimal-pad"
                    placeholder="34.5"
                    placeholderTextColor={aqaColors.textLight}
                    style={[
                      styles.input,
                      !recordsUnlocked && { opacity: 0.6 },
                    ]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subLabel}>{t("suivi.record_apnea")}</Text>
                  <TextInput
                    value={recordApnea}
                    editable={recordsUnlocked}
                    onChangeText={setRecordApnea}
                    keyboardType="decimal-pad"
                    placeholder="45"
                    placeholderTextColor={aqaColors.textLight}
                    style={[
                      styles.input,
                      !recordsUnlocked && { opacity: 0.6 },
                    ]}
                  />
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subLabel}>{t("suivi.weight_kg")}</Text>
                  <TextInput
                    value={weightKg}
                    onChangeText={setWeightKg}
                    keyboardType="decimal-pad"
                    placeholder="62"
                    placeholderTextColor={aqaColors.textLight}
                    style={styles.input}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subLabel}>{t("suivi.height_cm")}</Text>
                  <TextInput
                    value={heightCm}
                    onChangeText={setHeightCm}
                    keyboardType="decimal-pad"
                    placeholder="172"
                    placeholderTextColor={aqaColors.textLight}
                    style={styles.input}
                  />
                </View>
              </View>
            </AqaDoubleBezelCard>

            {/* 3. Official 15 Badges Picker + Honor Nominations */}
            <AqaDoubleBezelCard padding={15}>
              <Text style={styles.cardTitle}>
                Choix du Badge Officiel AQA (15 Badges)
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, marginTop: 10 }}
              >
                {AQA_OFFICIAL_BADGES.map((badge) => {
                  const selected = selectedBadgeKey === badge.key;
                  return (
                    <Pressable
                      key={badge.key}
                      onPress={() =>
                        setSelectedBadgeKey(selected ? null : badge.key)
                      }
                      style={[
                        styles.badgeCard,
                        selected && styles.badgeCardActive,
                      ]}
                    >
                      <Image
                        source={getBadgeImageSource(badge.asset)}
                        style={styles.badgeImg}
                        resizeMode="contain"
                      />
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.badgeCardLabel,
                          selected && { color: aqaColors.accent },
                        ]}
                      >
                        {getBadgeLabel(badge, locale)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                <Pressable
                  disabled={monthHonorLocked}
                  onPress={() =>
                    setHonorRequestType(
                      honorRequestType === "swimmer_of_the_month"
                        ? null
                        : "swimmer_of_the_month"
                    )
                  }
                  style={[
                    styles.honorToggle,
                    honorRequestType === "swimmer_of_the_month" &&
                      styles.honorToggleActive,
                    monthHonorLocked && { opacity: 0.5 },
                  ]}
                >
                  <Text style={styles.honorTitle}>{t("suivi.honor_month")}</Text>
                  <Text style={styles.honorSub}>
                    {monthHonorLocked
                      ? monthHonorWinner
                        ? `Elu: ${monthHonorWinner}`
                        : "Verrouille"
                      : honorRequestType === "swimmer_of_the_month"
                      ? "Demande prete pour ERP"
                      : "Proposer a l'ERP"}
                  </Text>
                </Pressable>

                <Pressable
                  disabled={yearHonorLocked}
                  onPress={() =>
                    setHonorRequestType(
                      honorRequestType === "swimmer_of_the_year"
                        ? null
                        : "swimmer_of_the_year"
                    )
                  }
                  style={[
                    styles.honorToggle,
                    honorRequestType === "swimmer_of_the_year" &&
                      styles.honorToggleActive,
                    yearHonorLocked && { opacity: 0.5 },
                  ]}
                >
                  <Text style={styles.honorTitle}>{t("suivi.honor_year")}</Text>
                  <Text style={styles.honorSub}>
                    {yearHonorLocked
                      ? yearHonorWinner
                        ? `Elu: ${yearHonorWinner}`
                        : "Verrouille"
                      : honorRequestType === "swimmer_of_the_year"
                      ? "Demande prete pour ERP"
                      : "Proposer a l'ERP"}
                  </Text>
                </Pressable>
              </View>
            </AqaDoubleBezelCard>

            {/* 4. Word from Coach & Observation */}
            <AqaDoubleBezelCard padding={15}>
              <Text style={styles.cardTitle}>{t("suivi.word_from_coach")}</Text>
              <TextInput
                value={wordFromCoach}
                onChangeText={setWordFromCoach}
                multiline
                placeholder="Redigez le mot du coach pour ce nageur..."
                placeholderTextColor={aqaColors.textLight}
                style={[styles.input, { minHeight: 72, marginTop: 8 }]}
              />

              <Text style={[styles.cardTitle, { marginTop: 12 }]}>
                {t("suivi.observation")}
              </Text>
              <TextInput
                value={observation}
                onChangeText={setObservation}
                multiline
                placeholder="Observation technique de la seance..."
                placeholderTextColor={aqaColors.textLight}
                style={[styles.input, { minHeight: 60, marginTop: 8 }]}
              />
            </AqaDoubleBezelCard>
          </>
        )}
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        {currentStep === 1 ? (
          <AqaIslandButton
            label="Retour Evaluation"
            compact
            secondary
            onPress={() => setCurrentStep(0)}
          />
        ) : null}
        {currentStep === 0 ? (
          <AqaIslandButton
            label="Suivant : 2. Bilan & Badges"
            onPress={() => setCurrentStep(1)}
            style={{ flex: 1 }}
          />
        ) : (
          <AqaIslandButton
            label={saving ? t("common.saving") : "Valider Evaluation & Bilan"}
            loading={saving}
            success
            onPress={handleSave}
            style={{ flex: 1 }}
          />
        )}
      </View>
    </AqaAmbientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#060B16",
    borderBottomWidth: 1,
    borderBottomColor: aqaColors.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
  headerSub: {
    color: aqaColors.accent,
    fontSize: 11,
    fontWeight: "700",
  },
  container: {
    padding: 16,
    gap: 12,
    paddingBottom: 110,
  },
  strokeSelectorChip: {
    backgroundColor: "#060B16",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  strokeSelectorChipActive: {
    backgroundColor: "rgba(14, 165, 233, 0.18)",
    borderColor: aqaColors.primaryHover,
  },
  strokeSelectorText: {
    color: aqaColors.textMuted,
    fontSize: 11,
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
  cumulBadge: {
    color: aqaColors.accent,
    fontSize: 12,
    fontWeight: "900",
  },
  lockedHint: {
    color: aqaColors.warning,
    fontSize: 11.5,
    marginTop: 6,
  },
  subLabel: {
    color: aqaColors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
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
  badgeCard: {
    width: 92,
    backgroundColor: "#060B16",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    padding: 9,
    alignItems: "center",
    gap: 6,
  },
  badgeCardActive: {
    backgroundColor: "rgba(0, 242, 255, 0.16)",
    borderColor: aqaColors.accent,
  },
  badgeImg: {
    width: 40,
    height: 40,
  },
  badgeCardLabel: {
    color: aqaColors.textMuted,
    fontSize: 10,
    fontWeight: "800",
  },
  honorToggle: {
    flex: 1,
    backgroundColor: "#060B16",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    padding: 11,
  },
  honorToggleActive: {
    backgroundColor: "rgba(245, 158, 11, 0.16)",
    borderColor: aqaColors.warning,
  },
  honorTitle: {
    color: aqaColors.textPrimary,
    fontSize: 12,
    fontWeight: "800",
  },
  honorSub: {
    color: aqaColors.textMuted,
    fontSize: 10,
    marginTop: 3,
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
});

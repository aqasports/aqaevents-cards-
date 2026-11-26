import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { coachApiClient } from "../../src/api/client";
import {
  AqaAmbientBackground,
  AqaDoubleBezelCard,
  AqaIslandButton,
  AqaSectionHeader,
  AqaScreenHeader,
} from "../../src/components/AqaUi";
import { useCoachStore } from "../../src/state/CoachStore";
import { aqaColors } from "../../src/theme/tokens";

const REASONS = [
  { key: "Personal", labelFr: "Personnel", labelEn: "Personal", labelAr: "شخصي" },
  {
    key: "Sickness",
    labelFr: "Maladie / Medical",
    labelEn: "Medical / Sickness",
    labelAr: "صحي / عطلة مرضية",
  },
  {
    key: "Competition",
    labelFr: "Competition Officielle",
    labelEn: "Official Competition",
    labelAr: "منافسة رسمية",
  },
  {
    key: "Training / Seminar",
    labelFr: "Formation / Stage AQA",
    labelEn: "AQA Coaching Seminar",
    labelAr: "تربص / دورة تكوينية",
  },
  {
    key: "Other",
    labelFr: "Autre motif",
    labelEn: "Other Reason",
    labelAr: "سبب آخر",
  },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** One selectable chip: 44pt tall, announced as a radio option with its checked state. */
function OptionChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.optionChip,
        active && styles.optionChipActive,
        pressed && { opacity: 0.82 },
      ]}
    >
      {active ? (
        <Ionicons name="checkmark" size={16} color={aqaColors.accent} accessible={false} />
      ) : null}
      <Text style={[styles.optionChipText, active && { color: aqaColors.accent }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function RequestAbsenceScreen() {
  const router = useRouter();
  const { bootstrap, user, t, locale, refreshWorkspace } = useCoachStore();

  const today = (bootstrap?.todayDate || new Date().toISOString().slice(0, 10)).slice(
    0,
    10
  );
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [reason, setReason] = useState("Personal");
  const [substituteCoachId, setSubstituteCoachId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Errors show only after the coach has tried to submit, then update live.
  const [attempted, setAttempted] = useState(false);

  const currentCoachId = user?.coachId || user?.id || "";
  const colleagues = (bootstrap?.allCoaches ?? []).filter(
    (c) => c.id !== currentCoachId && c.role !== "assistant"
  );

  const startError = !isValidIsoDate(startDate) ? t("absence.date_format_error") : null;
  const endError = !isValidIsoDate(endDate)
    ? t("absence.date_format_error")
    : !startError && endDate < startDate
    ? t("absence.end_before_start")
    : null;
  const formValid = !startError && !endError;

  const handleSubmit = async () => {
    if (submitting) return;
    setAttempted(true);
    if (!formValid) return;
    setSubmitting(true);
    try {
      await coachApiClient.declareAbsence({
        startDate,
        endDate,
        reason,
        notes: notes.trim(),
        ...(substituteCoachId ? { substituteCoachId } : {}),
      });
      await refreshWorkspace();
      router.back();
    } catch (err) {
      Alert.alert(
        t("common.error"),
        err instanceof Error ? err.message : t("common.error")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const showStartError = attempted && startError;
  const showEndError = attempted && endError;

  return (
    <AqaAmbientBackground>
      <AqaScreenHeader title={t("replacements.declare_absence")} />

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <AqaDoubleBezelCard padding={16}>
          <AqaSectionHeader
            eyebrow={t("absence.period_eyebrow")}
            title={t("absence.period_title")}
            subtitle={t("absence.period_subtitle")}
          />
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel} nativeID="absenceStartLabel">
                {t("replacements.start_date")}
              </Text>
              <TextInput
                value={startDate}
                onChangeText={setStartDate}
                accessibilityLabel={t("replacements.start_date")}
                accessibilityLabelledBy="absenceStartLabel"
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                autoCorrect={false}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={aqaColors.textLight}
                style={[styles.input, showStartError ? styles.inputError : null]}
              />
              {showStartError ? (
                <Text style={styles.fieldError} accessibilityLiveRegion="polite">
                  {startError}
                </Text>
              ) : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel} nativeID="absenceEndLabel">
                {t("replacements.end_date")}
              </Text>
              <TextInput
                value={endDate}
                onChangeText={setEndDate}
                accessibilityLabel={t("replacements.end_date")}
                accessibilityLabelledBy="absenceEndLabel"
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                autoCorrect={false}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={aqaColors.textLight}
                style={[styles.input, showEndError ? styles.inputError : null]}
              />
              {showEndError ? (
                <Text style={styles.fieldError} accessibilityLiveRegion="polite">
                  {endError}
                </Text>
              ) : null}
            </View>
          </View>
        </AqaDoubleBezelCard>

        <AqaDoubleBezelCard padding={16}>
          <AqaSectionHeader
            eyebrow={t("absence.substitute_eyebrow")}
            title={t("absence.substitute_title")}
            subtitle={t("absence.substitute_subtitle")}
          />
          <View style={styles.chipWrap} accessibilityRole="radiogroup">
            <OptionChip
              label={t("absence.open_broadcast")}
              active={!substituteCoachId}
              onPress={() => setSubstituteCoachId("")}
            />
            {colleagues.map((c) => (
              <OptionChip
                key={c.id}
                label={c.name}
                active={substituteCoachId === c.id}
                onPress={() => setSubstituteCoachId(substituteCoachId === c.id ? "" : c.id)}
              />
            ))}
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
            {t("replacements.reason")}
          </Text>
          <View style={styles.chipWrap} accessibilityRole="radiogroup">
            {REASONS.map((r) => (
              <OptionChip
                key={r.key}
                label={locale === "ar" ? r.labelAr : locale === "en" ? r.labelEn : r.labelFr}
                active={reason === r.key}
                onPress={() => setReason(r.key)}
              />
            ))}
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 16 }]} nativeID="absenceNotesLabel">
            {t("replacements.details")}
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            accessibilityLabel={t("replacements.details")}
            accessibilityLabelledBy="absenceNotesLabel"
            multiline
            placeholder={t("absence.notes_placeholder")}
            placeholderTextColor={aqaColors.textLight}
            style={[styles.input, { minHeight: 96, textAlignVertical: "top" }]}
          />
        </AqaDoubleBezelCard>

        {attempted && !formValid ? (
          <View style={styles.formErrorBanner} accessibilityRole="alert">
            <Ionicons name="alert-circle" size={20} color={aqaColors.dangerText} accessible={false} />
            <Text style={styles.formErrorText}>{t("absence.fix_errors")}</Text>
          </View>
        ) : null}

        <AqaIslandButton
          label={
            submitting ? t("common.saving") : t("replacements.submit_absence")
          }
          icon="send"
          loading={submitting}
          onPress={handleSubmit}
        />
      </ScrollView>
    </AqaAmbientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 14,
    paddingBottom: 90,
  },
  fieldLabel: {
    color: aqaColors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#060B16",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    color: aqaColors.textPrimary,
    paddingHorizontal: 12,
    minHeight: 48,
    paddingVertical: 10,
    fontSize: 16,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  optionChip: {
    backgroundColor: "#060B16",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    paddingHorizontal: 12,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  optionChipActive: {
    backgroundColor: "rgba(0, 242, 255, 0.16)",
    borderColor: aqaColors.accent,
  },
  optionChipText: {
    color: aqaColors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  inputError: {
    borderColor: "rgba(248, 113, 113, 0.7)",
  },
  fieldError: {
    color: aqaColors.dangerText,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
  },
  formErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239, 68, 68, 0.14)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.45)",
    padding: 12,
  },
  formErrorText: {
    flex: 1,
    color: aqaColors.dangerText,
    fontSize: 14,
    fontWeight: "700",
  },
});

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
import { coachApiClient } from "../../src/api/client";
import {
  AqaAmbientBackground,
  AqaDoubleBezelCard,
  AqaIslandButton,
  AqaSectionHeader,
  LanguageSwitcherPill,
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

  const currentCoachId = user?.coachId || user?.id || "";
  const colleagues = (bootstrap?.allCoaches ?? []).filter(
    (c) => c.id !== currentCoachId && c.role !== "assistant"
  );

  const handleSubmit = async () => {
    if (submitting) return;
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

  return (
    <AqaAmbientBackground>
      <View style={styles.topHeader}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{"<"}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>
          {t("replacements.declare_absence")}
        </Text>
        <LanguageSwitcherPill compact />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <AqaDoubleBezelCard padding={16}>
          <AqaSectionHeader
            eyebrow="PERIODE D'ABSENCE"
            title="Dates de debut et de fin"
            subtitle="Selectionnez les dates de vos seances a couvrir"
          />
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>
                {t("replacements.start_date")}
              </Text>
              <TextInput
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={aqaColors.textLight}
                style={styles.input}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>{t("replacements.end_date")}</Text>
              <TextInput
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={aqaColors.textLight}
                style={styles.input}
              />
            </View>
          </View>
        </AqaDoubleBezelCard>

        <AqaDoubleBezelCard padding={16}>
          <AqaSectionHeader
            eyebrow="COACH REMPLACANT SOUHAITE"
            title="Diffusion ou Collegue"
            subtitle="Choisissez un collegue ou laissez en diffusion ouverte"
          />
          <View style={styles.chipWrap}>
            <Pressable
              onPress={() => setSubstituteCoachId("")}
              style={[
                styles.optionChip,
                !substituteCoachId && styles.optionChipActive,
              ]}
            >
              <Text
                style={[
                  styles.optionChipText,
                  !substituteCoachId && { color: aqaColors.accent },
                ]}
              >
                Diffusion ouverte (Tous les coachs / Head Coach)
              </Text>
            </Pressable>
            {colleagues.map((c) => {
              const active = substituteCoachId === c.id;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setSubstituteCoachId(active ? "" : c.id)}
                  style={[styles.optionChip, active && styles.optionChipActive]}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      active && { color: aqaColors.accent },
                    ]}
                  >
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
            {t("replacements.reason")}
          </Text>
          <View style={styles.chipWrap}>
            {REASONS.map((r) => {
              const active = reason === r.key;
              const label =
                locale === "ar"
                  ? r.labelAr
                  : locale === "en"
                  ? r.labelEn
                  : r.labelFr;
              return (
                <Pressable
                  key={r.key}
                  onPress={() => setReason(r.key)}
                  style={[styles.optionChip, active && styles.optionChipActive]}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      active && { color: aqaColors.accent },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
            {t("replacements.details")}
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="Programme prevu pour les groupes, consignes..."
            placeholderTextColor={aqaColors.textLight}
            style={[styles.input, { minHeight: 82 }]}
          />
        </AqaDoubleBezelCard>

        <AqaIslandButton
          label={
            submitting ? t("common.saving") : t("replacements.submit_absence")
          }
          loading={submitting}
          onPress={handleSubmit}
        />
      </ScrollView>
    </AqaAmbientBackground>
  );
}

const styles = StyleSheet.create({
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
    flex: 1,
    color: aqaColors.textPrimary,
    fontSize: 15.5,
    fontWeight: "800",
  },
  container: {
    padding: 16,
    gap: 14,
    paddingBottom: 90,
  },
  fieldLabel: {
    color: aqaColors.textMuted,
    fontSize: 11.5,
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
    paddingVertical: 10,
    fontSize: 13.5,
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
    paddingVertical: 8,
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
});

import React from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  AQA_OFFICIAL_BADGES,
  AQA_PEDAGOGICAL_STAGES,
  getBadgeImageSource,
  getBadgeLabel,
  getStageLabel,
} from "../src/assets/badges";
import {
  AqaAmbientBackground,
  AqaDoubleBezelCard,
  AqaSectionHeader,
  AqaScreenHeader,
} from "../src/components/AqaUi";
import { useCoachStore } from "../src/state/CoachStore";
import { aqaColors } from "../src/theme/tokens";

export default function TeachingSupportScreen() {
  const { locale, t } = useCoachStore();

  return (
    <AqaAmbientBackground>
      <AqaScreenHeader title={t("profile.support_title")} />

      <ScrollView contentContainerStyle={styles.container}>
        <AqaDoubleBezelCard glowEffect padding={16}>
          <AqaSectionHeader
            eyebrow={t("guide.eyebrow")}
            title={t("guide.method_title")}
            subtitle={t("guide.method_subtitle")}
          />
          <Text style={styles.bodyText}>
            {`• ${t("guide.zone_tech")}\n• ${t("guide.zone_elite")}`}
          </Text>
        </AqaDoubleBezelCard>

        <AqaDoubleBezelCard padding={16}>
          <AqaSectionHeader
            eyebrow={t("guide.stages_eyebrow")}
            title={t("guide.stages_title")}
          />
          <View style={{ gap: 10, marginTop: 12 }}>
            {AQA_PEDAGOGICAL_STAGES.map((stage) => (
              <View key={stage.key} style={styles.stageRow}>
                <Image
                  source={getBadgeImageSource(stage.asset)}
                  style={styles.stageImg}
                  resizeMode="contain"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.stageTitle}>
                    {getStageLabel(stage, locale)}
                  </Text>
                  <Text style={styles.stageDesc}>
                    {t("guide.stage_desc", { order: stage.order })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </AqaDoubleBezelCard>

        <AqaDoubleBezelCard padding={16}>
          <AqaSectionHeader
            eyebrow={t("guide.badges_eyebrow")}
            title={t("guide.badges_title")}
          />
          <View style={styles.badgeGrid}>
            {AQA_OFFICIAL_BADGES.map((badge) => (
              <View key={badge.key} style={styles.badgeCell}>
                <Image
                  source={getBadgeImageSource(badge.asset)}
                  style={styles.badgeImg}
                  resizeMode="contain"
                />
                <Text numberOfLines={1} style={styles.badgeName}>
                  {getBadgeLabel(badge, locale)}
                </Text>
              </View>
            ))}
          </View>
        </AqaDoubleBezelCard>
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
  bodyText: {
    color: aqaColors.textPrimary,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 10,
  },
  stageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#060B16",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    padding: 10,
  },
  stageImg: {
    width: 36,
    height: 36,
  },
  stageTitle: {
    color: aqaColors.textPrimary,
    fontSize: 13.5,
    fontWeight: "800",
  },
  stageDesc: {
    color: aqaColors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  badgeCell: {
    width: "31%",
    backgroundColor: "#060B16",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    padding: 10,
    alignItems: "center",
    gap: 5,
  },
  badgeImg: {
    width: 38,
    height: 38,
  },
  badgeName: {
    color: aqaColors.textPrimary,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
});

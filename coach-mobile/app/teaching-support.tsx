import React from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
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
  LanguageSwitcherPill,
} from "../src/components/AqaUi";
import { useCoachStore } from "../src/state/CoachStore";
import { aqaColors } from "../src/theme/tokens";

export default function TeachingSupportScreen() {
  const router = useRouter();
  const { locale, t } = useCoachStore();

  return (
    <AqaAmbientBackground>
      <View style={styles.topHeader}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{"<"}</Text>
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>
          {t("profile.support_title")}
        </Text>
        <LanguageSwitcherPill compact />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <AqaDoubleBezelCard glowEffect padding={16}>
          <AqaSectionHeader
            eyebrow="GUIDE OFFICIEL AQA SWIM"
            title="Methodologie d'Evaluation (0% a 200%)"
            subtitle="Architecture pedagogique standardisee AQA Sports"
          />
          <Text style={styles.bodyText}>
            • 0% a 100% (Zone Technique) : Acquisition progressive de la
            motricite aquatique, respiration, flottaison et coordination du
            style de nage.{"\n"}• 100% a 200% (Zone Elite) : Perfectionnement de
            l'endurance, vitesse chronometrique, puissance propulsive et
            competition.
          </Text>
        </AqaDoubleBezelCard>

        <AqaDoubleBezelCard padding={16}>
          <AqaSectionHeader
            eyebrow="LES 6 PALIERS PEDAGOGIQUES"
            title="Parcours de Progression"
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
                    Palier #{stage.order} du referentiel technique AQA Swim
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </AqaDoubleBezelCard>

        <AqaDoubleBezelCard padding={16}>
          <AqaSectionHeader
            eyebrow="15 BADGES OFFICIELS AQA"
            title="Catalogue des Distinctions"
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
  bodyText: {
    color: aqaColors.textPrimary,
    fontSize: 13,
    lineHeight: 20,
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
    fontSize: 11.5,
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
    fontSize: 9.5,
    fontWeight: "800",
    textAlign: "center",
  },
});

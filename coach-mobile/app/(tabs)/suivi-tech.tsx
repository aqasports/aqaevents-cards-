import React, { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import {
  AQA_PEDAGOGICAL_STAGES,
  AQA_STROKE_BARS,
  getBadgeImageSource,
  getStageLabel,
  getStrokeBarShortLabel,
} from "../../src/assets/badges";
import {
  AqaAmbientBackground,
  AqaDoubleBezelCard,
  AqaIslandButton,
  AqaNewClientBadge,
  AqaSectionHeader,
} from "../../src/components/AqaUi";
import { useCoachStore } from "../../src/state/CoachStore";
import { aqaColors } from "../../src/theme/tokens";

export default function SuiviTechHubScreen() {
  const router = useRouter();
  const { bootstrap, isRefreshing, refreshWorkspace, locale, t } =
    useCoachStore();

  const [selectedStage, setSelectedStage] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const swimmers = bootstrap?.swimmers ?? [];

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: swimmers.length };
    for (const st of AQA_PEDAGOGICAL_STAGES) {
      counts[st.key] = 0;
    }
    for (const s of swimmers) {
      const k = s.stageKey || "basics";
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return counts;
  }, [swimmers]);

  const categories = useMemo(() => {
    const cats = Array.from(
      new Set(
        swimmers.map((s) => s.category.trim().toUpperCase()).filter(Boolean)
      )
    );
    return ["ALL", ...cats];
  }, [swimmers]);

  const filteredSwimmers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return swimmers.filter((s) => {
      const stageMatch =
        selectedStage === "ALL" || s.stageKey === selectedStage;
      const catMatch =
        selectedCategory === "ALL" ||
        s.category.trim().toUpperCase() === selectedCategory;
      const queryMatch =
        !q ||
        s.fullName.toLowerCase().includes(q) ||
        s.swimId.toLowerCase().includes(q) ||
        s.badgeLabel.toLowerCase().includes(q) ||
        (s.groupName ?? "").toLowerCase().includes(q);
      return stageMatch && catMatch && queryMatch;
    });
  }, [searchQuery, selectedCategory, selectedStage, swimmers]);

  return (
    <AqaAmbientBackground>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshWorkspace}
            tintColor={aqaColors.accent}
          />
        }
      >
        <AqaSectionHeader
          eyebrow="AQA SWIM PEDAGOGIE (6 PALIERS • 15 BADGES)"
          title={t("suivi.title")}
          subtitle={`${filteredSwimmers.length} / ${swimmers.length} ${
            locale === "ar" ? "سباح" : "nageurs"
          }`}
        />

        {/* 6 Pedagogical Stages Mascot Filter Strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stageStrip}
        >
          <Pressable
            onPress={() => setSelectedStage("ALL")}
            style={[
              styles.stageCard,
              selectedStage === "ALL" && styles.stageCardActive,
            ]}
          >
            <View style={styles.stageCountCircle}>
              <Text style={styles.stageCountCircleText}>
                {stageCounts.ALL ?? 0}
              </Text>
            </View>
            <Text
              style={[
                styles.stageCardTitle,
                selectedStage === "ALL" && { color: aqaColors.accent },
              ]}
            >
              {locale === "ar" ? "الكل" : "TOUS"}
            </Text>
          </Pressable>

          {AQA_PEDAGOGICAL_STAGES.map((stage) => {
            const active = selectedStage === stage.key;
            const count = stageCounts[stage.key] ?? 0;
            return (
              <Pressable
                key={stage.key}
                onPress={() =>
                  setSelectedStage(active ? "ALL" : stage.key)
                }
                style={[styles.stageCard, active && styles.stageCardActive]}
              >
                <Image
                  source={getBadgeImageSource(stage.asset)}
                  style={styles.stageMascotImg}
                  resizeMode="contain"
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.stageCardTitle,
                    active && { color: aqaColors.accent },
                  ]}
                >
                  {getStageLabel(stage, locale)}
                </Text>
                <Text style={styles.stageCardCount}>{count} nageurs</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Search Input */}
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t("common.search")}
          placeholderTextColor={aqaColors.textLight}
          style={styles.searchInput}
        />

        {/* Sector Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catStrip}
        >
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[styles.catChip, active && styles.catChipActive]}
              >
                <Text
                  style={[
                    styles.catChipText,
                    active && { color: aqaColors.accent },
                  ]}
                >
                  {cat === "ALL" ? t("common.all_sectors") : cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Swimmers Dossier Cards */}
        {filteredSwimmers.map((member) => (
          <AqaDoubleBezelCard
            key={member.id}
            padding={14}
            onPress={() => router.push(`/members/${member.id}`)}
          >
            <View style={styles.memberTopRow}>
              {/* Badge + Stage Mascot Overlay */}
              <View style={styles.avatarStack}>
                <View style={styles.badgeAvatarBox}>
                  <Image
                    source={getBadgeImageSource(member.badgeAsset)}
                    style={styles.badgeAvatarImg}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.stageMiniBadge}>
                  <Image
                    source={getBadgeImageSource(member.stageAsset)}
                    style={{ width: 16, height: 16 }}
                    resizeMode="contain"
                  />
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text numberOfLines={1} style={styles.memberName}>
                    {member.fullName}
                  </Text>
                  {member.isNewClient ? <AqaNewClientBadge compact /> : null}
                </View>

                <Text numberOfLines={1} style={styles.memberMeta}>
                  {member.groupName || member.category.toUpperCase()} •{" "}
                  {member.stageLabel}
                </Text>

                <View style={styles.pillRow}>
                  <View style={styles.badgeTag}>
                    <Text style={styles.badgeTagText}>
                      {member.badgeLabel.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.volumeTag}>
                    <Text style={styles.volumeTagText}>
                      {member.totalDistanceMeters} m
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.rateTagText,
                      {
                        color:
                          member.attendanceRate >= 75
                            ? aqaColors.success
                            : aqaColors.warning,
                      },
                    ]}
                  >
                    {member.attendanceRate}%
                  </Text>
                </View>
              </View>
            </View>

            {/* 5-Stroke Mini Progress Matrix (0-200%) */}
            <View style={styles.barsMiniGrid}>
              {AQA_STROKE_BARS.map((def) => {
                const pct = member.bars[def.key] ?? 0;
                const isElite = pct > 100;
                const fillPct = Math.min(100, Math.round(pct / 2));
                return (
                  <View key={def.key} style={styles.barMiniCol}>
                    <View style={styles.barMiniHeader}>
                      <Text numberOfLines={1} style={styles.barMiniLabel}>
                        {getStrokeBarShortLabel(def, locale)}
                      </Text>
                      <Text
                        style={[
                          styles.barMiniValue,
                          {
                            color: isElite
                              ? aqaColors.warning
                              : aqaColors.accent,
                          },
                        ]}
                      >
                        {pct}%
                      </Text>
                    </View>
                    <View style={styles.barMiniTrack}>
                      <View
                        style={[
                          styles.barMiniFill,
                          {
                            width: `${fillPct}%`,
                            backgroundColor: isElite
                              ? aqaColors.warning
                              : aqaColors.accent,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Quick Actions: Dossier & Evaluation */}
            <View style={styles.cardActionsRow}>
              <AqaIslandButton
                label="Dossier & Radar"
                compact
                secondary
                onPress={() => router.push(`/members/${member.id}`)}
                style={{ flex: 1 }}
              />
              <AqaIslandButton
                label="Evaluer (0-200%)"
                compact
                onPress={() => router.push(`/members/${member.id}/review`)}
                style={{ flex: 1 }}
              />
            </View>
          </AqaDoubleBezelCard>
        ))}
      </ScrollView>
    </AqaAmbientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
    paddingBottom: 110,
  },
  stageStrip: {
    gap: 8,
    paddingVertical: 4,
  },
  stageCard: {
    width: 96,
    backgroundColor: "#080E1E",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  stageCardActive: {
    backgroundColor: "#13223D",
    borderColor: aqaColors.accent,
  },
  stageCountCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0, 242, 255, 0.14)",
    borderWidth: 1,
    borderColor: aqaColors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  stageCountCircleText: {
    color: aqaColors.accent,
    fontSize: 13,
    fontWeight: "900",
  },
  stageMascotImg: {
    width: 34,
    height: 34,
  },
  stageCardTitle: {
    color: aqaColors.textPrimary,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  stageCardCount: {
    color: aqaColors.textMuted,
    fontSize: 9.5,
    fontWeight: "700",
  },
  searchInput: {
    backgroundColor: "#060B16",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    color: aqaColors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13.5,
  },
  catStrip: {
    gap: 8,
  },
  catChip: {
    backgroundColor: "#080E1E",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  catChipActive: {
    backgroundColor: "#13223D",
    borderColor: aqaColors.accent,
  },
  catChipText: {
    color: aqaColors.textMuted,
    fontSize: 11,
    fontWeight: "800",
  },
  memberTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarStack: {
    width: 56,
    height: 56,
    position: "relative",
  },
  badgeAvatarBox: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: "#060B16",
    borderWidth: 1,
    borderColor: "rgba(0, 242, 255, 0.35)",
    padding: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeAvatarImg: {
    width: "100%",
    height: "100%",
  },
  stageMiniBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#0B1120",
    borderWidth: 1,
    borderColor: aqaColors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  memberName: {
    flex: 1,
    color: aqaColors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  memberMeta: {
    color: aqaColors.textMuted,
    fontSize: 11.5,
    marginTop: 2,
  },
  pillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  badgeTag: {
    backgroundColor: "rgba(14, 165, 233, 0.16)",
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeTagText: {
    color: aqaColors.primaryHover,
    fontSize: 9.5,
    fontWeight: "900",
  },
  volumeTag: {
    backgroundColor: "rgba(0, 242, 255, 0.14)",
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  volumeTagText: {
    color: aqaColors.accent,
    fontSize: 9.5,
    fontWeight: "900",
  },
  rateTagText: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  barsMiniGrid: {
    flexDirection: "row",
    gap: 6,
    marginTop: 12,
    backgroundColor: "#060B16",
    borderRadius: 10,
    padding: 8,
  },
  barMiniCol: {
    flex: 1,
    gap: 4,
  },
  barMiniHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  barMiniLabel: {
    color: aqaColors.textMuted,
    fontSize: 8.5,
    fontWeight: "800",
  },
  barMiniValue: {
    fontSize: 8.5,
    fontWeight: "900",
  },
  barMiniTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: "#1E293B",
    overflow: "hidden",
  },
  barMiniFill: {
    height: "100%",
    borderRadius: 999,
  },
  cardActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
});

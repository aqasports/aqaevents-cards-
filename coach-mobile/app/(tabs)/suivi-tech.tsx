import React, { useCallback, useMemo, useState } from "react";
import {
  Image,
  Platform,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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
import type { CoachBootstrapPayload } from "../../src/contract";
import type { SupportedLocale } from "../../src/i18n/translations";
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

  const openFile = useCallback((id: string) => router.push(`/members/${id}`), [router]);
  const openEvaluate = useCallback(
    (id: string) => router.push(`/members/${id}/review`),
    [router]
  );

  // Passed as an element (not a component) so the search field keeps focus while typing.
  const listHeader = (
    <View style={{ gap: 12, marginBottom: 12 }}>
        <AqaSectionHeader
          eyebrow={t("suivi.eyebrow")}
          title={t("suivi.title")}
          subtitle={t("suivi.count", {
            shown: filteredSwimmers.length,
            total: swimmers.length,
          })}
        />

        {/* 6 Pedagogical Stages Mascot Filter Strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stageStrip}
          accessibilityRole="radiogroup"
          accessibilityLabel={t("suivi.stage_filter")}
        >
          <Pressable
            onPress={() => setSelectedStage("ALL")}
            accessibilityRole="radio"
            accessibilityState={{ checked: selectedStage === "ALL" }}
            accessibilityLabel={`${t("suivi.all")}, ${t("suivi.swimmers", { count: stageCounts.ALL ?? 0 })}`}
            style={({ pressed }) => [
              styles.stageCard,
              selectedStage === "ALL" && styles.stageCardActive,
              pressed && { opacity: 0.82 },
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
              {t("suivi.all")}
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
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                accessibilityLabel={`${getStageLabel(stage, locale)}, ${t("suivi.swimmers", { count })}`}
                style={({ pressed }) => [
                  styles.stageCard,
                  active && styles.stageCardActive,
                  pressed && { opacity: 0.82 },
                ]}
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
                <Text style={styles.stageCardCount}>{t("suivi.swimmers", { count })}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Search Input */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={20} color={aqaColors.textMuted} accessible={false} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t("common.search")}
            placeholderTextColor={aqaColors.textLight}
            accessibilityLabel={t("common.search")}
            returnKeyType="search"
            autoCorrect={false}
            style={styles.searchInput}
          />
          {searchQuery ? (
            <Pressable
              onPress={() => setSearchQuery("")}
              accessibilityRole="button"
              accessibilityLabel={t("common.clear_search")}
              hitSlop={8}
              style={styles.searchClear}
            >
              <Ionicons name="close-circle" size={20} color={aqaColors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {/* Sector Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catStrip}
          accessibilityRole="radiogroup"
        >
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                style={({ pressed }) => [
                  styles.catChip,
                  active && styles.catChipActive,
                  pressed && { opacity: 0.82 },
                ]}
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
    </View>
  );

  return (
    <AqaAmbientBackground>
      {/* Virtualized: only the swimmer cards on screen are rendered, so a club-wide
          roster of several hundred swimmers scrolls smoothly. */}
      <FlatList
        data={filteredSwimmers}
        keyExtractor={(member) => member.id}
        renderItem={({ item }) => (
          <SwimmerCard
            member={item}
            locale={locale}
            t={t}
            onOpenFile={openFile}
            onEvaluate={openEvaluate}
          />
        )}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={<SuiviEmptyState t={t} />}
        ItemSeparatorComponent={ListGap}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        // Safe on Android; on iOS it can leave blank rows, so it stays off there.
        removeClippedSubviews={Platform.OS === "android"}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshWorkspace}
            tintColor={aqaColors.accent}
          />
        }
      />
    </AqaAmbientBackground>
  );
}

type Swimmer = NonNullable<CoachBootstrapPayload["swimmers"]>[number];
type Translate = (key: string, params?: Record<string, string | number>) => string;

function ListGap() {
  return <View style={{ height: 12 }} />;
}

function SuiviEmptyState({ t }: { t: Translate }) {
  return (
    <AqaDoubleBezelCard padding={28}>
      <View style={{ alignItems: "center", gap: 10 }}>
        <Ionicons name="search-outline" size={36} color={aqaColors.textLight} accessible={false} />
        <Text style={styles.emptyText}>{t("suivi.empty")}</Text>
      </View>
    </AqaDoubleBezelCard>
  );
}

/** One swimmer card. Memoized so typing in the search box does not re-render every row. */
const SwimmerCard = React.memo(function SwimmerCard({
  member,
  locale,
  t,
  onOpenFile,
  onEvaluate,
}: {
  member: Swimmer;
  locale: SupportedLocale;
  t: Translate;
  onOpenFile: (id: string) => void;
  onEvaluate: (id: string) => void;
}) {
  return (
    <AqaDoubleBezelCard padding={14}>
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
      <View
        style={styles.barsMiniGrid}
        accessible
        accessibilityLabel={AQA_STROKE_BARS.map(
          (def) => `${getStrokeBarShortLabel(def, locale)} ${member.bars[def.key] ?? 0}%`
        ).join(", ")}
      >
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
          label={t("suivi.open_file")}
          icon="document-text-outline"
          accessibilityLabel={`${t("suivi.open_file")}: ${member.fullName}`}
          compact
          secondary
          onPress={() => onOpenFile(member.id)}
          style={{ flex: 1 }}
        />
        <AqaIslandButton
          label={t("member.evaluate")}
          icon="create-outline"
          accessibilityLabel={`${t("member.evaluate")}: ${member.fullName}`}
          compact
          onPress={() => onEvaluate(member.id)}
          style={{ flex: 1 }}
        />
      </View>
    </AqaDoubleBezelCard>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 24,
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
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  stageCardCount: {
    color: aqaColors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  searchInput: {
    backgroundColor: "transparent",
    borderWidth: 0,
    color: aqaColors.textPrimary,
    paddingHorizontal: 0,
    paddingVertical: 0,
    fontSize: 16,
    flex: 1,
    minHeight: 48,
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
    minHeight: 44,
    justifyContent: "center",
  },
  catChipActive: {
    backgroundColor: "#13223D",
    borderColor: aqaColors.accent,
  },
  catChipText: {
    color: aqaColors.textMuted,
    fontSize: 12,
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
    fontSize: 12,
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
    fontSize: 12,
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
    fontSize: 12,
    fontWeight: "900",
  },
  rateTagText: {
    fontSize: 12,
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
    fontSize: 12,
    fontWeight: "800",
  },
  barMiniValue: {
    fontSize: 12,
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
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#060B16",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    paddingHorizontal: 12,
  },
  searchClear: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: aqaColors.textMuted,
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
  },
});

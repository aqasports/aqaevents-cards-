import React, { useMemo, useState } from "react";
import {
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
  AqaAmbientBackground,
  AqaDoubleBezelCard,
  AqaSectionHeader,
} from "../../src/components/AqaUi";
import { useCoachStore } from "../../src/state/CoachStore";
import { aqaColors } from "../../src/theme/tokens";

export default function GroupsScreen() {
  const router = useRouter();
  const { bootstrap, user, isRefreshing, refreshWorkspace, t, locale } =
    useCoachStore();

  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const groups = bootstrap?.groups ?? [];

  const categories = useMemo(() => {
    const dynamicCats = Array.from(
      new Set(
        groups.map((g) => g.category.trim().toUpperCase()).filter(Boolean)
      )
    );
    return ["ALL", ...dynamicCats];
  }, [groups]);

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return groups.filter((g) => {
      const catMatch =
        selectedCategory === "ALL" ||
        g.category.trim().toUpperCase() === selectedCategory;
      const queryMatch =
        !q ||
        g.name.toLowerCase().includes(q) ||
        g.pool.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q) ||
        g.level.toLowerCase().includes(q);
      return catMatch && queryMatch;
    });
  }, [groups, searchQuery, selectedCategory]);

  const totalSwimmers = useMemo(
    () =>
      filteredGroups.reduce(
        (acc, g) => acc + (g.activeMembersCount || g.memberCount || 0),
        0
      ),
    [filteredGroups]
  );

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
          eyebrow="AQA GROUPS & SECTORS"
          title={t("groups.title")}
          subtitle={`${filteredGroups.length} ${
            locale === "ar" ? "فوج" : "groupe(s)"
          } • ${totalSwimmers} ${locale === "ar" ? "سباح" : "nageurs"}`}
          rightSlot={
            user?.isHeadCoach ? (
              <View style={styles.headBadge}>
                <Text style={styles.headBadgeText}>HEAD COACH</Text>
              </View>
            ) : null
          }
        />

        {/* Search Input */}
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t("groups.search_hint")}
          placeholderTextColor={aqaColors.textLight}
          style={styles.searchInput}
        />

        {/* Category Filter Pills */}
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
                style={[styles.catPill, active && styles.catPillActive]}
              >
                {active ? <View style={styles.catDot} /> : null}
                <Text
                  style={[
                    styles.catPillText,
                    active && styles.catPillTextActive,
                  ]}
                >
                  {cat === "ALL" ? t("common.all_sectors") : cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Groups List */}
        {filteredGroups.length === 0 ? (
          <AqaDoubleBezelCard padding={32}>
            <Text style={styles.emptyText}>{t("common.search")}</Text>
          </AqaDoubleBezelCard>
        ) : (
          filteredGroups.map((group) => {
            const count = group.activeMembersCount || group.memberCount || 0;
            const cap = group.capacity || 20;
            const fillRatio = cap > 0 ? Math.min(1, count / cap) : 0;

            return (
              <AqaDoubleBezelCard
                key={group.id}
                padding={16}
                onPress={() => router.push(`/groups/${group.id}`)}
              >
                <View style={styles.groupHeaderRow}>
                  <Text numberOfLines={1} style={styles.groupTitle}>
                    {group.name}
                  </Text>
                  <View
                    style={[
                      styles.roleBadge,
                      group.isViewOnly && styles.roleBadgeReadOnly,
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleBadgeText,
                        group.isViewOnly && { color: aqaColors.textMuted },
                      ]}
                    >
                      {group.isViewOnly
                        ? t("common.view_only")
                        : group.roleInGroup.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <View style={styles.categoryTag}>
                    <Text style={styles.categoryTagText}>
                      {group.category.toUpperCase()}
                    </Text>
                  </View>
                  {group.level ? (
                    <Text style={styles.metaText}>{group.level}</Text>
                  ) : null}
                  <Text style={styles.metaText}>• {group.pool}</Text>
                </View>

                {/* Capacity Bar */}
                <View style={styles.capacityTrack}>
                  <View
                    style={[
                      styles.capacityFill,
                      {
                        width: `${Math.round(fillRatio * 100)}%`,
                        backgroundColor:
                          fillRatio >= 0.9
                            ? aqaColors.warning
                            : aqaColors.primaryHover,
                      },
                    ]}
                  />
                </View>

                <View style={styles.footerRow}>
                  <Text numberOfLines={1} style={styles.scheduleText}>
                    {(group.scheduleDays || []).join(", ")} • {group.startTime}-
                    {group.endTime}
                  </Text>
                  <View style={styles.countChip}>
                    <Text style={styles.countChipText}>
                      {count} / {cap}
                    </Text>
                  </View>
                </View>
              </AqaDoubleBezelCard>
            );
          })
        )}
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
  headBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.16)",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: aqaColors.warning,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  headBadgeText: {
    color: aqaColors.warning,
    fontSize: 9.5,
    fontWeight: "900",
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
    paddingVertical: 2,
  },
  catPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#080E1E",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  catPillActive: {
    backgroundColor: "#13223D",
    borderColor: "rgba(56, 189, 248, 0.55)",
  },
  catDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: aqaColors.accent,
  },
  catPillText: {
    color: aqaColors.textMuted,
    fontSize: 11.5,
    fontWeight: "700",
  },
  catPillTextActive: {
    color: aqaColors.textPrimary,
    fontWeight: "800",
  },
  emptyText: {
    color: aqaColors.textMuted,
    textAlign: "center",
    fontSize: 13.5,
  },
  groupHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  groupTitle: {
    flex: 1,
    color: aqaColors.textPrimary,
    fontSize: 15.5,
    fontWeight: "800",
  },
  roleBadge: {
    backgroundColor: "rgba(0, 242, 255, 0.14)",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(0, 242, 255, 0.35)",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
  },
  roleBadgeReadOnly: {
    backgroundColor: "#080E1E",
    borderColor: aqaColors.borderSubtle,
  },
  roleBadgeText: {
    color: aqaColors.accent,
    fontSize: 9.5,
    fontWeight: "900",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  categoryTag: {
    backgroundColor: "rgba(14, 165, 233, 0.14)",
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
  },
  categoryTagText: {
    color: aqaColors.primaryHover,
    fontSize: 10,
    fontWeight: "800",
  },
  metaText: {
    color: aqaColors.textMuted,
    fontSize: 12,
  },
  capacityTrack: {
    height: 5,
    borderRadius: 999,
    backgroundColor: "#060B16",
    marginTop: 12,
    overflow: "hidden",
  },
  capacityFill: {
    height: "100%",
    borderRadius: 999,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 11,
    gap: 8,
  },
  scheduleText: {
    flex: 1,
    color: aqaColors.textMuted,
    fontSize: 11.5,
    fontVariant: ["tabular-nums"],
  },
  countChip: {
    backgroundColor: "#060B16",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  countChipText: {
    color: aqaColors.accent,
    fontSize: 11.5,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
});

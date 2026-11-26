import React from "react";
import { StyleSheet, View, type ColorValue } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AqaExecutiveHeader, type AqaIconName } from "../../src/components/AqaUi";
import { useCoachStore } from "../../src/state/CoachStore";
import { AqaTokens, aqaColors } from "../../src/theme/tokens";

const TAB_BAR_HEIGHT = 58;

/** Outline icon when inactive, filled when active: one icon family, one style per state. */
function tabIcon(outline: AqaIconName, filled: AqaIconName) {
  function TabIcon({ focused, color }: { focused: boolean; color: ColorValue }) {
    return (
      <Ionicons
        name={focused ? filled : outline}
        size={AqaTokens.icon.lg}
        // The tab navigator passes the active/inactive tint colours set below, which are strings.
        color={color as string}
      />
    );
  }
  return TabIcon;
}

export default function TabsLayout() {
  const { t, bootstrap } = useCoachStore();
  // react-native-safe-area-context handles notch, status bar and gesture bar on iOS and Android.
  const insets = useSafeAreaInsets();
  const pendingCount = (bootstrap?.pendingRequests ?? []).length;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <AqaExecutiveHeader />
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: "#060B16",
              borderTopColor: "rgba(0, 242, 255, 0.18)",
              borderTopWidth: 1,
              height: TAB_BAR_HEIGHT + insets.bottom,
              paddingBottom: Math.max(insets.bottom, 6),
              paddingTop: 6,
            },
            tabBarActiveTintColor: aqaColors.accent,
            tabBarInactiveTintColor: aqaColors.textMuted,
            tabBarLabelStyle: {
              fontSize: AqaTokens.fontSize.caption,
              fontWeight: "700",
            },
            tabBarAllowFontScaling: true,
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: t("nav.today"),
              tabBarIcon: tabIcon("calendar-outline", "calendar"),
            }}
          />
          <Tabs.Screen
            name="groups"
            options={{
              title: t("nav.groups"),
              tabBarIcon: tabIcon("people-outline", "people"),
            }}
          />
          <Tabs.Screen
            name="suivi-tech"
            options={{
              title: t("nav.suivi"),
              tabBarIcon: tabIcon("stats-chart-outline", "stats-chart"),
            }}
          />
          <Tabs.Screen
            name="replacements"
            options={{
              title: t("nav.replacements"),
              tabBarIcon: tabIcon("swap-horizontal-outline", "swap-horizontal"),
              tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
              tabBarAccessibilityLabel:
                pendingCount > 0
                  ? `${t("nav.replacements")}, ${t("header.pending_requests", { count: pendingCount })}`
                  : t("nav.replacements"),
              tabBarBadgeStyle: {
                backgroundColor: aqaColors.warning,
                color: aqaColors.onPrimary,
                fontWeight: "900",
                fontSize: AqaTokens.fontSize.caption,
              },
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: t("nav.profile"),
              tabBarIcon: tabIcon("person-circle-outline", "person-circle"),
            }}
          />
        </Tabs>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#050914",
  },
});

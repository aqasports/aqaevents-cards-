import React from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";
import { AqaExecutiveHeader } from "../../src/components/AqaUi";
import { useCoachStore } from "../../src/state/CoachStore";
import { aqaColors } from "../../src/theme/tokens";

export default function TabsLayout() {
  const { t, bootstrap } = useCoachStore();
  const pendingCount = (bootstrap?.pendingRequests ?? []).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <AqaExecutiveHeader />
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: "#060B16",
              borderTopColor: "rgba(0, 242, 255, 0.18)",
              borderTopWidth: 1,
              height: 62,
              paddingBottom: 8,
              paddingTop: 6,
            },
            tabBarActiveTintColor: aqaColors.accent,
            tabBarInactiveTintColor: aqaColors.textMuted,
            tabBarLabelStyle: {
              fontSize: 10.5,
              fontWeight: "800",
              letterSpacing: 0.2,
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: t("nav.today"),
            }}
          />
          <Tabs.Screen
            name="groups"
            options={{
              title: t("nav.groups"),
            }}
          />
          <Tabs.Screen
            name="suivi-tech"
            options={{
              title: t("nav.suivi"),
            }}
          />
          <Tabs.Screen
            name="replacements"
            options={{
              title: t("nav.replacements"),
              tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
              tabBarBadgeStyle: {
                backgroundColor: aqaColors.warning,
                color: "#000000",
                fontWeight: "900",
                fontSize: 10,
              },
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: t("nav.profile"),
            }}
          />
        </Tabs>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#050914",
  },
});

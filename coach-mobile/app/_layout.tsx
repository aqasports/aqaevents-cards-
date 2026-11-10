import React, { useEffect } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { CoachStoreProvider, useCoachStore } from "../src/state/CoachStore";
import { AqaTokens } from "../src/theme/tokens";

function RootNavigationGate() {
  const {
    isBooting,
    user,
    isBiometricLocked,
    unlockWithBiometrics,
    isRtl,
    t,
  } = useCoachStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isBooting) return;
    const onLoginRoute = segments[0] === "login";
    if (!user && !onLoginRoute) {
      router.replace("/login");
    } else if (user && onLoginRoute) {
      router.replace("/(tabs)");
    }
  }, [isBooting, user, segments, router]);

  if (isBooting) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={AqaTokens.colors.primary} />
      </View>
    );
  }

  if (user && isBiometricLocked) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>{t("app.title")}</Text>
        <Pressable style={styles.unlockBtn} onPress={() => void unlockWithBiometrics()}>
          <Text style={styles.unlockText}>{t("auth.biometric_unlock")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { direction: isRtl ? "rtl" : "ltr" }]}>
      <StatusBar style="light" />
      <Slot />
    </View>
  );
}

export default function RootLayout() {
  return (
    <CoachStoreProvider>
      <RootNavigationGate />
    </CoachStoreProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AqaTokens.colors.background,
  },
  centered: {
    flex: 1,
    backgroundColor: AqaTokens.colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: AqaTokens.spacing.lg,
  },
  title: {
    color: AqaTokens.colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: AqaTokens.spacing.lg,
  },
  unlockBtn: {
    backgroundColor: AqaTokens.colors.primary,
    paddingHorizontal: AqaTokens.spacing.lg,
    paddingVertical: AqaTokens.spacing.md,
    borderRadius: AqaTokens.radii.md,
  },
  unlockText: {
    color: AqaTokens.colors.textPrimary,
    fontWeight: "700",
    fontSize: 15,
  },
});

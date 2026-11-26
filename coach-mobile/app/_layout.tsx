import React, { useEffect } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { AqaIslandButton } from "../src/components/AqaUi";
import { CoachStoreProvider, useCoachStore } from "../src/state/CoachStore";
import { AqaTokens } from "../src/theme/tokens";

function RootNavigationGate() {
  const {
    isBooting,
    user,
    isBiometricLocked,
    unlockWithBiometrics,
    signOut,
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
        <View style={styles.lockIconRing} importantForAccessibility="no-hide-descendants">
          <Ionicons
            name="lock-closed"
            size={AqaTokens.icon.lg + 12}
            color={AqaTokens.colors.accent}
          />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {t("app.title")}
        </Text>
        <Text style={styles.lockHint}>{t("auth.locked_hint")}</Text>
        <AqaIslandButton
          label={t("auth.biometric_unlock")}
          icon="finger-print"
          onPress={() => void unlockWithBiometrics()}
          style={styles.unlockBtn}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("auth.logout")}
          style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.82 }]}
          onPress={() =>
            Alert.alert(t("auth.logout"), t("auth.lock_signout_warning"), [
              { text: t("common.cancel"), style: "cancel" },
              { text: t("auth.logout"), style: "destructive", onPress: () => void signOut() },
            ])
          }
        >
          <Text style={styles.signOutText}>{t("auth.logout")}</Text>
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
  lockIconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AqaTokens.colors.accentTint,
    borderWidth: 1,
    borderColor: AqaTokens.colors.borderAccent,
    marginBottom: AqaTokens.spacing.lg,
  },
  title: {
    color: AqaTokens.colors.textPrimary,
    fontSize: AqaTokens.fontSize.display,
    fontWeight: "800",
    textAlign: "center",
  },
  lockHint: {
    color: AqaTokens.colors.textMuted,
    fontSize: AqaTokens.fontSize.body,
    lineHeight: 22,
    textAlign: "center",
    marginTop: AqaTokens.spacing.xs,
    marginBottom: AqaTokens.spacing.lg,
    maxWidth: 320,
  },
  unlockBtn: {
    alignSelf: "stretch",
    maxWidth: 360,
    width: "100%",
  },
  signOutBtn: {
    marginTop: AqaTokens.spacing.sm,
    minHeight: AqaTokens.touch.min,
    paddingHorizontal: AqaTokens.spacing.md,
    justifyContent: "center",
  },
  signOutText: {
    color: AqaTokens.colors.textMuted,
    fontSize: AqaTokens.fontSize.body,
    fontWeight: "600",
  },
});

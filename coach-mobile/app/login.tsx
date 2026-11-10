import React, { useState } from "react";
import {
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { AQA_IMAGES } from "../src/assets/badges";
import {
  AqaDoubleBezelCard,
  AqaIslandButton,
  AqaPulseIndicator,
  LanguageSwitcherPill,
} from "../src/components/AqaUi";
import { useCoachStore } from "../src/state/CoachStore";
import { aqaColors } from "../src/theme/tokens";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, t, locale, isRtl } = useCoachStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [obscurePassword, setObscurePassword] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await signIn(email.trim(), password);
      router.replace("/(tabs)");
    } catch (err) {
      setErrorMessage(
        err instanceof Error && err.message
          ? err.message
          : t("auth.invalid_credentials")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <ImageBackground
        source={AQA_IMAGES.oceanBg}
        style={StyleSheet.absoluteFill}
        imageStyle={{ opacity: 0.22 }}
        resizeMode="cover"
      />
      <View style={styles.darkOverlay} pointerEvents="none" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Bar: AQA SWIM CLOUD Pulse + Language Switcher */}
          <View style={styles.topRow}>
            <View style={styles.cloudPill}>
              <AqaPulseIndicator color={aqaColors.accent} size={6} />
              <Text style={styles.cloudPillText}>AQA SWIM CLOUD</Text>
            </View>
            <LanguageSwitcherPill />
          </View>

          <View style={styles.centerBlock}>
            {/* Official AQA Coach Emblem */}
            <View style={styles.logoFrame}>
              <Image
                source={AQA_IMAGES.coachLogo}
                style={styles.logoImg}
                resizeMode="cover"
              />
            </View>

            <Text style={styles.brandTitle}>{t("app.title")}</Text>
            <Text style={styles.brandSubtitle}>{t("app.subtitle")}</Text>

            <AqaDoubleBezelCard
              glowEffect
              padding={22}
              style={{ width: "100%", marginTop: 24 }}
            >
              <Text
                style={[
                  styles.fieldLabel,
                  isRtl && { textAlign: "right" },
                ]}
              >
                {t("auth.email").toUpperCase()}
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="coach@aqasports.pro"
                placeholderTextColor={aqaColors.textLight}
                style={[styles.input, isRtl && { textAlign: "right" }]}
              />

              <Text
                style={[
                  styles.fieldLabel,
                  { marginTop: 16 },
                  isRtl && { textAlign: "right" },
                ]}
              >
                {t("auth.password").toUpperCase()}
              </Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={obscurePassword}
                  placeholder="••••••••"
                  placeholderTextColor={aqaColors.textLight}
                  style={[
                    styles.passwordInput,
                    isRtl && { textAlign: "right" },
                  ]}
                />
                <Pressable
                  onPress={() => setObscurePassword((prev) => !prev)}
                  style={styles.eyeBtn}
                >
                  <Text style={styles.eyeBtnText}>
                    {obscurePassword
                      ? locale === "ar"
                        ? "إظهار"
                        : locale === "en"
                        ? "SHOW"
                        : "VOIR"
                      : locale === "ar"
                      ? "إخفاء"
                      : locale === "en"
                      ? "HIDE"
                      : "MASQUER"}
                  </Text>
                </Pressable>
              </View>

              {errorMessage ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>{errorMessage}</Text>
                </View>
              ) : null}

              <AqaIslandButton
                label={submitting ? t("common.loading") : t("auth.login")}
                loading={submitting}
                disabled={submitting || !email.trim() || !password}
                onPress={handleLogin}
                style={{ marginTop: 22 }}
              />
            </AqaDoubleBezelCard>

            <Text style={styles.footerCaption}>
              {locale === "ar"
                ? "نظام AQA Swim الاحترافي للمدربين • متصل مباشرة بـ AQA ERP"
                : locale === "en"
                ? "AQA Swim Executive Coach Suite • Live AQA ERP Sync"
                : "Suite Executive AQA Swim Coaches • Synchronisation directe AQA ERP"}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: aqaColors.background,
  },
  darkOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(3, 7, 18, 0.78)",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 32,
    justifyContent: "space-between",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cloudPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#0B1120",
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
  },
  cloudPillText: {
    color: aqaColors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.9,
  },
  centerBlock: {
    alignItems: "center",
    marginVertical: 24,
  },
  logoFrame: {
    width: 92,
    height: 92,
    borderRadius: 24,
    backgroundColor: "#000000",
    borderWidth: 1.5,
    borderColor: "rgba(0, 242, 255, 0.45)",
    overflow: "hidden",
    shadowColor: aqaColors.accent,
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 6,
  },
  logoImg: {
    width: "100%",
    height: "100%",
  },
  brandTitle: {
    color: aqaColors.textPrimary,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 16,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    color: aqaColors.textMuted,
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
  },
  fieldLabel: {
    color: aqaColors.textMuted,
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.7,
    marginBottom: 7,
  },
  input: {
    backgroundColor: "#060B16",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
    color: aqaColors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
  },
  passwordWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#060B16",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: aqaColors.borderSubtle,
  },
  passwordInput: {
    flex: 1,
    color: aqaColors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
  },
  eyeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  eyeBtnText: {
    color: aqaColors.accent,
    fontSize: 10.5,
    fontWeight: "800",
  },
  errorBanner: {
    marginTop: 14,
    backgroundColor: "rgba(239, 68, 68, 0.14)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.45)",
    padding: 11,
  },
  errorBannerText: {
    color: aqaColors.danger,
    fontSize: 12.5,
    fontWeight: "700",
  },
  footerCaption: {
    color: aqaColors.textLight,
    fontSize: 11,
    marginTop: 22,
    textAlign: "center",
  },
});

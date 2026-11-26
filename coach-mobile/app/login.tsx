import React, { useRef, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { ZodError } from "zod";
import { CoachApiError } from "../src/api/client";
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
  const { signIn, t, isRtl } = useCoachStore();
  const passwordRef = useRef<React.ComponentRef<typeof TextInput>>(null);

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
      // Show a translated, human message instead of raw server or validation text.
      if (err instanceof ZodError) {
        setErrorMessage(t("auth.invalid_email"));
      } else if (err instanceof CoachApiError && err.isNetworkError) {
        setErrorMessage(t("auth.network_error"));
      } else if (err instanceof CoachApiError && err.status === 429) {
        setErrorMessage(t("auth.too_many_attempts"));
      } else if (err instanceof CoachApiError && err.status != null && err.status >= 500) {
        setErrorMessage(t("common.error"));
      } else {
        setErrorMessage(t("auth.invalid_credentials"));
      }
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
                nativeID="loginEmailLabel"
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
                accessibilityLabel={t("auth.email")}
                accessibilityLabelledBy="loginEmailLabel"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                // Lets iOS Keychain and Android password managers fill the account.
                textContentType="username"
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                submitBehavior="submit"
                placeholder="coach@aqasports.pro"
                placeholderTextColor={aqaColors.textLight}
                style={[styles.input, isRtl && { textAlign: "right" }]}
              />

              <Text
                nativeID="loginPasswordLabel"
                style={[
                  styles.fieldLabel,
                  { marginTop: 16 },
                  isRtl && { textAlign: "right" },
                ]}
              >
                {t("auth.password").toUpperCase()}
              </Text>
              <View style={[styles.passwordWrap, errorMessage ? styles.inputError : null]}>
                <TextInput
                  ref={passwordRef}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={obscurePassword}
                  accessibilityLabel={t("auth.password")}
                  accessibilityLabelledBy="loginPasswordLabel"
                  textContentType="password"
                  autoComplete="password"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="go"
                  onSubmitEditing={() => void handleLogin()}
                  placeholder="••••••••"
                  placeholderTextColor={aqaColors.textLight}
                  style={[
                    styles.passwordInput,
                    isRtl && { textAlign: "right" },
                  ]}
                />
                <Pressable
                  onPress={() => setObscurePassword((prev) => !prev)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    obscurePassword ? t("auth.show_password") : t("auth.hide_password")
                  }
                  style={({ pressed }) => [styles.eyeBtn, pressed && { opacity: 0.7 }]}
                >
                  <Ionicons
                    name={obscurePassword ? "eye-outline" : "eye-off-outline"}
                    size={22}
                    color={aqaColors.accent}
                  />
                </Pressable>
              </View>

              {/* Error sits right under the fields and is announced as soon as it appears. */}
              {errorMessage ? (
                <View style={styles.errorBanner} accessibilityRole="alert" accessibilityLiveRegion="assertive">
                  <Ionicons name="alert-circle" size={20} color={aqaColors.dangerText} accessible={false} />
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
              {t("auth.footer")}
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
    fontSize: 12,
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
    fontSize: 12,
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
    fontSize: 16,
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
    minHeight: 50,
    fontSize: 16,
  },
  inputError: {
    borderColor: "rgba(248, 113, 113, 0.7)",
  },
  eyeBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  errorBanner: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239, 68, 68, 0.14)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.45)",
    padding: 12,
  },
  errorBannerText: {
    flex: 1,
    color: aqaColors.dangerText,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  footerCaption: {
    color: aqaColors.textLight,
    fontSize: 12,
    marginTop: 22,
    textAlign: "center",
  },
});

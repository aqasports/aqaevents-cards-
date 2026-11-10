import React from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { AQA_IMAGES } from "../../src/assets/badges";
import {
  AqaAmbientBackground,
  AqaDoubleBezelCard,
  AqaIslandButton,
  AqaNewClientBadge,
  AqaPulseIndicator,
  AqaSectionHeader,
  LanguageSwitcherPill,
} from "../../src/components/AqaUi";
import { useCoachStore } from "../../src/state/CoachStore";
import { aqaColors } from "../../src/theme/tokens";

export default function ProfileScreen() {
  const router = useRouter();
  const {
    user,
    notifySettings,
    biometricEnabled,
    localRemindersEnabled,
    outboxItems,
    rejectedItems,
    t,
    setBiometricEnabled,
    setLocalRemindersEnabled,
    updateNotifySettings,
    sendTestLocalNotification,
    flushOfflineOutbox,
    clearRejectedQueue,
    signOut,
  } = useCoachStore();

  const isHead = user?.isHeadCoach === true;
  const isAssistant = user?.isAssistant === true;
  const roleColor = isHead
    ? aqaColors.warning
    : isAssistant
    ? aqaColors.textMuted
    : aqaColors.primaryHover;

  const confirmLogout = () => {
    const pendingCount = outboxItems.length;
    const message =
      pendingCount > 0
        ? t("profile.logout_pending_warning", { count: pendingCount })
        : t("profile.logout_confirm");

    Alert.alert(t("auth.logout"), message, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("auth.logout"),
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <AqaAmbientBackground>
      <ScrollView contentContainerStyle={styles.container}>
        {/* 1. Executive Coach Dossier Card */}
        <AqaDoubleBezelCard glowEffect padding={18}>
          <View style={styles.heroRow}>
            <View
              style={[
                styles.logoBox,
                { borderColor: `${roleColor}80` },
              ]}
            >
              <Image
                source={AQA_IMAGES.coachLogo}
                style={styles.logoImg}
                resizeMode="cover"
              />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.nameBadgeRow}>
                <Text numberOfLines={1} style={styles.coachName}>
                  {user?.name || "Coach AQA"}
                </Text>
                <View
                  style={[
                    styles.roleChip,
                    {
                      borderColor: `${roleColor}66`,
                      backgroundColor: `${roleColor}22`,
                    },
                  ]}
                >
                  <Text style={[styles.roleChipText, { color: roleColor }]}>
                    {(user?.roleDisplay || "COACH").toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.emailText}>{user?.email || ""}</Text>
              <View style={styles.connectedRow}>
                <AqaPulseIndicator color={aqaColors.success} size={6} />
                <Text style={styles.connectedText}>
                  {t("common.synced")}
                </Text>
              </View>
            </View>
          </View>
        </AqaDoubleBezelCard>

        {/* 2. Language Switcher Card */}
        <AqaDoubleBezelCard padding={16}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{t("common.language")}</Text>
              <Text style={styles.cardSub}>Francais • English • العربية</Text>
            </View>
            <LanguageSwitcherPill />
          </View>
        </AqaDoubleBezelCard>

        {/* 3. Notification & Security Preferences */}
        <AqaDoubleBezelCard padding={16}>
          <AqaSectionHeader
            eyebrow="ALERTES & SECURITE"
            title={t("notif.settings_title")}
          />

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>{t("notif.allow_title")}</Text>
              <Text style={styles.toggleSub}>{t("notif.allow_sub")}</Text>
            </View>
            <Switch
              value={notifySettings.isAuthorized}
              onValueChange={(v) =>
                void updateNotifySettings({ isAuthorized: v })
              }
              trackColor={{ true: aqaColors.primary, false: "#334155" }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={styles.toggleTitle}>
                  {t("notif.new_client_toggle_title")}
                </Text>
                <AqaNewClientBadge compact />
              </View>
              <Text style={styles.toggleSub}>
                {t("notif.new_client_toggle_sub")}
              </Text>
            </View>
            <Switch
              value={notifySettings.notifyNewClient}
              disabled={!notifySettings.isAuthorized}
              onValueChange={(v) =>
                void updateNotifySettings({ notifyNewClient: v })
              }
              trackColor={{ true: aqaColors.success, false: "#334155" }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>
                {t("notif.movement_toggle_title")}
              </Text>
              <Text style={styles.toggleSub}>
                {t("notif.movement_toggle_sub")}
              </Text>
            </View>
            <Switch
              value={notifySettings.notifyGroupMovement}
              disabled={!notifySettings.isAuthorized}
              onValueChange={(v) =>
                void updateNotifySettings({ notifyGroupMovement: v })
              }
              trackColor={{ true: aqaColors.primaryHover, false: "#334155" }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>
                {t("notif.replacement_toggle_title")}
              </Text>
              <Text style={styles.toggleSub}>
                {t("notif.replacement_toggle_sub")}
              </Text>
            </View>
            <Switch
              value={notifySettings.notifyReplacements}
              disabled={!notifySettings.isAuthorized}
              onValueChange={(v) =>
                void updateNotifySettings({ notifyReplacements: v })
              }
              trackColor={{ true: aqaColors.warning, false: "#334155" }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>
                {t("profile.local_reminders")}
              </Text>
              <Text style={styles.toggleSub}>
                {t("notif.reminder_toggle_sub")}
              </Text>
            </View>
            <Switch
              value={localRemindersEnabled}
              onValueChange={(v) => {
                void setLocalRemindersEnabled(v);
                void updateNotifySettings({ notifySessionReminder: v });
              }}
              trackColor={{ true: aqaColors.accent, false: "#334155" }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>
                {t("profile.biometric_lock")}
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={(v) => void setBiometricEnabled(v)}
              trackColor={{ true: aqaColors.primary, false: "#334155" }}
            />
          </View>

          <AqaIslandButton
            label="Tester Notification AQA"
            compact
            secondary
            onPress={() => void sendTestLocalNotification()}
            style={{ marginTop: 12 }}
          />
        </AqaDoubleBezelCard>

        {/* 4. Teaching Support AQA Swim Card */}
        <AqaDoubleBezelCard
          padding={16}
          onPress={() => router.push("/teaching-support")}
        >
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{t("profile.support_title")}</Text>
              <Text style={styles.cardSub}>{t("profile.support_sub")}</Text>
            </View>
            <Text style={styles.chevron}>{">"}</Text>
          </View>
        </AqaDoubleBezelCard>

        {/* 5. Coach Details & Offline Outbox Inspector */}
        <AqaDoubleBezelCard padding={16}>
          <AqaSectionHeader
            eyebrow="SYNCHRONISATION & DOSSIER"
            title="Etat de la File Hors-Ligne"
          />
          <Text style={styles.metaLine}>
            Coach ID: {user?.coachId || "N/A"} • Tel:{" "}
            {user?.phone || "Non renseigne"}
          </Text>
          <Text style={styles.metaLine}>
             {t("common.pending_sync", { count: outboxItems.length })} •{" "}
            {t("common.rejected_sync", { count: rejectedItems.length })}
          </Text>

          {outboxItems.length > 0 ? (
            <AqaIslandButton
              label={t("profile.flush_outbox")}
              compact
              secondary
              onPress={() => void flushOfflineOutbox()}
              style={{ marginTop: 10 }}
            />
          ) : null}

          {rejectedItems.map((rej) => (
            <View key={rej.id} style={styles.rejectedItem}>
              <Text style={styles.rejectedTitle}>
                {rej.type} • {rej.path}
              </Text>
              <Text style={styles.rejectedReason}>{rej.lastError}</Text>
            </View>
          ))}

          {rejectedItems.length > 0 ? (
            <AqaIslandButton
              label={t("profile.clear_rejected")}
              compact
              secondary
              onPress={() => void clearRejectedQueue()}
              style={{ marginTop: 8 }}
            />
          ) : null}
        </AqaDoubleBezelCard>

        {/* 6. Logout Button */}
        <AqaIslandButton
          label={t("auth.logout")}
          danger
          onPress={confirmLogout}
        />

        <Text style={styles.versionCaption}>
          AQA Swim Coaches Pro • v2.4.0 Production (SDK 58)
        </Text>
      </ScrollView>
    </AqaAmbientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 14,
    paddingBottom: 110,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#000000",
    borderWidth: 1.5,
    overflow: "hidden",
  },
  logoImg: {
    width: "100%",
    height: "100%",
  },
  nameBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  coachName: {
    flex: 1,
    color: aqaColors.textPrimary,
    fontSize: 17,
    fontWeight: "900",
  },
  roleChip: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
  },
  roleChipText: {
    fontSize: 9.5,
    fontWeight: "900",
  },
  emailText: {
    color: aqaColors.textMuted,
    fontSize: 12.5,
    marginTop: 3,
  },
  connectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  connectedText: {
    color: aqaColors.textPrimary,
    fontSize: 11,
    fontWeight: "700",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  cardTitle: {
    color: aqaColors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  cardSub: {
    color: aqaColors.textMuted,
    fontSize: 11.5,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },
  toggleTitle: {
    color: aqaColors.textPrimary,
    fontSize: 13.5,
    fontWeight: "800",
  },
  toggleSub: {
    color: aqaColors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: aqaColors.borderSubtle,
    marginVertical: 6,
  },
  chevron: {
    color: aqaColors.accent,
    fontSize: 16,
    fontWeight: "900",
  },
  metaLine: {
    color: aqaColors.textMuted,
    fontSize: 12,
    marginTop: 6,
  },
  rejectedItem: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "rgba(239, 68, 68, 0.14)",
    borderWidth: 1,
    borderColor: aqaColors.danger,
  },
  rejectedTitle: {
    color: aqaColors.textPrimary,
    fontSize: 12,
    fontWeight: "800",
  },
  rejectedReason: {
    color: aqaColors.danger,
    fontSize: 11.5,
    marginTop: 2,
  },
  versionCaption: {
    color: aqaColors.textLight,
    fontSize: 11,
    textAlign: "center",
    marginTop: 6,
  },
});

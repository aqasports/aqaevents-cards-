import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import type { SwimSessionSummary } from "../contract";
import { coachApiClient } from "../api/client";
import { translate, type SupportedLocale } from "../i18n/translations";

const ANDROID_CHANNEL_ID = "aqa-coaches-events";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: "AQA Coaches Events",
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: "#0ea5e9",
  });
}

/**
 * Registers the device for event-driven push notifications and stores the Expo push token
 * on the active CoachAuthSession in AQA ERP. Replaces background polling timers.
 */
export async function registerCoachPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  try {
    const existing = await Notifications.getPermissionsAsync();
    let finalStatus = existing.status;
    if (finalStatus !== "granted") {
      finalStatus = (await Notifications.requestPermissionsAsync()).status;
    }
    if (finalStatus !== "granted") return null;

    await ensureAndroidChannel();

    const projectId =
      (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ??
      Constants.easConfig?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    await coachApiClient.registerPushToken(
      tokenData.data,
      Platform.OS === "ios" ? "ios" : "android"
    );
    return tokenData.data;
  } catch {
    // Push is optional; the app still refreshes on foreground and pull-to-refresh.
    return null;
  }
}

/**
 * Schedules on-device local notifications 30 minutes before today's scheduled sessions.
 * Runs 100% locally on the phone with zero serverless invocations.
 */
export async function scheduleLocalSessionReminders(
  sessions: SwimSessionSummary[],
  todayDate: string,
  locale: SupportedLocale = "fr"
): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await ensureAndroidChannel();
    const now = Date.now();

    for (const session of sessions) {
      if (session.status !== "scheduled") continue;
      const datePrefix = session.sessionDate.slice(0, 10);
      if (datePrefix !== todayDate) continue;

      const [hStr, mStr] = session.startTime.split(":");
      const hh = (hStr || "0").padStart(2, "0");
      const mm = (mStr || "0").padStart(2, "0");
      // Algeria time, same as the server attendance lock.
      const sessionStart = new Date(`${datePrefix}T${hh}:${mm}:00+01:00`);
      const triggerTime = sessionStart.getTime() - 30 * 60 * 1000;

      if (triggerTime <= now) continue;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: translate(locale, "reminder.title", { group: session.groupName }),
          body: translate(locale, "reminder.body", {
            time: session.startTime,
            location: session.location ? ` - ${session.location}` : "",
          }),
          data: { sessionId: session.id, type: "session_reminder" },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(triggerTime),
          channelId: ANDROID_CHANNEL_ID,
        },
      });
    }
  } catch {
    // Non-fatal if OS notification permission was denied
  }
}

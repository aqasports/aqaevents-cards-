import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import type { SwimSessionSummary } from "../contract";
import { coachApiClient } from "../api/client";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Registers the device for event-driven push notifications and stores the Expo push token
 * on the active CoachAuthSession in AQA ERP. Replaces background polling timers.
 */
export async function registerCoachPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const existing = await Notifications.getPermissionsAsync();
  let finalStatus = existing.status;

  if (finalStatus !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("aqa-coaches-events", {
      name: "AQA Coaches Events",
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: "#0ea5e9",
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const pushToken = tokenData.data;

  await coachApiClient.registerPushToken(
    pushToken,
    Platform.OS === "ios" ? "ios" : "android"
  );

  return pushToken;
}

/**
 * Schedules on-device local notifications 30 minutes before today's scheduled sessions.
 * Runs 100% locally on the phone with zero serverless invocations.
 */
export async function scheduleLocalSessionReminders(
  sessions: SwimSessionSummary[],
  todayDate: string
): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    const now = Date.now();

    for (const session of sessions) {
      if (session.status !== "scheduled") continue;
      const datePrefix = session.sessionDate.slice(0, 10);
      if (datePrefix !== todayDate) continue;

      const [hStr, mStr] = session.startTime.split(":");
      const sessionStart = new Date(`${datePrefix}T${hStr || "00"}:${mStr || "00"}:00`);
      const triggerTime = sessionStart.getTime() - 30 * 60 * 1000;

      if (triggerTime <= now) continue;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Seance AQA dans 30 min : ${session.groupName}`,
          body: `Debut a ${session.startTime}${session.location ? ` - ${session.location}` : ""}`,
          data: { sessionId: session.id, type: "session_reminder" },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(triggerTime),
        },
      });
    }
  } catch {
    // Non-fatal if OS notification permission was denied
  }
}

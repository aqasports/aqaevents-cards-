import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import * as Notifications from "expo-notifications";
import { coachApiClient } from "../api/client";
import {
  normalizeBootstrapPayload,
  type CoachBootstrapPayload,
  type CoachUserProfile,
} from "../contract";
import {
  isRtlLocale,
  translate,
  type SupportedLocale,
} from "../i18n/translations";
import {
  registerCoachPushNotifications,
  scheduleLocalSessionReminders,
} from "../notifications/push";
import type { OutboxMutation } from "../sync/outbox";

const BOOTSTRAP_CACHE_KEY = "aqa_coach_v2_bootstrap_cache";
const LOCALE_STORAGE_KEY = "aqa_coach_v2_locale";
const BIOMETRIC_PREF_KEY = "aqa_coach_v2_biometric_enabled";
const REMINDERS_PREF_KEY = "aqa_coach_v2_local_reminders_enabled";
const NOTIFY_SETTINGS_KEY = "aqa_coach_v2_notify_settings";

export interface CoachNotificationSettings {
  isAuthorized: boolean;
  notifyNewClient: boolean;
  notifyGroupMovement: boolean;
  notifyReplacements: boolean;
  notifySessionReminder: boolean;
  dismissedIds: string[];
}

const DEFAULT_NOTIFY_SETTINGS: CoachNotificationSettings = {
  isAuthorized: true,
  notifyNewClient: true,
  notifyGroupMovement: true,
  notifyReplacements: true,
  notifySessionReminder: true,
  dismissedIds: [],
};

interface CoachStoreValue {
  isBooting: boolean;
  isRefreshing: boolean;
  isBiometricLocked: boolean;
  biometricEnabled: boolean;
  localRemindersEnabled: boolean;
  notifySettings: CoachNotificationSettings;
  locale: SupportedLocale;
  isRtl: boolean;
  user: CoachUserProfile | null;
  bootstrap: CoachBootstrapPayload | null;
  outboxItems: OutboxMutation[];
  rejectedItems: OutboxMutation[];
  t: (key: string, params?: Record<string, string | number>) => string;
  setLocale: (next: SupportedLocale) => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  setLocalRemindersEnabled: (enabled: boolean) => Promise<void>;
  updateNotifySettings: (patch: Partial<CoachNotificationSettings>) => Promise<void>;
  dismissNotification: (id: string) => Promise<void>;
  dismissAllNotifications: (ids: string[]) => Promise<void>;
  sendTestLocalNotification: () => Promise<boolean>;
  unlockWithBiometrics: () => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshWorkspace: () => Promise<void>;
  flushOfflineOutbox: () => Promise<void>;
  clearRejectedQueue: () => Promise<void>;
}

const CoachStoreContext = createContext<CoachStoreValue | null>(null);

export function CoachStoreProvider({ children }: { children: React.ReactNode }) {
  const [isBooting, setIsBooting] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBiometricLocked, setIsBiometricLocked] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [localRemindersEnabled, setLocalRemindersEnabledState] = useState(true);
  const [notifySettings, setNotifySettings] =
    useState<CoachNotificationSettings>(DEFAULT_NOTIFY_SETTINGS);
  const [locale, setLocaleState] = useState<SupportedLocale>("fr");
  const [user, setUser] = useState<CoachUserProfile | null>(null);
  const [bootstrap, setBootstrap] = useState<CoachBootstrapPayload | null>(null);
  const [outboxItems, setOutboxItems] = useState<OutboxMutation[]>([]);
  const [rejectedItems, setRejectedItems] = useState<OutboxMutation[]>([]);

  const reloadQueues = useCallback(async () => {
    const [pending, rejected] = await Promise.all([
      coachApiClient.outbox.getOutbox(),
      coachApiClient.outbox.getRejected(),
    ]);
    setOutboxItems(pending);
    setRejectedItems(rejected);
  }, []);

  const refreshWorkspace = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await coachApiClient.flushOutbox();
      await reloadQueues();
      const fresh = await coachApiClient.getBootstrap();
      setBootstrap(fresh);
      setUser(fresh.coach);
      await AsyncStorage.setItem(BOOTSTRAP_CACHE_KEY, JSON.stringify(fresh));
      if (localRemindersEnabled && notifySettings.notifySessionReminder) {
        await scheduleLocalSessionReminders(fresh.sessions, fresh.todayDate);
      }
    } catch {
      await reloadQueues();
    } finally {
      setIsRefreshing(false);
    }
  }, [localRemindersEnabled, notifySettings.notifySessionReminder, reloadQueues]);

  useEffect(() => {
    coachApiClient.onUnauthorized = () => {
      setUser(null);
      setBootstrap(null);
    };

    (async () => {
      try {
        const [savedLocale, bioPref, remPref, rawNotify, storedUser, cachedBoot] =
          await Promise.all([
            AsyncStorage.getItem(LOCALE_STORAGE_KEY),
            AsyncStorage.getItem(BIOMETRIC_PREF_KEY),
            AsyncStorage.getItem(REMINDERS_PREF_KEY),
            AsyncStorage.getItem(NOTIFY_SETTINGS_KEY),
            coachApiClient.getStoredUser(),
            AsyncStorage.getItem(BOOTSTRAP_CACHE_KEY),
          ]);

        if (savedLocale === "fr" || savedLocale === "en" || savedLocale === "ar") {
          setLocaleState(savedLocale);
        }
        const bioOn = bioPref === "true";
        setBiometricEnabledState(bioOn);
        setLocalRemindersEnabledState(remPref !== "false");

        if (rawNotify) {
          try {
            const parsed = JSON.parse(rawNotify) as Partial<CoachNotificationSettings>;
            setNotifySettings({ ...DEFAULT_NOTIFY_SETTINGS, ...parsed });
          } catch {
            // Keep default settings
          }
        }

        if (storedUser) {
          setUser(storedUser);
          if (bioOn) setIsBiometricLocked(true);
          if (cachedBoot) {
            try {
              const rawBoot = JSON.parse(cachedBoot) as Record<string, unknown>;
              setBootstrap(normalizeBootstrapPayload(rawBoot));
            } catch {
              // Ignore corrupt cache
            }
          }
          await reloadQueues();
          void refreshWorkspace();
          void registerCoachPushNotifications();
        }
      } finally {
        setIsBooting(false);
      }
    })();
  }, [refreshWorkspace, reloadQueues]);

  // Event-driven foreground gate: refresh only when returning to active foreground or receiving a push.
  useEffect(() => {
    if (!user) return;

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        void refreshWorkspace();
      }
    };

    const appStateSub = AppState.addEventListener("change", handleAppState);
    const pushSub = Notifications.addNotificationReceivedListener(() => {
      if (AppState.currentState === "active") {
        void refreshWorkspace();
      }
    });

    return () => {
      appStateSub.remove();
      pushSub.remove();
    };
  }, [user, refreshWorkspace]);

  const setLocale = useCallback(async (next: SupportedLocale) => {
    setLocaleState(next);
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, next);
  }, []);

  const setBiometricEnabled = useCallback(async (enabled: boolean) => {
    setBiometricEnabledState(enabled);
    await AsyncStorage.setItem(BIOMETRIC_PREF_KEY, enabled ? "true" : "false");
  }, []);

  const setLocalRemindersEnabled = useCallback(async (enabled: boolean) => {
    setLocalRemindersEnabledState(enabled);
    await AsyncStorage.setItem(REMINDERS_PREF_KEY, enabled ? "true" : "false");
    if (!enabled) {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  }, []);

  const updateNotifySettings = useCallback(
    async (patch: Partial<CoachNotificationSettings>) => {
      setNotifySettings((prev) => {
        const next = { ...prev, ...patch };
        void AsyncStorage.setItem(NOTIFY_SETTINGS_KEY, JSON.stringify(next));
        if (patch.notifySessionReminder === false) {
          void Notifications.cancelAllScheduledNotificationsAsync();
        }
        return next;
      });
    },
    []
  );

  const dismissNotification = useCallback(async (id: string) => {
    setNotifySettings((prev) => {
      if (prev.dismissedIds.includes(id)) return prev;
      const next = {
        ...prev,
        dismissedIds: [...prev.dismissedIds, id],
      };
      void AsyncStorage.setItem(NOTIFY_SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const dismissAllNotifications = useCallback(async (ids: string[]) => {
    setNotifySettings((prev) => {
      const merged = Array.from(new Set([...prev.dismissedIds, ...ids]));
      const next = {
        ...prev,
        dismissedIds: merged,
      };
      void AsyncStorage.setItem(NOTIFY_SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const sendTestLocalNotification = useCallback(async (): Promise<boolean> => {
    try {
      const perm = await Notifications.getPermissionsAsync();
      let granted = perm.granted;
      if (!granted) {
        const req = await Notifications.requestPermissionsAsync();
        granted = req.granted;
      }
      if (!granted) return false;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "AQA Swim Coaches Pro",
          body:
            locale === "ar"
              ? "إشعار تجريبي: نظام تنبيهات AQA يعمل بنجاح."
              : locale === "en"
              ? "Test alert: AQA Coaches notification channel is active."
              : "Alerte de test : Le canal de notification AQA Coaches est actif.",
          sound: true,
        },
        trigger: null,
      });
      return true;
    } catch {
      return false;
    }
  }, [locale]);

  const unlockWithBiometrics = useCallback(async (): Promise<boolean> => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      setIsBiometricLocked(false);
      return true;
    }
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: translate(locale, "auth.biometric_unlock"),
    });
    if (res.success) {
      setIsBiometricLocked(false);
      return true;
    }
    return false;
  }, [locale]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const loggedIn = await coachApiClient.login({ email, password });
      setUser(loggedIn);
      await refreshWorkspace();
      void registerCoachPushNotifications();
    },
    [refreshWorkspace]
  );

  const signOut = useCallback(async () => {
    await coachApiClient.logout();
    await AsyncStorage.removeItem(BOOTSTRAP_CACHE_KEY);
    setUser(null);
    setBootstrap(null);
    setOutboxItems([]);
    setRejectedItems([]);
  }, []);

  const flushOfflineOutbox = useCallback(async () => {
    await coachApiClient.flushOutbox();
    await reloadQueues();
    await refreshWorkspace();
  }, [refreshWorkspace, reloadQueues]);

  const clearRejectedQueue = useCallback(async () => {
    await coachApiClient.outbox.clearRejected();
    await reloadQueues();
  }, [reloadQueues]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      translate(locale, key, params),
    [locale]
  );

  return (
    <CoachStoreContext.Provider
      value={{
        isBooting,
        isRefreshing,
        isBiometricLocked,
        biometricEnabled,
        localRemindersEnabled,
        notifySettings,
        locale,
        isRtl: isRtlLocale(locale),
        user,
        bootstrap,
        outboxItems,
        rejectedItems,
        t,
        setLocale,
        setBiometricEnabled,
        setLocalRemindersEnabled,
        updateNotifySettings,
        dismissNotification,
        dismissAllNotifications,
        sendTestLocalNotification,
        unlockWithBiometrics,
        signIn,
        signOut,
        refreshWorkspace,
        flushOfflineOutbox,
        clearRejectedQueue,
      }}
    >
      {children}
    </CoachStoreContext.Provider>
  );
}

export function useCoachStore(): CoachStoreValue {
  const ctx = useContext(CoachStoreContext);
  if (!ctx) {
    throw new Error("useCoachStore must be used inside CoachStoreProvider");
  }
  return ctx;
}

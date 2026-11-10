import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export interface CoachPushPayload {
  coachIds: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/**
 * Event-driven push dispatch to active coach devices via Expo Push API.
 * Uses existing CoachAuthSession.pushToken values; never throws on network error
 * so primary business mutations (absences, replacements) are never blocked.
 */
export async function sendCoachPushNotification(payload: CoachPushPayload): Promise<number> {
  const uniqueCoachIds = Array.from(new Set(payload.coachIds.filter(Boolean)));
  if (uniqueCoachIds.length === 0) return 0;

  try {
    const now = new Date();
    const sessions = await prisma.coachAuthSession.findMany({
      where: {
        revokedAt: null,
        expiresAt: { gt: now },
        pushToken: { not: null },
        account: {
          loginEnabled: true,
          coachId: { in: uniqueCoachIds },
        },
      },
      select: { pushToken: true },
    });

    const tokens = Array.from(
      new Set(
        sessions
          .map((s) => s.pushToken?.trim())
          .filter((t): t is string => Boolean(t && t.length > 0))
      )
    );

    if (tokens.length === 0) return 0;

    const messages = tokens.map((to) => ({
      to,
      sound: "default",
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
    }));

    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!res.ok) {
      logger.warn(`Expo push returned HTTP ${res.status}`);
      return 0;
    }

    return tokens.length;
  } catch (err) {
    logger.warn("sendCoachPushNotification non-fatal error:", err);
    return 0;
  }
}

import * as SecureStore from "expo-secure-store";
import {
  coachLoginRequestSchema,
  submitAttendanceRequestSchema,
  submitReviewRequestSchema,
  replacementRespondSchema,
  coachPushTokenRequestSchema,
  normalizeBootstrapPayload,
  normalizeCoachUser,
  type CoachBootstrapPayload,
  type CoachLoginRequest,
  type CoachUserProfile,
  type SubmitAttendanceRequest,
  type SubmitReviewRequest,
} from "../contract";
import { CoachOfflineOutbox, createMutationId } from "../sync/outbox";

const DEFAULT_ERP_BASE_URL = "https://delightful-torte-bcca6a.netlify.app";
const KEY_ACCESS_TOKEN = "aqa_coach_v2_access_token";
const KEY_REFRESH_TOKEN = "aqa_coach_v2_refresh_token";
const KEY_USER_PROFILE = "aqa_coach_v2_user_profile";

export class CoachApiError extends Error {
  readonly status: number | null;
  readonly isNetworkError: boolean;

  constructor(message: string, status: number | null, isNetworkError: boolean) {
    super(message);
    this.status = status;
    this.isNetworkError = isNetworkError;
  }
}

export class CoachApiClient {
  private readonly baseUrl: string;
  private memoryAccessToken: string | null = null;
  private memoryRefreshToken: string | null = null;
  private refreshPromise: Promise<string | null> | null = null;
  readonly outbox = new CoachOfflineOutbox();
  onUnauthorized?: () => void;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl || DEFAULT_ERP_BASE_URL).replace(/\/+$/, "");
  }

  async getStoredUser(): Promise<CoachUserProfile | null> {
    try {
      const token = await SecureStore.getItemAsync(KEY_ACCESS_TOKEN);
      const userJson = await SecureStore.getItemAsync(KEY_USER_PROFILE);
      if (!token || !userJson) return null;
      this.memoryAccessToken = token;
      this.memoryRefreshToken = await SecureStore.getItemAsync(KEY_REFRESH_TOKEN);
      const parsed = JSON.parse(userJson) as Record<string, unknown>;
      return normalizeCoachUser(parsed);
    } catch {
      return null;
    }
  }

  async saveSession(
    accessToken: string,
    refreshToken: string,
    user: CoachUserProfile
  ): Promise<void> {
    this.memoryAccessToken = accessToken;
    this.memoryRefreshToken = refreshToken;
    await SecureStore.setItemAsync(KEY_ACCESS_TOKEN, accessToken);
    await SecureStore.setItemAsync(KEY_REFRESH_TOKEN, refreshToken);
    await SecureStore.setItemAsync(KEY_USER_PROFILE, JSON.stringify(user));
  }

  async clearSession(): Promise<void> {
    this.memoryAccessToken = null;
    this.memoryRefreshToken = null;
    await SecureStore.deleteItemAsync(KEY_ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(KEY_REFRESH_TOKEN);
    await SecureStore.deleteItemAsync(KEY_USER_PROFILE);
  }

  private async getAccessToken(): Promise<string | null> {
    if (this.memoryAccessToken) return this.memoryAccessToken;
    this.memoryAccessToken = await SecureStore.getItemAsync(KEY_ACCESS_TOKEN);
    return this.memoryAccessToken;
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      try {
        const refreshToken =
          this.memoryRefreshToken || (await SecureStore.getItemAsync(KEY_REFRESH_TOKEN));
        if (!refreshToken) {
          await this.clearSession();
          this.onUnauthorized?.();
          return null;
        }

        const res = await fetch(`${this.baseUrl}/api/coach/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (!res.ok) {
          await this.clearSession();
          this.onUnauthorized?.();
          return null;
        }

        const data = (await res.json()) as {
          token?: string;
          accessToken?: string;
          refreshToken?: string;
        };
        const nextAccess = data.accessToken || data.token || null;
        const nextRefresh = data.refreshToken || refreshToken;

        if (!nextAccess) {
          await this.clearSession();
          this.onUnauthorized?.();
          return null;
        }

        this.memoryAccessToken = nextAccess;
        this.memoryRefreshToken = nextRefresh;
        await SecureStore.setItemAsync(KEY_ACCESS_TOKEN, nextAccess);
        await SecureStore.setItemAsync(KEY_REFRESH_TOKEN, nextRefresh);
        return nextAccess;
      } catch {
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async request<T>(
    path: string,
    options: { method?: "GET" | "POST" | "PUT"; body?: unknown; skipAuth?: boolean } = {}
  ): Promise<T> {
    const method = options.method || "GET";
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    if (!options.skipAuth) {
      const token = await this.getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });
    } catch (err) {
      throw new CoachApiError(
        err instanceof Error ? err.message : "Network connection failed",
        null,
        true
      );
    }

    if (res.status === 401 && !options.skipAuth) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        headers.Authorization = `Bearer ${refreshed}`;
        res = await fetch(`${this.baseUrl}${path}`, {
          method,
          headers,
          body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        });
      }
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message =
        typeof (json as { error?: unknown }).error === "string"
          ? (json as { error: string }).error
          : `HTTP ${res.status}`;
      throw new CoachApiError(message, res.status, false);
    }

    return json as T;
  }

  async login(input: CoachLoginRequest): Promise<CoachUserProfile> {
    const validated = coachLoginRequestSchema.parse({
      ...input,
      email: input.email.trim().toLowerCase(),
    });
    const data = await this.request<{
      token?: string;
      accessToken?: string;
      refreshToken: string;
      coach: CoachUserProfile;
    }>("/api/coach/auth/login", {
      method: "POST",
      body: validated,
      skipAuth: true,
    });

    const accessToken = data.accessToken || data.token || "";
    const normalizedCoach = normalizeCoachUser(
      (data.coach as unknown as Record<string, unknown>) || {}
    );
    await this.saveSession(accessToken, data.refreshToken, normalizedCoach);
    return normalizedCoach;
  }

  async logout(): Promise<void> {
    try {
      await this.flushOutbox();
      const refreshToken =
        this.memoryRefreshToken || (await SecureStore.getItemAsync(KEY_REFRESH_TOKEN));
      await this.request("/api/coach/auth/logout", {
        method: "POST",
        body: { refreshToken },
      });
    } catch {
      // Ignore network errors during logout after attempting outbox flush
    } finally {
      await this.outbox.clearAllOnLogout();
      await this.clearSession();
    }
  }

  async registerPushToken(pushToken: string | null, platform?: "android" | "ios"): Promise<void> {
    const validated = coachPushTokenRequestSchema.parse({ pushToken, platform });
    await this.request("/api/coach/push-token", {
      method: "POST",
      body: validated,
    });
  }

  async getBootstrap(): Promise<CoachBootstrapPayload> {
    const raw = await this.request<Record<string, unknown>>("/api/coach/bootstrap");
    return normalizeBootstrapPayload(raw);
  }

  async getGroupDetail(groupId: string): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(`/api/coach/groups/${groupId}`);
  }

  async getSessionDetail(sessionId: string): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(`/api/coach/sessions/${sessionId}`);
  }

  async getMemberProfile(memberId: string): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(`/api/coach/members/${memberId}`);
  }

  /**
   * Submits session attendance. Only true network errors queue to the offline outbox;
   * server validation or permission errors (400/403) are thrown immediately so the coach sees them.
   */
  async submitAttendance(
    sessionId: string,
    input: SubmitAttendanceRequest
  ): Promise<{ mode: "online" | "offline" }> {
    const clientMutationId = input.clientMutationId || createMutationId(`att-${sessionId}`);
    const payload = submitAttendanceRequestSchema.parse({
      ...input,
      clientMutationId,
    });
    const path = `/api/coach/sessions/${sessionId}/attendance`;

    try {
      await this.request(path, { method: "PUT", body: payload });
      return { mode: "online" };
    } catch (err) {
      if (err instanceof CoachApiError && err.isNetworkError) {
        await this.outbox.enqueue({
          id: clientMutationId,
          type: "ATTENDANCE_BATCH",
          method: "PUT",
          path,
          payload: payload as unknown as Record<string, unknown>,
          createdAt: new Date().toISOString(),
        });
        return { mode: "offline" };
      }
      throw err;
    }
  }

  /**
   * Submits a swimmer technical review / bilan. Network failures queue to the outbox;
   * server refusals (e.g. locked honor badge) surface immediately.
   */
  async submitReview(
    memberId: string,
    input: SubmitReviewRequest
  ): Promise<{ mode: "online" | "offline" }> {
    const clientMutationId = input.clientMutationId || createMutationId(`rev-${memberId}`);
    const payload = submitReviewRequestSchema.parse({
      ...input,
      memberId,
      clientMutationId,
    });
    const path = `/api/coach/members/${memberId}/reviews`;

    try {
      await this.request(path, { method: "POST", body: payload });
      return { mode: "online" };
    } catch (err) {
      if (err instanceof CoachApiError && err.isNetworkError) {
        await this.outbox.enqueue({
          id: clientMutationId,
          type: "TECH_REVIEW",
          method: "POST",
          path,
          payload: payload as unknown as Record<string, unknown>,
          createdAt: new Date().toISOString(),
        });
        return { mode: "offline" };
      }
      throw err;
    }
  }

  async respondReplacement(
    replacementId: string,
    accept: boolean,
    declineReason?: string
  ): Promise<void> {
    const body = replacementRespondSchema.parse({
      accept,
      ...(declineReason ? { declineReason } : {}),
    });
    await this.request(`/api/coach/replacements/${replacementId}/respond`, {
      method: "POST",
      body,
    });
  }

  async declareAbsence(input: {
    startsAt?: string;
    endsAt?: string;
    startDate?: string;
    endDate?: string;
    reason: string;
    details?: string;
    notes?: string;
    substituteCoachId?: string;
  }): Promise<Record<string, unknown>> {
    const startDate = input.startDate || input.startsAt || "";
    const endDate = input.endDate || input.endsAt || startDate;
    const notes = input.notes || input.details || "";
    return this.request<Record<string, unknown>>("/api/coach/absences", {
      method: "POST",
      body: {
        startDate,
        endDate,
        startsAt: startDate,
        endsAt: endDate,
        reason: input.reason,
        notes,
        details: notes,
        ...(input.substituteCoachId ? { substituteCoachId: input.substituteCoachId } : {}),
      },
    });
  }

  async flushOutbox(): Promise<{ accepted: number; rejected: number; remaining: number }> {
    return this.outbox.flush(async (item) => {
      try {
        await this.request(item.path, { method: item.method, body: item.payload });
        return { status: 200 };
      } catch (err) {
        if (err instanceof CoachApiError && err.status != null) {
          return { status: err.status, errorMessage: err.message };
        }
        throw err;
      }
    });
  }
}

export const coachApiClient = new CoachApiClient();

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const ACCESS_TOKEN_TTL_SEC = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getJwtSecret(): string {
  const secret = process.env.COACH_JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("COACH_JWT_SECRET or NEXTAUTH_SECRET must be set in production");
  }
  return secret || "aqa_coach_jwt_secret_dev_key_change_in_production";
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf8");
}

export interface CoachJwtPayload {
  sub: string; // CoachAccount id
  coachId: string;
  role: "head_coach" | "coach" | "assistant";
  email: string;
  name: string;
  sessionId: string;
  exp: number; // Unix timestamp
  iat: number;
}

export function signCoachJwt(payload: Omit<CoachJwtPayload, "exp" | "iat">): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: CoachJwtPayload = {
    ...payload,
    iat: now,
    exp: now + ACCESS_TOKEN_TTL_SEC,
  };

  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const secret = getJwtSecret();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyCoachJwt(token: string): CoachJwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const secret = getJwtSecret();

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      )
    ) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as CoachJwtPayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createCoachAuthSession(params: {
  accountId: string;
  coachId: string;
  role: "head_coach" | "coach" | "assistant";
  email: string;
  name: string;
  platform?: string;
  deviceLabel?: string;
  appVersion?: string;
}) {
  const rawRefreshToken = crypto.randomBytes(32).toString("hex");
  const refreshTokenHash = hashRefreshToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  const authSession = await prisma.coachAuthSession.create({
    data: {
      accountId: params.accountId,
      refreshTokenHash,
      platform: params.platform || null,
      deviceLabel: params.deviceLabel || null,
      appVersion: params.appVersion || null,
      expiresAt,
    },
  });

  const accessToken = signCoachJwt({
    sub: params.accountId,
    coachId: params.coachId,
    role: params.role,
    email: params.email,
    name: params.name,
    sessionId: authSession.id,
  });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SEC,
    sessionId: authSession.id,
  };
}

export async function rotateCoachAuthSession(rawRefreshToken: string) {
  const tokenHash = hashRefreshToken(rawRefreshToken);

  const existingSession = await prisma.coachAuthSession.findUnique({
    where: { refreshTokenHash: tokenHash },
    include: {
      account: {
        include: { coach: true },
      },
    },
  });

  if (!existingSession) {
    return { error: "INVALID_TOKEN", status: 401 };
  }

  // Token reuse detection: if revoked or expired, revoke ALL sessions for this account
  if (existingSession.revokedAt || existingSession.expiresAt < new Date()) {
    await prisma.coachAuthSession.updateMany({
      where: { accountId: existingSession.accountId },
      data: { revokedAt: new Date() },
    });
    logger.warn(
      `[coach-auth] Token reuse detected for account ${existingSession.accountId}. Revoked all sessions.`
    );
    return { error: "TOKEN_REVOKED_REUSE_DETECTED", status: 401 };
  }

  if (!existingSession.account.loginEnabled || !existingSession.account.coach.active) {
    return { error: "ACCOUNT_DISABLED", status: 403 };
  }

  // Revoke current session
  await prisma.coachAuthSession.update({
    where: { id: existingSession.id },
    data: { revokedAt: new Date() },
  });

  // Issue new session
  const newTokens = await createCoachAuthSession({
    accountId: existingSession.account.id,
    coachId: existingSession.account.coachId,
    role: existingSession.account.role as "head_coach" | "coach" | "assistant",
    email: existingSession.account.email,
    name: existingSession.account.coach.name,
    platform: existingSession.platform || undefined,
    deviceLabel: existingSession.deviceLabel || undefined,
    appVersion: existingSession.appVersion || undefined,
  });

  return { data: newTokens };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept",
};

export async function requireCoachSession(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized: Missing Bearer token." },
        { status: 401, headers: corsHeaders }
      ),
      coach: null,
      account: null,
    };
  }

  const token = authHeader.slice(7).trim();
  const payload = verifyCoachJwt(token);

  if (!payload) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized: Invalid or expired token." },
        { status: 401, headers: corsHeaders }
      ),
      coach: null,
      account: null,
    };
  }

  const account = await prisma.coachAccount.findUnique({
    where: { id: payload.sub },
    include: { coach: true },
  });

  if (!account || !account.loginEnabled || !account.coach.active) {
    return {
      error: NextResponse.json(
        { error: "Forbidden: Coach account is inactive or disabled." },
        { status: 403, headers: corsHeaders }
      ),
      coach: null,
      account: null,
    };
  }

  return {
    error: null,
    account,
    coach: account.coach,
    role: account.role as "head_coach" | "coach" | "assistant",
  };
}

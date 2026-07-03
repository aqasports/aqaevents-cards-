import bcrypt from "bcryptjs";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── Per-email lockout ────────────────────────────────────────────────────────
// Protects against targeted password guessing on a known account.
const lockoutCache = new Map<string, { count: number; lockUntil: number }>();

// ─── Per-IP rate limiting ─────────────────────────────────────────────────────
// Protects against distributed credential stuffing that rotates target emails.
// 20 attempts per IP in a 15-minute window triggers a 15-minute IP lockout.
const IP_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const IP_MAX_ATTEMPTS = 20;
const ipRateCache = new Map<string, { count: number; windowStart: number; lockUntil: number }>();

export function isIpRateLimited(ip: string): boolean {
  const entry = ipRateCache.get(ip);
  if (!entry) return false;
  if (Date.now() < entry.lockUntil) return true;
  // Reset window if expired
  if (Date.now() - entry.windowStart > IP_WINDOW_MS) {
    ipRateCache.delete(ip);
    return false;
  }
  return false;
}

export function recordIpAttempt(ip: string): void {
  const now = Date.now();
  const entry = ipRateCache.get(ip) ?? { count: 0, windowStart: now, lockUntil: 0 };

  // Reset window if it has expired
  if (now - entry.windowStart > IP_WINDOW_MS) {
    entry.count = 0;
    entry.windowStart = now;
    entry.lockUntil = 0;
  }

  entry.count += 1;

  if (entry.count >= IP_MAX_ATTEMPTS) {
    entry.lockUntil = now + IP_WINDOW_MS;
  }

  ipRateCache.set(ip, entry);
}

export function getFailedAttempts(email: string): number {
  const attempt = lockoutCache.get(email);
  return attempt ? attempt.count : 0;
}

export function isLockedOut(email: string): boolean {
  const attempt = lockoutCache.get(email);
  if (attempt && Date.now() < attempt.lockUntil) {
    return true;
  }
  return false;
}

export function getLockoutTimeRemaining(email: string): number {
  const attempt = lockoutCache.get(email);
  if (attempt && Date.now() < attempt.lockUntil) {
    return Math.ceil((attempt.lockUntil - Date.now()) / 1000); // seconds
  }
  return 0;
}

export function recordFailedAttempt(email: string): void {
  const attempt = lockoutCache.get(email) || { count: 0, lockUntil: 0 };
  attempt.count += 1;
  
  if (attempt.count >= 5) {
    // 15 minute lockout
    attempt.lockUntil = Date.now() + 15 * 60 * 1000;
  } else {
    // Progressive backoff delay: 1s, 2s, 4s, 8s
    attempt.lockUntil = Date.now() + Math.pow(2, attempt.count - 1) * 1000;
  }
  
  lockoutCache.set(email, attempt);
}

export function resetAttempts(email: string): void {
  lockoutCache.delete(email);
}

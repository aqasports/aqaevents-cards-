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

// Simple in-memory rate limiting and lockout state for admin login
const lockoutCache = new Map<string, { count: number; lockUntil: number }>();

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

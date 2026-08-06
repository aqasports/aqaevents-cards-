import { customAlphabet } from "nanoid";

const tokenAlphabet = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  32,
);

const cardCodeAlphabet = customAlphabet("0123456789", 6);

export function generatePublicToken(): string {
  return tokenAlphabet();
}

export function generateCardCode(): string {
  return `AQA-${cardCodeAlphabet()}`;
}

/**
 * Derives a 3-letter uppercase prefix from an organization name.
 * Strips non-alpha chars, takes the first 3 letters, uppercases.
 * Falls back to "ORG" if the name has fewer than 3 alpha chars.
 */
export function generateOrgCardPrefix(orgName: string): string {
  const alpha = orgName.replace(/[^a-zA-Z]/g, "").toUpperCase();
  return alpha.length >= 3 ? alpha.slice(0, 3) : (alpha || "ORG").padEnd(3, "X");
}

export function generateClubTerminalToken(): string {
  return tokenAlphabet();
}

export function getEventCardUrl(token: string): string {
  const base = process.env.PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/eventscard/${token}`;
}

export function getFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

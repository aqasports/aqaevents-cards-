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

export function getEventCardUrl(token: string): string {
  const base = process.env.PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/eventcard/${token}`;
}

export function getFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

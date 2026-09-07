import { customAlphabet } from "nanoid";

const tokenAlphabet = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  32
);

const swimNumberAlphabet = customAlphabet("0123456789", 6);

export function generateSwimToken(): string {
  return tokenAlphabet();
}

export function generateSwimId(): string {
  return `SWM-${swimNumberAlphabet()}`;
}

export function generateSwimCardCode(): string {
  return `SWM-${swimNumberAlphabet()}`;
}

export function getSwimCardUrl(token: string): string {
  const base = process.env.PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/swim/card/${token}`;
}

export function getPublicSwimProfileUrl(swimId: string): string {
  return `https://aqasports.com/aqaswim?id=${encodeURIComponent(swimId)}`;
}

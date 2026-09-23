/**
 * AQA Swim WhatsApp Utilities
 * Handles resolving WhatsApp numbers from notes, explicit fields, or phone fallbacks,
 * formatting them according to international conventions, and generating wa.me links.
 */

/**
 * Extracts a WhatsApp phone number from notes or metadata text.
 * Handles patterns such as:
 * - "Canal: Instagram | WhatsApp: 0555123456 | Ville: Alger"
 * - "WhatsApp: +213 555 12 34 56"
 * - "WA: 0661234567"
 * - JSON serialized notes containing a "whatsapp" key
 */
export function extractWhatsAppNumber(notes?: string | null): string | null {
  if (!notes || typeof notes !== "string") return null;

  const trimmed = notes.trim();
  if (!trimmed) return null;

  // 1. JSON parsing check
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.whatsapp && typeof parsed.whatsapp === "string") {
        const digits = parsed.whatsapp.replace(/[^0-9]/g, "");
        if (digits.length >= 8 && digits !== "0000000000") {
          return parsed.whatsapp.trim();
        }
      }
    } catch {
      // Not JSON, continue to text parsing
    }
  }

  // 2. Pattern matching in delimited text
  const regex = /(?:whatsapp|wa)\s*[:=]\s*([+0-9\s().-]+?)(?=(?:\s*\||\s*\n|\s*,|\s*;|\s+[a-zA-Z\u0600-\u06FF]+:|$))/i;
  const match = trimmed.match(regex);
  if (match && match[1]) {
    const candidate = match[1].trim();
    const digits = candidate.replace(/[^0-9]/g, "");
    if (digits.length >= 8 && digits !== "0000000000") {
      return candidate;
    }
  }

  return null;
}

/**
 * Normalizes phone numbers to standard international format for wa.me URLs.
 * Algerian numbers:
 * - 05/06/07 xx xx xx xx -> 2135/6/7 xx xx xx xx
 * - 00213 -> 213
 * - +213 -> 213
 */
export function formatWhatsAppNumber(phone?: string | null): string {
  if (!phone || typeof phone !== "string") return "";

  let digits = phone.replace(/[^0-9]/g, "");
  if (!digits) return "";

  if (digits.startsWith("00213")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0") && digits.length === 10) {
    digits = `213${digits.slice(1)}`;
  }

  return digits;
}

export interface ResolvedSwimWhatsApp {
  whatsappNumber: string | null;
  formattedNumber: string | null;
  hasDistinctWhatsApp: boolean;
  source: "explicit" | "notes" | "phone" | "none";
}

/**
 * Resolves the WhatsApp contact number for a swimmer or lead.
 * Priority:
 * 1. Explicit whatsapp attribute if provided
 * 2. WhatsApp number extracted from notes
 * 3. Default phone number
 *
 * Checks whether the WhatsApp number is distinct from the regular phone.
 */
export function resolveSwimWhatsApp(entity: {
  phone?: string | null;
  notes?: string | null;
  whatsapp?: string | null;
}): ResolvedSwimWhatsApp {
  const phoneFormatted = formatWhatsAppNumber(entity.phone);

  // 1. Explicit whatsapp
  if (entity.whatsapp && typeof entity.whatsapp === "string") {
    const explicitDigits = entity.whatsapp.replace(/[^0-9]/g, "");
    if (explicitDigits.length >= 8 && explicitDigits !== "0000000000") {
      const formatted = formatWhatsAppNumber(entity.whatsapp);
      const isDistinct = Boolean(formatted && phoneFormatted && formatted !== phoneFormatted);
      return {
        whatsappNumber: entity.whatsapp.trim(),
        formattedNumber: formatted,
        hasDistinctWhatsApp: isDistinct,
        source: "explicit",
      };
    }
  }

  // 2. Extracted from notes
  const fromNotes = extractWhatsAppNumber(entity.notes);
  if (fromNotes) {
    const formatted = formatWhatsAppNumber(fromNotes);
    const isDistinct = Boolean(formatted && phoneFormatted && formatted !== phoneFormatted);
    return {
      whatsappNumber: fromNotes,
      formattedNumber: formatted,
      hasDistinctWhatsApp: isDistinct,
      source: "notes",
    };
  }

  // 3. Fallback to phone
  if (phoneFormatted) {
    return {
      whatsappNumber: entity.phone?.trim() || null,
      formattedNumber: phoneFormatted,
      hasDistinctWhatsApp: false,
      source: "phone",
    };
  }

  return {
    whatsappNumber: null,
    formattedNumber: null,
    hasDistinctWhatsApp: false,
    source: "none",
  };
}

export interface SwimWhatsAppMessagePayload {
  fullName: string;
  phone?: string | null;
  notes?: string | null;
  whatsapp?: string | null;
  swimId?: string | null;
  formula?: string | null;
  group?: {
    name: string;
    schedule: string;
    coachName?: string | null;
  } | null;
}

/**
 * Generates the full WhatsApp Click-to-Chat URL.
 * Automatically links to the client's added WhatsApp number (if distinct) or phone.
 */
export function getSwimWhatsAppUrl(
  entity: SwimWhatsAppMessagePayload,
  mode: "member" | "lead" = "member"
): string | null {
  const { formattedNumber } = resolveSwimWhatsApp(entity);
  if (!formattedNumber) return null;

  let text = "";

  if (mode === "member") {
    const groupText = entity.group
      ? `${entity.group.name} (${entity.group.schedule})`
      : "En attente d'affectation";
    const coachText = entity.group?.coachName
      ? `Coach: ${entity.group.coachName}\n`
      : "";
    const portalUrl = entity.swimId
      ? `https://aqasports.com/swim/profile/${entity.swimId}`
      : "https://aqasports.com/swim";

    text = encodeURIComponent(
      `Salam ${entity.fullName},\n\n` +
      `Votre inscription AQA Swim est confirmee.\n` +
      `${entity.swimId ? `Identifiant Nageur: ${entity.swimId}\n` : ""}` +
      `Groupe: ${groupText}\n` +
      coachText +
      `Consultez votre profil et badge en ligne ici:\n${portalUrl}\n\n` +
      `A tres bientot au bassin!\nEquipe AQA Sports`
    );
  } else {
    const formulaText = entity.formula ? ` (${entity.formula})` : "";
    text = encodeURIComponent(
      `Salam ${entity.fullName}, nous vous contactons concernant votre demande d'inscription AQA Swim${formulaText}. Etes-vous disponible pour finaliser votre groupe ?`
    );
  }

  return `https://wa.me/${formattedNumber}?text=${text}`;
}

// ─── Renewal Notification ─────────────────────────────────────────────────────

export interface SwimRenewalPayload {
  fullName: string;
  phone?: string | null;
  notes?: string | null;
  whatsapp?: string | null;
  swimId?: string | null;
  formula?: string | null;
  duration?: string | null;
  subscriptionEnd?: Date | string | null;
}

/**
 * Generates a WhatsApp click-to-chat URL with a pre-filled subscription
 * renewal reminder message in French (matches the operational language of AQA Swim).
 */
export function getSwimRenewalWhatsAppUrl(entity: SwimRenewalPayload): string | null {
  const { formattedNumber } = resolveSwimWhatsApp(entity);
  if (!formattedNumber) return null;

  const formulaText = entity.formula ? ` (${entity.formula})` : "";
  const durationText = entity.duration ? ` ${entity.duration}` : "";

  let endDateText = "";
  if (entity.subscriptionEnd) {
    const d = typeof entity.subscriptionEnd === "string"
      ? new Date(entity.subscriptionEnd)
      : entity.subscriptionEnd;
    if (!isNaN(d.getTime())) {
      const day = String(d.getUTCDate()).padStart(2, "0");
      const month = String(d.getUTCMonth() + 1).padStart(2, "0");
      const year = d.getUTCFullYear();
      endDateText = ` le ${day}/${month}/${year}`;
    }
  }

  const text = encodeURIComponent(
    `Salam ${entity.fullName},\n\n` +
    `Votre abonnement AQA Swim${formulaText}${durationText} arrive a echeance${endDateText}.\n\n` +
    `Pour renouveler votre abonnement et continuer a nager, contactez-nous ou visitez :\n` +
    `https://aqasports.com/swim\n\n` +
    `Equipe AQA Sports`
  );

  return `https://wa.me/${formattedNumber}?text=${text}`;
}


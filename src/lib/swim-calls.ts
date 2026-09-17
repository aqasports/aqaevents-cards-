/**
 * Pure client and shared types and utility functions for AQA Swim Reinscription Calls.
 * This file contains NO server dependencies (Prisma, secrets, node modules) and is 100% safe
 * to import in both client-side React components and server routes.
 */

export type SwimCallStatus =
  | "to_call"
  | "callback_scheduled"
  | "interested"
  | "reinscribed"
  | "unreachable"
  | "declined";

export type SwimCallOutcome =
  | "answered_interested"
  | "answered_callback"
  | "answered_reinscribed"
  | "answered_declined"
  | "no_answer"
  | "busy"
  | "invalid_number";

export type ReinscriptionIntent = "high" | "medium" | "low" | "none";

export interface SwimCallEntry {
  id: string;
  callerName: string;
  callerEmail?: string;
  outcome: SwimCallOutcome;
  observation: string;
  reinscriptionIntent: ReinscriptionIntent;
  callbackDate: string | null;
  calledAt: string;
}

export interface SwimCallRecord {
  id: string;
  entityType: "member" | "lead";
  entityId: string;
  swimId?: string;
  fullName: string;
  phone: string;
  email?: string | null;
  category: string;
  level: string;
  formula: string;
  duration: string;
  dateOfStart: string;
  expirationDate: string;
  groupId?: string | null;
  groupName?: string | null;
  coachName?: string | null;
  status: SwimCallStatus;
  reinscriptionIntent: ReinscriptionIntent;
  lastOutcome?: SwimCallOutcome | null;
  lastObservation?: string | null;
  lastCalledAt?: string | null;
  callbackDate?: string | null;
  callHistory: SwimCallEntry[];
  proposedFormula?: string | null;
  proposedDuration?: string | null;
  proposedGroupId?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Calculates the expiration date of a swim subscription based on dateOfStart and duration.
 */
export function calculateSubscriptionExpiration(dateOfStart?: Date | string | null, duration?: string | null): Date {
  if (!dateOfStart) {
    return new Date();
  }
  const start = typeof dateOfStart === "string" ? new Date(dateOfStart) : new Date(dateOfStart.getTime());
  if (isNaN(start.getTime())) {
    return new Date();
  }

  const result = new Date(start);
  const dur = (duration || "3m").toLowerCase().trim();

  if (dur === "1m") {
    result.setMonth(result.getMonth() + 1);
  } else if (dur === "3m") {
    result.setMonth(result.getMonth() + 3);
  } else if (dur === "6m") {
    result.setMonth(result.getMonth() + 6);
  } else if (dur === "9m") {
    result.setMonth(result.getMonth() + 9);
  } else if (dur === "12m" || dur === "1y") {
    result.setFullYear(result.getFullYear() + 1);
  } else {
    result.setMonth(result.getMonth() + 3);
  }

  return result;
}

/**
 * Determines the call urgency based on subscription expiration and scheduled callback date.
 */
export function getCallUrgency(
  expirationDate?: Date | string | null,
  callbackDate?: Date | string | null
): "due_today" | "overdue" | "expiring_soon" | "active" {
  if (!expirationDate) return "active";

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (callbackDate) {
    const cb = typeof callbackDate === "string" ? new Date(callbackDate) : callbackDate;
    if (!isNaN(cb.getTime())) {
      if (cb <= todayEnd) {
        if (cb < todayStart) return "overdue";
        return "due_today";
      }
    }
  }

  const exp = typeof expirationDate === "string" ? new Date(expirationDate) : expirationDate;
  if (isNaN(exp.getTime())) return "active";

  if (exp < todayStart) {
    return "overdue";
  }

  const fourteenDaysFuture = new Date(todayStart.getTime() + 14 * 24 * 60 * 60 * 1000);
  if (exp <= fourteenDaysFuture) {
    return "expiring_soon";
  }

  return "active";
}

/**
 * Formats a phone number for Algerian WhatsApp (replaces leading 0 with 213).
 */
export function formatAlgerianPhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.startsWith("0")) {
    return `213${digits.slice(1)}`;
  }
  if (!digits.startsWith("213") && digits.length >= 9) {
    return `213${digits}`;
  }
  return digits;
}

/**
 * Generates a clean WhatsApp link with a professional reinscription template.
 * Strictly no emojis.
 */
export function formatWhatsAppReinscriptionUrl(
  phone: string,
  fullName: string,
  currentFormula?: string | null
): string {
  const waNumber = formatAlgerianPhoneForWhatsApp(phone);
  const formulaText = currentFormula ? ` (formule ${currentFormula})` : "";
  const message = `Salam ${fullName}, l'equipe AQA Swim vous contacte pour le renouvellement de votre inscription${formulaText}. Souhaitez-vous conserver votre creneau habituel ou ajuster votre formule pour la prochaine session ? N'hesitez pas a nous repondre ou a nous contacter directement.`;
  return `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
}

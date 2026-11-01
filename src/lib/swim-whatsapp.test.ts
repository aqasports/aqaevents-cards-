import { describe, it, expect } from "vitest";
import {
  extractWhatsAppNumber,
  formatWhatsAppNumber,
  resolveSwimWhatsApp,
  hasValidSwimPhone,
  getSwimWhatsAppUrl,
  getSwimPaymentWhatsAppUrl,
  buildSwimPaymentRequestMessage,
  getSwimPaymentRequestWhatsAppUrl,
  parsePaymentRequestFromNotes,
  encodePaymentRequestInNotes,
} from "./swim-whatsapp";

describe("AQA Swim WhatsApp Utilities", () => {
  describe("extractWhatsAppNumber", () => {
    it("extracts WhatsApp number from standard delimited notes", () => {
      const notes = "Canal: Instagram | WhatsApp: 0555123456 | Ville: Alger";
      expect(extractWhatsAppNumber(notes)).toBe("0555123456");
    });

    it("extracts spaced or dashed WhatsApp numbers", () => {
      const notes = "Canal: Facebook | WhatsApp: 0770 12 34 56 | Creneau: matin";
      expect(extractWhatsAppNumber(notes)).toBe("0770 12 34 56");
    });

    it("extracts international +213 prefixed numbers", () => {
      const notes = "Canal: site | WhatsApp: +213 661 22 33 44";
      expect(extractWhatsAppNumber(notes)).toBe("+213 661 22 33 44");
    });

    it("extracts WA shorthand", () => {
      const notes = "WA: 0550112233 | Age: 25";
      expect(extractWhatsAppNumber(notes)).toBe("0550112233");
    });

    it("extracts from JSON serialized notes", () => {
      const jsonNotes = JSON.stringify({
        whatsapp: "0555987654",
        source: "landing",
      });
      expect(extractWhatsAppNumber(jsonNotes)).toBe("0555987654");
    });

    it("returns null when no valid whatsapp number exists", () => {
      expect(extractWhatsAppNumber("Canal: Instagram | Pack Equipement: Oui")).toBeNull();
      expect(extractWhatsAppNumber("WhatsApp: non")).toBeNull();
      expect(extractWhatsAppNumber("WhatsApp: 0000000000")).toBeNull();
      expect(extractWhatsAppNumber(null)).toBeNull();
      expect(extractWhatsAppNumber("")).toBeNull();
    });
  });

  describe("formatWhatsAppNumber", () => {
    it("formats 10-digit Algerian phone number starting with 0", () => {
      expect(formatWhatsAppNumber("0555123456")).toBe("213555123456");
      expect(formatWhatsAppNumber("0661234567")).toBe("213661234567");
      expect(formatWhatsAppNumber("0770123456")).toBe("213770123456");
    });

    it("handles phone numbers with spaces, dashes, or plus signs", () => {
      expect(formatWhatsAppNumber("+213 555 12 34 56")).toBe("213555123456");
      expect(formatWhatsAppNumber("0555-12-34-56")).toBe("213555123456");
      expect(formatWhatsAppNumber("00213555123456")).toBe("213555123456");
    });

    it("returns empty string for empty or null inputs", () => {
      expect(formatWhatsAppNumber(null)).toBe("");
      expect(formatWhatsAppNumber("")).toBe("");
      expect(formatWhatsAppNumber("abc")).toBe("");
    });
  });

  describe("resolveSwimWhatsApp", () => {
    it("prioritizes distinct client WhatsApp added in notes over phone", () => {
      const result = resolveSwimWhatsApp({
        phone: "0550112233",
        notes: "Canal: Instagram | WhatsApp: 0770998877 | Ville: Alger",
      });

      expect(result.hasDistinctWhatsApp).toBe(true);
      expect(result.whatsappNumber).toBe("0770998877");
      expect(result.formattedNumber).toBe("213770998877");
      expect(result.source).toBe("notes");
    });

    it("identifies when phone and whatsapp are the same", () => {
      const result = resolveSwimWhatsApp({
        phone: "0555123456",
        notes: "Canal: Instagram | WhatsApp: +213 555 12 34 56",
      });

      expect(result.hasDistinctWhatsApp).toBe(false);
      expect(result.formattedNumber).toBe("213555123456");
    });

    it("falls back to phone when no WhatsApp number was added", () => {
      const result = resolveSwimWhatsApp({
        phone: "0661234567",
        notes: "Canal: Instagram | Ville: Oran",
      });

      expect(result.hasDistinctWhatsApp).toBe(false);
      expect(result.whatsappNumber).toBe("0661234567");
      expect(result.formattedNumber).toBe("213661234567");
      expect(result.source).toBe("phone");
    });

    it("prioritizes explicit whatsapp field if present", () => {
      const result = resolveSwimWhatsApp({
        phone: "0550112233",
        whatsapp: "0777334455",
        notes: "Canal: Instagram | WhatsApp: 0666112233",
      });

      expect(result.hasDistinctWhatsApp).toBe(true);
      expect(result.whatsappNumber).toBe("0777334455");
      expect(result.formattedNumber).toBe("213777334455");
      expect(result.source).toBe("explicit");
    });
  });

  describe("getSwimWhatsAppUrl", () => {
    it("generates confirmed swimmer URL pointing to distinct WhatsApp number", () => {
      const url = getSwimWhatsAppUrl({
        fullName: "Karim Meziani",
        phone: "0555111222",
        notes: "WhatsApp: 0770444555",
        swimId: "SWM-100200",
        group: {
          name: "Lun 18:00 Karim B Bass",
          schedule: "Lundi 18:00",
          coachName: "Karim Benali",
        },
      }, "member");

      expect(url).not.toBeNull();
      expect(url).toContain("https://wa.me/213770444555?text=");
      expect(url).toContain(encodeURIComponent("Karim Meziani"));
      expect(url).toContain(encodeURIComponent("SWM-100200"));
      expect(url).toContain(encodeURIComponent("Lun 18:00 Karim B Bass"));
    });

    it("generates lead follow-up URL pointing to distinct WhatsApp number", () => {
      const url = getSwimWhatsAppUrl({
        fullName: "Sara Belkacem",
        phone: "0550112233",
        notes: "Canal: Facebook | WhatsApp: 0661998877",
        formula: "G10",
      }, "lead");

      expect(url).not.toBeNull();
      expect(url).toContain("https://wa.me/213661998877?text=");
      expect(url).toContain(encodeURIComponent("Sara Belkacem"));
      expect(url).toContain(encodeURIComponent("G10"));
    });

    it("falls back to phone when phone is the same or whatsapp not provided", () => {
      const url = getSwimWhatsAppUrl({
        fullName: "Amine Cherif",
        phone: "0555001122",
        notes: "Objectif: Sport",
        formula: "MAX5",
      }, "lead");

      expect(url).not.toBeNull();
      expect(url).toContain("https://wa.me/213555001122?text=");
    });

    it("returns null if neither phone nor whatsapp exists", () => {
      const url = getSwimWhatsAppUrl({
        fullName: "No Phone User",
        phone: null,
        notes: null,
      });

      expect(url).toBeNull();
    });
  });

  describe("getSwimPaymentWhatsAppUrl", () => {
    it("generates BaridiMob payment link requesting RIP in French", () => {
      const url = getSwimPaymentWhatsAppUrl({
        fullName: "Yacine Belkacem",
        swimId: "SWM-4001",
        method: "baridimob",
        amount: 24000,
        formula: "G10",
        locale: "fr",
      });

      expect(url).toContain("https://wa.me/213540454907?text=");
      expect(url).toContain(encodeURIComponent("Yacine Belkacem"));
      expect(url).toContain(encodeURIComponent("SWM-4001"));
      expect(url).toContain(encodeURIComponent("24000 DA"));
      expect(url).toContain(encodeURIComponent("BaridiMob"));
      expect(url).toContain(encodeURIComponent("RIP"));
    });

    it("generates BaridiMob payment link in Arabic with Western Arabic numerals", () => {
      const url = getSwimPaymentWhatsAppUrl({
        fullName: "ياسين بلقاسم",
        swimId: "SWM-4001",
        method: "baridimob",
        amount: 24000,
        locale: "ar",
      });

      expect(url).toContain("https://wa.me/213540454907?text=");
      expect(url).toContain(encodeURIComponent("ياسين بلقاسم"));
      expect(url).toContain(encodeURIComponent("SWM-4001"));
      expect(url).toContain(encodeURIComponent("24000 دج"));
      expect(url).toContain(encodeURIComponent("بريدي موب"));
      expect(url).toContain(encodeURIComponent("RIP"));
      // Ensure no Eastern Arabic numerals (U+0662 U+0664 U+0660)
      expect(url).not.toContain(encodeURIComponent("\u0662\u0664\u0660\u0660\u0660"));
    });

    it("generates Cash at Pool appointment link in French", () => {
      const url = getSwimPaymentWhatsAppUrl({
        fullName: "Sofiane Mansouri",
        swimId: "SWM-4002",
        method: "cash_pool",
        amount: 16000,
        formula: "MAX5",
        locale: "fr",
      });

      expect(url).toContain("https://wa.me/213540454907?text=");
      expect(url).toContain(encodeURIComponent("Sofiane Mansouri"));
      expect(url).toContain(encodeURIComponent("SWM-4002"));
      expect(url).toContain(encodeURIComponent("16000 DA"));
      expect(url).toContain(encodeURIComponent("espèces à la piscine"));
      expect(url).toContain(encodeURIComponent("rendez-vous"));
    });

    it("generates Cash at Pool appointment link in English", () => {
      const url = getSwimPaymentWhatsAppUrl({
        fullName: "John Doe",
        swimId: "SWM-4003",
        method: "cash_pool",
        amount: 30000,
        locale: "en",
      });

      expect(url).toContain("https://wa.me/213540454907?text=");
      expect(url).toContain(encodeURIComponent("John Doe"));
      expect(url).toContain(encodeURIComponent("SWM-4003"));
      expect(url).toContain(encodeURIComponent("30000 DA"));
      expect(url).toContain(encodeURIComponent("cash at the pool"));
      expect(url).toContain(encodeURIComponent("appointment"));
    });
  });

  describe("hasValidSwimPhone", () => {
    it("returns false when phone is missing, placeholder, or non-numeric", () => {
      expect(hasValidSwimPhone(null)).toBe(false);
      expect(hasValidSwimPhone({ phone: "" })).toBe(false);
      expect(hasValidSwimPhone({ phone: "Non renseigne" })).toBe(false);
      expect(hasValidSwimPhone({ phone: "0000000000" })).toBe(false);
      expect(hasValidSwimPhone({ phone: "12345" })).toBe(false);
    });

    it("returns true when phone or notes whatsapp is valid", () => {
      expect(hasValidSwimPhone({ phone: "0555123456" })).toBe(true);
      expect(hasValidSwimPhone({ phone: "Non renseigne", notes: "WhatsApp: 0661223344" })).toBe(true);
    });
  });

  describe("buildSwimPaymentRequestMessage & getSwimPaymentRequestWhatsAppUrl", () => {
    it("sends Starter clients a message that payment should be done from 25 to 31 with BaridiMob & Pay at Pool options", () => {
      const msgFr = buildSwimPaymentRequestMessage({
        fullName: "Amine Khelil",
        swimId: "SWM-5001",
        formula: "G10",
        duration: "1m",
        isStarter: true,
        amount: 8000,
        nextMonthLabel: "Novembre 2026",
        paymentOption: "both",
        locale: "fr",
      });

      expect(msgFr).toContain("Amine Khelil");
      expect(msgFr).toContain("25 au 31");
      expect(msgFr).toContain("25th to 31st");
      expect(msgFr).toContain("8000 DA");
      expect(msgFr).toContain("BaridiMob");
      expect(msgFr).toContain("Pay at Pool");

      const msgEn = buildSwimPaymentRequestMessage({
        fullName: "Amine Khelil",
        swimId: "SWM-5001",
        formula: "G10",
        duration: "1m",
        isStarter: true,
        amount: 8000,
        paymentOption: "both",
        locale: "en",
      });

      expect(msgEn).toContain("from the 25th to the 31st");
      expect(msgEn).toContain("BaridiMob");
      expect(msgEn).toContain("Pay at Pool");
    });

    it("sends other formulas a message that subscription will expire soon with payment options", () => {
      const msgFr = buildSwimPaymentRequestMessage({
        fullName: "Nadia Mansouri",
        swimId: "SWM-5002",
        formula: "MAX5",
        duration: "3m",
        isStarter: false,
        amount: 24000,
        subscriptionEnd: "2026-11-15T00:00:00.000Z",
        paymentOption: "both",
        locale: "fr",
      });

      expect(msgFr).toContain("Nadia Mansouri");
      expect(msgFr).toContain("Your subscription will expire soon");
      expect(msgFr).toContain("15/11/2026");
      expect(msgFr).toContain("24000 DA");
      expect(msgFr).toContain("BaridiMob");
      expect(msgFr).toContain("Pay at Pool");

      const msgAr = buildSwimPaymentRequestMessage({
        fullName: "نادية منصوري",
        swimId: "SWM-5002",
        formula: "MAX5",
        duration: "6m",
        isStarter: false,
        amount: 45000,
        paymentOption: "both",
        locale: "ar",
      });

      expect(msgAr).toContain("اشتراكك سينتهي قريبا");
      expect(msgAr).toContain("Your subscription will expire soon");
      expect(msgAr).toContain("45000 دج");
      expect(msgAr).toContain("BaridiMob");
      expect(msgAr).toContain("Pay at Pool");
    });

    it("returns null URL when client has no linked phone number", () => {
      const url = getSwimPaymentRequestWhatsAppUrl({
        fullName: "No Phone Client",
        phone: "Non renseigne",
        swimId: "SWM-5003",
        formula: "G10",
        duration: "1m",
      });
      expect(url).toBeNull();
    });

    it("encodes and parses payment request sent metadata in notes", () => {
      const notes = encodePaymentRequestInNotes("Existing note", "2026-11-01", "baridimob");
      expect(notes).toContain("[PAY_REQ_SENT:2026-11-01:baridimob]");
      const parsed = parsePaymentRequestFromNotes(notes);
      expect(parsed).toEqual({ sentAt: "2026-11-01", option: "baridimob" });
    });
  });
});


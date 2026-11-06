import { describe, expect, it } from "vitest";
import {
  parsePaymentTags,
  rebuildPaymentNotesOnEdit,
  reconcileMemberAfterPaymentChange,
  stripPaymentSystemTags,
} from "./swim-payment-reconcile";

describe("swim-payment-reconcile", () => {
  it("parses and strips structured tags cleanly", () => {
    const raw =
      "[NEXT_MONTH:2026-12] [USED_SIDE_POCKET:1500] Paiement abonnement mois prochain (Decembre 2026)";
    const parsed = parsePaymentTags(raw);
    expect(parsed.monthTag).toEqual({ type: "NEXT_MONTH", monthKey: "2026-12" });
    expect(parsed.usedSidePocket).toBe(1500);
    expect(parsed.cleanNotes).toBe("Paiement abonnement mois prochain (Decembre 2026)");
    expect(stripPaymentSystemTags(raw)).toBe("Paiement abonnement mois prochain (Decembre 2026)");
  });

  it("rebuilds payment notes on edit and syncs side pocket deposit tag when amount changes", () => {
    const updated = rebuildPaymentNotesOnEdit({
      oldNotes: "[SIDE_POCKET_DEPOSIT:50000] Depot erreur",
      oldAmount: 50000,
      newAmount: 5000,
      newCleanNotes: "Depot corrige",
    });
    expect(updated).toBe("[SIDE_POCKET_DEPOSIT:5000] Depot corrige");

    const switchedCycle = rebuildPaymentNotesOnEdit({
      oldNotes: "[NEXT_MONTH:2026-12] Avance",
      oldAmount: 7800,
      newAmount: 7800,
      newCleanNotes: "Reglement Novembre",
      cycleMode: "month",
      cycleMonth: "2026-11",
    });
    expect(switchedCycle).toBe("[MONTH:2026-11] Reglement Novembre");
  });

  it("updates 3m member paymentStatus from paid to partial on edit and unpaid on erase", () => {
    const baseMember = {
      category: "homme",
      duration: "3m",
      formula: "G10",
      priceDA: 21900,
      paymentStatus: "paid",
      notes: null,
      dateOfStart: "2026-11-01T00:00:00.000Z",
      subscriptionStart: "2026-11-01T00:00:00.000Z",
      subscriptionEnd: "2027-01-29T00:00:00.000Z",
    };
    const oldPayment = {
      id: "pay_1",
      amount: 21900,
      method: "cash",
      notes: "Recu complet",
      paidAt: "2026-11-02T10:00:00.000Z",
    };

    const edited = reconcileMemberAfterPaymentChange({
      member: baseMember,
      oldPayment,
      updatedPayment: { ...oldPayment, amount: 10000 },
      otherPayments: [],
      referenceDate: new Date("2026-11-06T12:00:00.000Z"),
    });
    expect(edited.paymentStatus).toBe("partial");

    const erased = reconcileMemberAfterPaymentChange({
      member: baseMember,
      oldPayment,
      updatedPayment: null,
      otherPayments: [],
      referenceDate: new Date("2026-11-06T12:00:00.000Z"),
    });
    expect(erased.paymentStatus).toBe("unpaid");
  });

  it("sets Starter member to unpaid when erasing their sole payment", () => {
    const starterMember = {
      category: "homme",
      duration: "1m",
      formula: "G10",
      priceDA: 7800,
      paymentStatus: "paid",
      notes: null,
      dateOfStart: "2026-11-01T00:00:00.000Z",
      subscriptionStart: "2026-11-01T00:00:00.000Z",
      subscriptionEnd: "2026-11-30T00:00:00.000Z",
    };
    const solePayment = {
      id: "pay_nov",
      amount: 7800,
      method: "cash",
      notes: "[MONTH:2026-11] Reglement Novembre 2026",
      paidAt: "2026-11-02T10:00:00.000Z",
    };

    const erased = reconcileMemberAfterPaymentChange({
      member: starterMember,
      assignedGroupLevels: ["G10"],
      oldPayment: solePayment,
      updatedPayment: null,
      otherPayments: [],
      referenceDate: new Date("2026-11-06T12:00:00.000Z"),
    });

    expect(erased.paymentStatus).toBe("unpaid");
    expect(erased.subscriptionEnd?.toISOString().split("T")[0]).toBe("2026-11-30");
  });

  it("rolls back Starter subscriptionEnd and [NEXT_MONTH_PAID] tag when advance payment is erased", () => {
    const starterMember = {
      category: "homme",
      duration: "1m",
      formula: "G10",
      priceDA: 7800,
      paymentStatus: "paid",
      notes: "Swimmer VIP | [NEXT_MONTH_PAID:2026-12]",
      dateOfStart: "2026-11-01T00:00:00.000Z",
      subscriptionStart: "2026-11-01T00:00:00.000Z",
      subscriptionEnd: "2026-12-31T00:00:00.000Z",
    };
    const novPayment = {
      id: "pay_nov",
      amount: 7800,
      method: "cash",
      notes: "[MONTH:2026-11] Reglement Novembre 2026",
      paidAt: "2026-11-01T10:00:00.000Z",
    };
    const decAdvancePayment = {
      id: "pay_dec",
      amount: 7800,
      method: "baridi_mob",
      notes: "[NEXT_MONTH:2026-12] Avance Decembre 2026",
      paidAt: "2026-11-05T10:00:00.000Z",
    };

    const result = reconcileMemberAfterPaymentChange({
      member: starterMember,
      assignedGroupLevels: ["G10"],
      oldPayment: decAdvancePayment,
      updatedPayment: null,
      otherPayments: [novPayment],
      referenceDate: new Date("2026-11-06T12:00:00.000Z"),
    });

    expect(result.paymentStatus).toBe("paid");
    expect(result.notes).toBe("Swimmer VIP");
    expect(result.subscriptionEnd?.toISOString().split("T")[0]).toBe("2026-11-30");
  });

  it("reconciles Side Pocket (Avoir Club) deposits and deductions on edit and erase", () => {
    const member = {
      category: "femme",
      duration: "3m",
      formula: "G10",
      priceDA: 21900,
      paymentStatus: "paid",
      notes: "[SIDE_POCKET:50000]",
      dateOfStart: "2026-11-01T00:00:00.000Z",
      subscriptionStart: "2026-11-01T00:00:00.000Z",
      subscriptionEnd: "2027-01-29T00:00:00.000Z",
    };
    const depositPayment = {
      id: "pay_dep",
      amount: 50000,
      method: "cash",
      notes: "[SIDE_POCKET_DEPOSIT:50000] Erreur frappe",
      paidAt: "2026-11-05T10:00:00.000Z",
    };

    const edited = reconcileMemberAfterPaymentChange({
      member,
      oldPayment: depositPayment,
      updatedPayment: {
        ...depositPayment,
        amount: 5000,
        notes: "[SIDE_POCKET_DEPOSIT:5000] Corrige",
      },
      otherPayments: [
        {
          id: "pay_base",
          amount: 21900,
          method: "cash",
          notes: null,
          paidAt: "2026-11-01T10:00:00.000Z",
        },
      ],
    });
    expect(edited.notes).toBe("[SIDE_POCKET:5000]");

    const erased = reconcileMemberAfterPaymentChange({
      member,
      oldPayment: depositPayment,
      updatedPayment: null,
      otherPayments: [],
    });
    expect(erased.notes).toBeNull();
  });

  it("reverts formula upgrade back to Starter 1m when erasing an [UPGRADE:3m] payment", () => {
    const upgradedMember = {
      category: "homme",
      duration: "3m",
      formula: "G10 Silver (3m)",
      priceDA: 21900,
      paymentStatus: "paid",
      notes: null,
      dateOfStart: "2026-11-01T00:00:00.000Z",
      subscriptionStart: "2026-11-01T00:00:00.000Z",
      subscriptionEnd: "2027-01-29T00:00:00.000Z",
    };
    const starterPayment = {
      id: "pay_1",
      amount: 7800,
      method: "cash",
      notes: "[MONTH:2026-11] Reglement Novembre 2026",
      paidAt: "2026-11-01T10:00:00.000Z",
    };
    const upgradePayment = {
      id: "pay_upg",
      amount: 14100,
      method: "cash",
      notes: "[UPGRADE:3m] Complement Silver",
      paidAt: "2026-11-06T10:00:00.000Z",
    };

    const reverted = reconcileMemberAfterPaymentChange({
      member: upgradedMember,
      assignedGroupLevels: ["G10"],
      oldPayment: upgradePayment,
      updatedPayment: null,
      otherPayments: [starterPayment],
      revertUpgrade: true,
      referenceDate: new Date("2026-11-06T12:00:00.000Z"),
    });

    expect(reverted.upgradeReverted).toBe(true);
    expect(reverted.duration).toBe("1m");
    expect(reverted.formula).toBe("G10");
    expect(reverted.priceDA).toBe(7800);
    expect(reverted.paymentStatus).toBe("paid");
    expect(reverted.subscriptionEnd?.toISOString().split("T")[0]).toBe("2026-11-30");
  });
});

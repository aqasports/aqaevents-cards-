import { eventBus, EVENTS } from "@/lib/events";
import { generateCardCode, generatePublicToken } from "@/lib/tokens";
import { syncClientCRM } from "@/lib/crm";
import { sendSimulatedNotification } from "@/lib/notifications";
import { getClientBalance } from "@/lib/balance";
import { ClientsRepository } from "./clients/clients.repository";
import { CardsRepository } from "./cards/cards.repository";
import { BillingRepository } from "./billing/billing.repository";
import { ReportingRepository } from "./reporting/reporting.repository";

const clientsRepo = new ClientsRepository();
const cardsRepo = new CardsRepository();
const billingRepo = new BillingRepository();
const reportingRepo = new ReportingRepository();

function generateInvoiceCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "INV-";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function uniqueInvoiceCode(tx: any): Promise<string> {
  let code = generateInvoiceCode();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await billingRepo.findInvoiceUnique({ where: { invoiceCode: code } }, tx);
    if (!existing) return code;
    code = generateInvoiceCode();
  }
}

// -------------------------------------------------------------
// 1. CLIENT_CREATED Listeners
// -------------------------------------------------------------

// Card Listener
eventBus.on(EVENTS.CLIENT_CREATED, async (payload: any) => {
  let card = null;
  if (payload.preCardCode) {
    const existing = await cardsRepo.findFirst(
      {
        where: { cardCode: payload.preCardCode.trim().toUpperCase() },
      },
      payload.tx
    );
    if (!existing) {
      throw new Error(`Card code "${payload.preCardCode}" not found. Generate it first from the Print page.`);
    }
    if (existing.clientId) {
      throw new Error(`Card ${payload.preCardCode} is already assigned to another client.`);
    }
    card = await cardsRepo.update(
      {
        where: { id: existing.id },
        data: { clientId: payload.client.id },
      },
      payload.tx
    );
  } else if (payload.issueCard) {
    card = await cardsRepo.create(
      {
        data: {
          clientId: payload.client.id,
          publicToken: generatePublicToken(),
          cardCode: generateCardCode(),
        },
      },
      payload.tx
    );
  }
  payload.card = card;
});

// Initial Package Listener
eventBus.on(EVENTS.CLIENT_CREATED, async (payload: any) => {
  if (payload.packageId) {
    await eventBus.emit(EVENTS.PACKAGE_PURCHASED, {
      clientId: payload.client.id,
      packageId: payload.packageId,
      adminId: payload.adminId,
      cardId: payload.card?.id,
      tx: payload.tx,
      isInitialSignup: true,
    });
  }
});

// Sync CRM Listener
eventBus.on(EVENTS.CLIENT_CREATED, async (payload: any) => {
  await syncClientCRM(payload.client.id, payload.tx);
});

// Audit Log Listener
eventBus.on(EVENTS.CLIENT_CREATED, async (payload: any) => {
  // Run after transaction commits to get final balance
  payload.postCommitActions = payload.postCommitActions ?? [];
  payload.postCommitActions.push(async () => {
    const finalBalance = await getClientBalance(payload.client.id);
    await reportingRepo.createAudit({
      data: {
        userId: payload.adminId,
        action: "CREATE_CLIENT",
        target: `Client ${payload.client.fullName}`,
        details: `Created client ${payload.client.fullName} (${payload.client.email || "No email"}). Card code: ${payload.card?.cardCode || "None"}. Initial Balance: ${finalBalance} credits.`,
      },
    });
  });
});

// Notifications Listener
eventBus.on(EVENTS.CLIENT_CREATED, async (payload: any) => {
  payload.postCommitActions = payload.postCommitActions ?? [];
  payload.postCommitActions.push(async () => {
    const finalBalance = await getClientBalance(payload.client.id);
    if (payload.client.email) {
      await sendSimulatedNotification(
        payload.client.id,
        "email",
        payload.client.email,
        `Welcome to AQA Sports, ${payload.client.fullName}! Your prepaid card is now active. Card Code: ${payload.card?.cardCode || "None"}. Scan the QR code to track your activity balance online anytime.`,
        "Welcome to AQA Sports!"
      );
    }

    if (payload.client.phone) {
      await sendSimulatedNotification(
        payload.client.id,
        "sms",
        payload.client.phone,
        `AQA Sports: Welcome ${payload.client.fullName}! Your event card is active. Code: ${payload.card?.cardCode || "None"}. Initial Balance: ${finalBalance} credits.`
      );

      if (payload.packageId) {
        await sendSimulatedNotification(
          payload.client.id,
          "sms",
          payload.client.phone,
          `AQA Sports: Recharge successful. Loaded package credits. Your current balance is: ${finalBalance} activities.`
        );
      }
    }
  });
});

// -------------------------------------------------------------
// 2. PACKAGE_PURCHASED Listeners
// -------------------------------------------------------------

// Ledger Listener
eventBus.on(EVENTS.PACKAGE_PURCHASED, async (payload: any) => {
  let activeCardId = payload.cardId;
  if (!activeCardId) {
    const activeCard = await cardsRepo.findFirst(
      {
        where: { clientId: payload.clientId, status: "active" },
      },
      payload.tx
    );
    activeCardId = activeCard?.id || null;
  }

  let delta = payload.customAmount ?? 0;
  let reason = payload.reason;
  let pkgData = null;

  if (payload.packageId) {
    const pkg = await billingRepo.findPackageUnique({ where: { id: payload.packageId } }, payload.tx);
    if (!pkg) throw new Error("Package not found");
    delta = pkg.totalCredits;
    pkgData = pkg;
    reason = reason ?? `Package: ${pkg.name} (${pkg.creditAmount} paid + ${pkg.bonusCredits} bonus)`;
  }

  if (delta === 0) {
    throw new Error("Provide packageId or a non-zero customAmount");
  }

  const ledger = await billingRepo.createLedger(
    {
      data: {
        clientId: payload.clientId,
        cardId: activeCardId,
        packageId: payload.packageId || null,
        delta,
        type: delta > 0 ? "credit" : "debit",
        reason: reason || (delta > 0 ? "Manual credit addition" : "Manual debit adjustment"),
        createdById: payload.adminId,
      },
    },
    payload.tx
  );

  payload.ledgerEntry = ledger;
  payload.delta = delta;
  payload.reason = reason;
  payload.pkgData = pkgData;
});

// Invoice Generation Listener
eventBus.on(EVENTS.PACKAGE_PURCHASED, async (payload: any) => {
  let inv = null;
  if (payload.invoice) {
    const { amount, category, items, notes, status } = payload.invoice;
    const code = await uniqueInvoiceCode(payload.tx);
    inv = await billingRepo.createInvoice(
      {
        data: {
          clientId: payload.clientId,
          invoiceCode: code,
          amount,
          category,
          items,
          notes: notes ?? null,
          status,
          paidAt: status === "paid" ? new Date() : null,
        },
      },
      payload.tx
    );
  } else if (payload.pkgData) {
    const code = await uniqueInvoiceCode(payload.tx);
    inv = await billingRepo.createInvoice(
      {
        data: {
          clientId: payload.clientId,
          invoiceCode: code,
          amount: payload.pkgData.price,
          category: "package",
          items: `${payload.pkgData.name} Package — ${payload.pkgData.creditAmount} credits + ${payload.pkgData.bonusCredits} bonus (${payload.pkgData.totalCredits} total)` + (payload.isInitialSignup ? " · New client signup" : ""),
          notes: payload.reason ?? null,
          status: "paid",
          paidAt: new Date(),
        },
      },
      payload.tx
    );
  }

  payload.invoiceResult = inv;
});

// CRM Sync Listener
eventBus.on(EVENTS.PACKAGE_PURCHASED, async (payload: any) => {
  await syncClientCRM(payload.clientId, payload.tx);
});

// Audit Log Listener
eventBus.on(EVENTS.PACKAGE_PURCHASED, async (payload: any) => {
  payload.postCommitActions = payload.postCommitActions ?? [];
  payload.postCommitActions.push(async () => {
    const client = await clientsRepo.findUnique({ where: { id: payload.clientId } });
    const balance = await getClientBalance(payload.clientId);

    await reportingRepo.createAudit({
      data: {
        userId: payload.adminId,
        action: "RECHARGE_CLIENT",
        target: `Client ${client.fullName}`,
        details: `Recharged ${client.fullName} with ${payload.delta} credits. Reason: ${payload.reason}. New Balance: ${balance} credits.`,
      },
    });
  });
});

// Notifications Listener
eventBus.on(EVENTS.PACKAGE_PURCHASED, async (payload: any) => {
  // Skip notification sending during initial signup to prevent duplicate SMS (since CLIENT_CREATED sends it)
  if (payload.isInitialSignup) return;

  payload.postCommitActions = payload.postCommitActions ?? [];
  payload.postCommitActions.push(async () => {
    const client = await clientsRepo.findUnique({ where: { id: payload.clientId } });
    const balance = await getClientBalance(payload.clientId);

    const notificationMessage = `Hello ${client.fullName}, a balance adjustment of ${payload.delta > 0 ? `+${payload.delta}` : payload.delta} credits has been applied to your AQA Sports event card. Your current balance is: ${balance} credits.`;

    if (client.phone) {
      await sendSimulatedNotification(payload.clientId, "sms", client.phone, `AQA Sports: ${notificationMessage}`);
    }

    if (client.email) {
      await sendSimulatedNotification(payload.clientId, "email", client.email, notificationMessage, "AQA Sports Event Card Balance Update");
    }
  });
});

// -------------------------------------------------------------
// 3. ACTIVITY_REDEEMED Listeners
// -------------------------------------------------------------

// Ledger Listener
eventBus.on(EVENTS.ACTIVITY_REDEEMED, async (payload: any) => {
  const currentBalance = await billingRepo.sumLedgerDelta(payload.client.id, payload.tx);
  if (currentBalance < payload.activity.creditCost) {
    throw new Error("INSUFFICIENT_BALANCE");
  }

  const redemption = await billingRepo.createRedemption(
    {
      data: {
        clientId: payload.client.id,
        activityId: payload.activity.id,
        sessionId: payload.sessionId || null,
        creditsUsed: payload.activity.creditCost,
        staffId: payload.adminId,
        notes: payload.notes || null,
      },
      include: {
        activity: true,
        session: true,
      },
    },
    payload.tx
  );

  const ledger = await billingRepo.createLedger(
    {
      data: {
        clientId: payload.client.id,
        cardId: payload.client.cards[0]?.id || null,
        redemptionId: redemption.id,
        delta: -payload.activity.creditCost,
        type: "debit",
        reason: `Redeemed ${payload.activity.name}`,
        createdById: payload.adminId,
      },
    },
    payload.tx
  );

  payload.redemptionResult = redemption;
  payload.ledgerEntry = ledger;
});

// CRM Sync Listener
eventBus.on(EVENTS.ACTIVITY_REDEEMED, async (payload: any) => {
  await syncClientCRM(payload.client.id, payload.tx);
});

// Audit Log Listener
eventBus.on(EVENTS.ACTIVITY_REDEEMED, async (payload: any) => {
  payload.postCommitActions = payload.postCommitActions ?? [];
  payload.postCommitActions.push(async () => {
    const newBalance = await getClientBalance(payload.client.id);
    await reportingRepo.createAudit({
      data: {
        userId: payload.adminId,
        action: "REDEEM_ACTIVITY",
        target: `Client ${payload.client.fullName}`,
        details: `Redeemed activity "${payload.activity.name}" for ${payload.client.fullName}. Credits deducted: -${payload.activity.creditCost}. New Balance: ${newBalance} credits.`,
      },
    });
  });
});

// Notification Listener
eventBus.on(EVENTS.ACTIVITY_REDEEMED, async (payload: any) => {
  payload.postCommitActions = payload.postCommitActions ?? [];
  payload.postCommitActions.push(async () => {
    const newBalance = await getClientBalance(payload.client.id);
    const notificationMessage = `Hello ${payload.client.fullName}, activity "${payload.activity.name}" was successfully redeemed. -${payload.activity.creditCost} credits applied. Your remaining balance is: ${newBalance} credits.`;

    if (payload.client.phone) {
      await sendSimulatedNotification(payload.client.id, "sms", payload.client.phone, `AQA Sports: ${notificationMessage}`);
    }

    if (payload.client.email) {
      await sendSimulatedNotification(payload.client.id, "email", payload.client.email, notificationMessage, "AQA Sports Event Activity Redeemed");
    }
  });
});

// -------------------------------------------------------------
// 4. REDEMPTION_DELETED Listeners
// -------------------------------------------------------------

// CRM Sync Listener
eventBus.on(EVENTS.REDEMPTION_DELETED, async (payload: any) => {
  await syncClientCRM(payload.clientId, payload.tx);
});

// Audit Log Listener
eventBus.on(EVENTS.REDEMPTION_DELETED, async (payload: any) => {
  payload.postCommitActions = payload.postCommitActions ?? [];
  payload.postCommitActions.push(async () => {
    const client = await clientsRepo.findUnique({ where: { id: payload.clientId } });
    const newBalance = await getClientBalance(payload.clientId);

    await reportingRepo.createAudit({
      data: {
        userId: payload.adminId,
        action: "DELETE_REDEMPTION",
        target: `Client ${client.fullName}`,
        details: `Deleted redemption of "${payload.redemption.activity.name}" for ${client.fullName}. Credits restored: +${payload.redemption.creditsUsed}. New Balance: ${newBalance} credits.`,
      },
    });
  });
});

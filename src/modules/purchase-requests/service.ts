/* eslint-disable @typescript-eslint/no-explicit-any */
import { PurchaseRequestsRepository } from "./repository";
import { ClientsRepository } from "../clients/repository";
import { BillingService } from "../invoices/service";
import { sendSimulatedNotification } from "@/lib/notifications";

export class PurchaseRequestsService {
  private repo = new PurchaseRequestsRepository();
  private clientsRepo = new ClientsRepository();
  private billingService = new BillingService();

  async createPurchaseRequest(data: {
    cardId: string;
    clientId: string;
    type: string;
    payload: any;
  }) {
    const client = await this.clientsRepo.findUnique({
      where: { id: data.clientId },
    });

    if (!client) {
      throw new Error("Client not found");
    }

    const confirmationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes TTL

    const request = await this.repo.create({
      data: {
        cardId: data.cardId,
        clientId: data.clientId,
        type: data.type,
        payload: JSON.stringify(data.payload),
        status: "pending_confirmation",
        confirmationCode,
        expiresAt,
      },
    });

    const recipient = client.phone || client.email || "";
    const notificationType = client.phone ? "sms" : "email";

    if (recipient) {
      const msg = `Your confirmation code for your AQA card purchase is ${confirmationCode}. Valid for 10 minutes.`;
      await sendSimulatedNotification(
        client.id,
        notificationType,
        recipient,
        msg,
        "AQA Card Purchase Confirmation Code"
      );
    }

    return {
      status: "confirmation_required",
      requestId: request.id,
    };
  }

  async confirmPurchaseRequest(data: {
    requestId: string;
    confirmationCode: string;
  }) {
    const request = await this.repo.findUnique({
      where: { id: data.requestId },
    });

    if (!request) {
      throw new Error("Purchase request not found");
    }

    if (request.status === "confirmed") {
      throw new Error("Purchase request has already been confirmed");
    }

    if (request.status !== "pending_confirmation") {
      throw new Error("Invalid purchase request status");
    }

    if (new Date() > new Date(request.expiresAt)) {
      await this.repo.update({
        where: { id: request.id },
        data: { status: "expired" },
      });
      throw new Error("Confirmation code has expired");
    }

    if (request.confirmationCode !== data.confirmationCode) {
      throw new Error("Invalid confirmation code");
    }

    const payload = JSON.parse(request.payload);

    const billingResult = await this.billingService.createInvoiceWithCredits(payload);

    await this.repo.update({
      where: { id: request.id },
      data: { status: "confirmed" },
    });

    return billingResult;
  }
}

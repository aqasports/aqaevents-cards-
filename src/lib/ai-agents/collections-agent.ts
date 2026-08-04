import { prisma } from "@/lib/prisma";
import { ProposedActionsService } from "@/modules/proposed-actions/service";
import { logger } from "@/lib/logger";

export interface CollectionsAgentResult {
  proposalsCreated: number;
  skippedInvoices: number;
  errors: string[];
}

export class CollectionsAgent {
  private proposedActionsService: ProposedActionsService;

  constructor() {
    this.proposedActionsService = new ProposedActionsService();
  }

  async runCollectionsCheck(): Promise<CollectionsAgentResult> {
    const now = new Date();
    const result: CollectionsAgentResult = {
      proposalsCreated: 0,
      skippedInvoices: 0,
      errors: [],
    };

    try {
      // Find invoices that are unpaid or pending, where payment is due or past due
      const overdueInvoices = await prisma.invoice.findMany({
        where: {
          status: { in: ["unpaid", "pending", "overdue"] },
        },
        select: {
          id: true,
          clientId: true,
          organizationId: true,
          invoiceCode: true,
          amount: true,
          status: true,
          category: true,
          items: true,
          notes: true,
          paidAt: true,
          createdAt: true,
          client: { select: { id: true, fullName: true, email: true, phone: true } },
          organization: { select: { id: true, name: true, slug: true } },
        },
      });

      for (const invoice of overdueInvoices) {
        const due = invoice.createdAt;
        const diffMs = now.getTime() - due.getTime();
        const daysOverdue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

        // Avoid duplicate pending proposals for the same invoice
        const existingProposal = await prisma.aiActionQueue.findFirst({
          where: {
            actionType: "SEND_PAYMENT_REMINDER",
            targetEntityId: invoice.id,
            status: "pending",
          },
        });

        if (existingProposal) {
          result.skippedInvoices++;
          continue;
        }

        const clientName = invoice.client?.fullName || invoice.organization?.name || "Client";
        const contactEmail = invoice.client?.email || null;

        const reasoning = `Invoice ${invoice.invoiceCode} for ${clientName} is ${daysOverdue} day(s) overdue. Outstanding balance: ${invoice.amount} DA. Due date: ${due.toISOString().split("T")[0]}.`;

        const reminderMessage = `Dear ${clientName}, this is a reminder that payment for Invoice ${invoice.invoiceCode} in the amount of ${invoice.amount} DA was due on ${due.toISOString().split("T")[0]}. Please settle at your earliest convenience.`;

        const payload = JSON.stringify({
          invoiceId: invoice.id,
          invoiceCode: invoice.invoiceCode,
          amount: invoice.amount,
          clientName,
          recipientEmail: contactEmail,
          daysOverdue,
          message: reminderMessage,
        });

        await this.proposedActionsService.createProposal({
          actionType: "SEND_PAYMENT_REMINDER",
          proposedPayload: payload,
          reasoning,
          organizationId: invoice.organizationId || null,
          targetEntityId: invoice.id,
        });

        result.proposalsCreated++;
      }
    } catch (err: any) {
      logger.error("[CollectionsAgent] Error running collections check:", err);
      result.errors.push(err?.message || "Unknown error during collections check");
    }

    return result;
  }
}

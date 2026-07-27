import { ProposedActionsRepository } from "./repository";
import { logAdminAction } from "@/lib/audit";
import { z } from "zod";
import { proposeActionSchema } from "./validators";

export class ProposedActionsService {
  private repo: ProposedActionsRepository;

  constructor() {
    this.repo = new ProposedActionsRepository();
  }

  async getProposals(status?: string) {
    return this.repo.findMany({
      where: status ? { status } : undefined,
    });
  }

  async createProposal(input: z.infer<typeof proposeActionSchema>) {
    const validated = proposeActionSchema.parse(input);

    return this.repo.create({
      actionType: validated.actionType,
      proposedPayload: validated.proposedPayload,
      reasoning: validated.reasoning,
      status: "pending",
    });
  }

  async executeApprovedAction(proposalId: string, adminId: string, status: "approved" | "rejected") {
    const proposal = await this.repo.findById(proposalId);
    if (!proposal) throw new Error("Proposal not found");
    if (proposal.status !== "pending") throw new Error("Proposal has already been reviewed");

    const updated = await this.repo.update(proposalId, {
      status,
      reviewedBy: adminId,
      reviewedAt: new Date(),
      executedAt: status === "approved" ? new Date() : null,
    });

    await logAdminAction(
      adminId,
      status === "approved" ? "APPROVE_AI_ACTION" : "REJECT_AI_ACTION",
      proposal.actionType,
      `${status.toUpperCase()} AI proposed action ${proposal.actionType} (${proposalId})`
    );

    return updated;
  }
}

import { z } from "zod";

export const proposeActionSchema = z.object({
  actionType: z.string().min(2),
  proposedPayload: z.string().min(2),
  reasoning: z.string().min(2),
});

export const reviewProposalSchema = z.object({
  proposalId: z.string().min(2),
  status: z.enum(["approved", "rejected"]),
});

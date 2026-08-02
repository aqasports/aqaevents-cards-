import { ContractsRepository } from "./repository";
import { logAdminAction } from "@/lib/audit";
import { z } from "zod";
import { createContractSchema, updateContractSchema } from "./validators";

export class ContractsService {
  private repo: ContractsRepository;

  constructor() {
    this.repo = new ContractsRepository();
  }

  async getContracts(organizationId?: string) {
    return this.repo.findMany({
      where: organizationId ? { organizationId } : undefined,
    });
  }

  async getContract(id: string) {
    const contract = await this.repo.findById(id);
    if (!contract) throw new Error("Contract not found");
    return contract;
  }

  async createContract(input: z.infer<typeof createContractSchema>, adminId?: string) {
    const validated = createContractSchema.parse(input);

    const contract = await this.repo.create({
      organization: { connect: { id: validated.organizationId } },
      startDate: validated.startDate,
      endDate: validated.endDate,
      creditRate: validated.creditRate ?? null,
      discountTier: validated.discountTier ?? null,
      autoRenew: validated.autoRenew,
      expiryPolicy: validated.expiryPolicy,
      status: validated.status,
    });

    if (adminId) {
      await logAdminAction(
        adminId,
        "CREATE_CONTRACT",
        contract.organization.name,
        `Created contract (${contract.status}) for ${contract.organization.name}`
      );
    }

    return contract;
  }

  async updateContract(id: string, input: z.infer<typeof updateContractSchema>, adminId?: string) {
    const validated = updateContractSchema.parse(input);
    const existing = await this.repo.findById(id);
    if (!existing) throw new Error("Contract not found");

    const updated = await this.repo.update(id, validated);

    if (adminId) {
      await logAdminAction(
        adminId,
        "UPDATE_CONTRACT",
        existing.organization.name,
        `Updated contract (${id}) status to ${updated.status}`
      );
    }

    return updated;
  }

  async deleteContract(id: string, adminId?: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new Error("Contract not found");

    const deleted = await this.repo.delete(id);

    if (adminId) {
      await logAdminAction(
        adminId,
        "DELETE_CONTRACT",
        existing.organization.name,
        `Deleted contract (${id}) for ${existing.organization.name}`
      );
    }

    return deleted;
  }
}

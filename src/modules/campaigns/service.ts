import { CampaignsRepository } from "./repository";
import { reportingRepo } from "@/modules/reports/repository";
import { z } from "zod";
import { createCampaignSchema, updateCampaignSchema } from "./validators";

export class CampaignsService {
  private repo: CampaignsRepository;

  constructor() {
    this.repo = new CampaignsRepository();
  }

  async getCampaigns() {
    return this.repo.findMany();
  }

  async createCampaign(input: z.infer<typeof createCampaignSchema>, adminId?: string) {
    const validated = createCampaignSchema.parse(input);

    const existing = await this.repo.findByCode(validated.code);
    if (existing) {
      throw new Error(`Campaign code "${validated.code}" already exists`);
    }

    const campaign = await this.repo.create({
      code: validated.code,
      discountType: validated.discountType,
      discountValue: validated.discountValue,
      maxUses: validated.maxUses ?? null,
      validUntil: validated.validUntil ? new Date(validated.validUntil) : null,
    });

    if (adminId) {
      await reportingRepo.createAudit({
        userId: adminId,
        action: "CREATE_CAMPAIGN",
        target: campaign.code,
        details: `Created campaign promo code ${campaign.code} (${campaign.discountType} - ${campaign.discountValue})`,
      });
    }

    return campaign;
  }

  async updateCampaign(id: string, input: z.infer<typeof updateCampaignSchema>, adminId?: string) {
    const validated = updateCampaignSchema.parse(input);

    const updated = await this.repo.update(id, {
      ...validated,
      validUntil: validated.validUntil ? new Date(validated.validUntil) : undefined,
    });

    if (adminId) {
      await reportingRepo.createAudit({
        userId: adminId,
        action: "UPDATE_CAMPAIGN",
        target: updated.code,
        details: `Updated campaign promo code ${updated.code}`,
      });
    }

    return updated;
  }

  async deleteCampaign(id: string, adminId?: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new Error("Campaign promo code not found");

    const deleted = await this.repo.delete(id);

    if (adminId) {
      await reportingRepo.createAudit({
        userId: adminId,
        action: "DELETE_CAMPAIGN",
        target: existing.code,
        details: `Deleted campaign promo code ${existing.code}`,
      });
    }

    return deleted;
  }
}

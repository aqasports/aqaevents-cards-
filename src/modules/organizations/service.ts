import { OrganizationsRepository } from "./repository";
import { reportingRepo } from "@/modules/reports/repository";
import { z } from "zod";
import { createOrganizationSchema, updateOrganizationSchema } from "./validators";

export class OrganizationsService {
  private repo: OrganizationsRepository;

  constructor() {
    this.repo = new OrganizationsRepository();
  }

  async getOrganizations() {
    return this.repo.findMany();
  }

  async getOrganization(id: string) {
    const org = await this.repo.findById(id);
    if (!org) throw new Error("Organization not found");
    return org;
  }

  async createOrganization(input: z.infer<typeof createOrganizationSchema>, adminId?: string) {
    const validated = createOrganizationSchema.parse(input);
    const slug = validated.slug || validated.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const existing = await this.repo.findBySlug(slug);
    if (existing) {
      throw new Error(`Organization slug "${slug}" already exists`);
    }

    const org = await this.repo.create({
      name: validated.name,
      slug,
      creditRate: validated.creditRate ?? null,
      sharedCreditPool: validated.sharedCreditPool,
      useSharedPool: validated.useSharedPool,
    });

    if (adminId) {
      await reportingRepo.createAudit({
        userId: adminId,
        action: "CREATE_ORGANIZATION",
        target: org.name,
        details: `Created organization ${org.name} (${org.slug})`,
      });
    }

    return org;
  }

  async updateOrganization(id: string, input: z.infer<typeof updateOrganizationSchema>, adminId?: string) {
    const validated = updateOrganizationSchema.parse(input);
    const existing = await this.repo.findById(id);
    if (!existing) throw new Error("Organization not found");

    const updated = await this.repo.update(id, validated);

    if (adminId) {
      await reportingRepo.createAudit({
        userId: adminId,
        action: "UPDATE_ORGANIZATION",
        target: updated.name,
        details: `Updated organization ${updated.name}`,
      });
    }

    return updated;
  }

  async deleteOrganization(id: string, adminId?: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new Error("Organization not found");

    const deleted = await this.repo.delete(id);

    if (adminId) {
      await reportingRepo.createAudit({
        userId: adminId,
        action: "DELETE_ORGANIZATION",
        target: existing.name,
        details: `Deleted organization ${existing.name}`,
      });
    }

    return deleted;
  }
}

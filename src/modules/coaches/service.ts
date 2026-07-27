import { CoachesRepository } from "./repository";
import { reportingRepo } from "@/modules/reports/repository";
import { z } from "zod";
import { createCoachSchema, updateCoachSchema } from "./validators";

export class CoachesService {
  private repo: CoachesRepository;

  constructor() {
    this.repo = new CoachesRepository();
  }

  async getCoaches() {
    return this.repo.findMany();
  }

  async getCoach(id: string) {
    const coach = await this.repo.findById(id);
    if (!coach) throw new Error("Coach not found");
    return coach;
  }

  async createCoach(input: z.infer<typeof createCoachSchema>, adminId?: string) {
    const validated = createCoachSchema.parse(input);

    const coach = await this.repo.create({
      name: validated.name,
      email: validated.email ?? null,
      phone: validated.phone ?? null,
      specialties: validated.specialties ?? null,
      defaultPayRate: validated.defaultPayRate,
      commissionRate: validated.commissionRate,
    });

    if (adminId) {
      await reportingRepo.createAudit({
        userId: adminId,
        action: "CREATE_COACH",
        target: coach.name,
        details: `Created coach ${coach.name}`,
      });
    }

    return coach;
  }

  async updateCoach(id: string, input: z.infer<typeof updateCoachSchema>, adminId?: string) {
    const validated = updateCoachSchema.parse(input);

    const updated = await this.repo.update(id, validated);

    if (adminId) {
      await reportingRepo.createAudit({
        userId: adminId,
        action: "UPDATE_COACH",
        target: updated.name,
        details: `Updated coach ${updated.name}`,
      });
    }

    return updated;
  }

  async deleteCoach(id: string, adminId?: string) {
    const coach = await this.repo.findById(id);
    if (!coach) throw new Error("Coach not found");

    const deleted = await this.repo.delete(id);

    if (adminId) {
      await reportingRepo.createAudit({
        userId: adminId,
        action: "DELETE_COACH",
        target: coach.name,
        details: `Deleted coach ${coach.name}`,
      });
    }

    return deleted;
  }
}

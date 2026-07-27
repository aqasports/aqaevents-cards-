import { EquipmentRepository } from "./repository";
import { reportingRepo } from "@/modules/reports/repository";
import { z } from "zod";
import { createEquipmentSchema, updateEquipmentSchema } from "./validators";

export class EquipmentService {
  private repo: EquipmentRepository;

  constructor() {
    this.repo = new EquipmentRepository();
  }

  async getEquipment() {
    return this.repo.findMany();
  }

  async getEquipmentById(id: string) {
    const item = await this.repo.findById(id);
    if (!item) throw new Error("Equipment asset not found");
    return item;
  }

  async createEquipment(input: z.infer<typeof createEquipmentSchema>, adminId?: string) {
    const validated = createEquipmentSchema.parse(input);

    const item = await this.repo.create({
      name: validated.name,
      category: validated.category,
      purchasePrice: validated.purchasePrice,
      purchaseDate: validated.purchaseDate ? new Date(validated.purchaseDate) : new Date(),
      usefulLifeMonths: validated.usefulLifeMonths,
      maintenanceCost: validated.maintenanceCost,
      status: validated.status,
      notes: validated.notes ?? null,
    });

    if (adminId) {
      await reportingRepo.createAudit({
        userId: adminId,
        action: "CREATE_EQUIPMENT",
        target: item.name,
        details: `Created equipment asset ${item.name} (${item.category})`,
      });
    }

    return item;
  }

  async updateEquipment(id: string, input: z.infer<typeof updateEquipmentSchema>, adminId?: string) {
    const validated = updateEquipmentSchema.parse(input);

    const updated = await this.repo.update(id, {
      ...validated,
      purchaseDate: validated.purchaseDate ? new Date(validated.purchaseDate) : undefined,
    });

    if (adminId) {
      await reportingRepo.createAudit({
        userId: adminId,
        action: "UPDATE_EQUIPMENT",
        target: updated.name,
        details: `Updated equipment asset ${updated.name}`,
      });
    }

    return updated;
  }

  async deleteEquipment(id: string, adminId?: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new Error("Equipment asset not found");

    const deleted = await this.repo.delete(id);

    if (adminId) {
      await reportingRepo.createAudit({
        userId: adminId,
        action: "DELETE_EQUIPMENT",
        target: existing.name,
        details: `Deleted equipment asset ${existing.name}`,
      });
    }

    return deleted;
  }
}

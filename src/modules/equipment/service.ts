import { EquipmentRepository } from "./repository";
import { logAdminAction } from "@/lib/audit";
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
      await logAdminAction(
        adminId,
        "CREATE_EQUIPMENT",
        item.name,
        `Created equipment asset ${item.name} (${item.category})`
      );
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
      await logAdminAction(
        adminId,
        "UPDATE_EQUIPMENT",
        updated.name,
        `Updated equipment asset ${updated.name}`
      );
    }

    return updated;
  }

  async deleteEquipment(id: string, adminId?: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new Error("Equipment asset not found");

    const deleted = await this.repo.delete(id);

    if (adminId) {
      await logAdminAction(
        adminId,
        "DELETE_EQUIPMENT",
        existing.name,
        `Deleted equipment asset ${existing.name}`
      );
    }

    return deleted;
  }
}

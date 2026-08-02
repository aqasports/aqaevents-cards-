import { DepartmentsRepository } from "./repository";
import { logAdminAction } from "@/lib/audit";
import { z } from "zod";
import { createDepartmentSchema, updateDepartmentSchema, reassignEmployeeDepartmentSchema } from "./validators";

export class DepartmentsService {
  private repo: DepartmentsRepository;

  constructor() {
    this.repo = new DepartmentsRepository();
  }

  async getDepartments(organizationId?: string) {
    return this.repo.findMany({
      where: organizationId ? { organizationId } : undefined,
    });
  }

  async getDepartment(id: string) {
    const dept = await this.repo.findById(id);
    if (!dept) throw new Error("Department not found");
    return dept;
  }

  async createDepartment(input: z.infer<typeof createDepartmentSchema>, adminId?: string) {
    const validated = createDepartmentSchema.parse(input);

    const dept = await this.repo.create({
      organization: { connect: { id: validated.organizationId } },
      name: validated.name.trim(),
      budgetCap: validated.budgetCap ?? null,
    });

    if (adminId) {
      await logAdminAction(
        adminId,
        "CREATE_DEPARTMENT",
        dept.name,
        `Created department ${dept.name} with cap ${dept.budgetCap ?? "unlimited"}`
      );
    }

    return dept;
  }

  async updateDepartment(id: string, input: z.infer<typeof updateDepartmentSchema>, adminId?: string) {
    const validated = updateDepartmentSchema.parse(input);
    const existing = await this.repo.findById(id);
    if (!existing) throw new Error("Department not found");

    const updated = await this.repo.update(id, {
      ...(validated.name ? { name: validated.name.trim() } : {}),
      ...(validated.budgetCap !== undefined ? { budgetCap: validated.budgetCap } : {}),
    });

    if (adminId) {
      await logAdminAction(
        adminId,
        "UPDATE_DEPARTMENT",
        updated.name,
        `Updated department ${updated.name}`
      );
    }

    return updated;
  }

  async deleteDepartment(id: string, adminId?: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new Error("Department not found");

    const deleted = await this.repo.delete(id);

    if (adminId) {
      await logAdminAction(
        adminId,
        "DELETE_DEPARTMENT",
        existing.name,
        `Deleted department ${existing.name}`
      );
    }

    return deleted;
  }

  async reassignEmployee(input: z.infer<typeof reassignEmployeeDepartmentSchema>, adminId?: string) {
    const validated = reassignEmployeeDepartmentSchema.parse(input);

    const updated = await this.repo.reassignClient(validated.clientId, validated.departmentId ?? null);

    if (adminId) {
      await logAdminAction(
        adminId,
        "REASSIGN_EMPLOYEE_DEPARTMENT",
        updated.fullName,
        `Reassigned employee ${updated.fullName} to department ID ${validated.departmentId ?? "none"}`
      );
    }

    return updated;
  }
}

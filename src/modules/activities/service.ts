import { ActivitiesRepository } from "./repository";
import { ReportingRepository } from "../reports/repository";

export class ActivitiesService {
  private activitiesRepo = new ActivitiesRepository();
  private reportingRepo = new ReportingRepository();

  async getActivities(options?: { redeemableOnly?: boolean; allSessions?: boolean }) {
    const now = new Date();
    const tenHoursAgo = new Date(now.getTime() - 10 * 60 * 60 * 1000);
    const where: any = {};
    if (options?.redeemableOnly) {
      // Only return activities that have at least one upcoming active session
      where.sessions = {
        some: {
          active: true,
          sessionDate: { gte: tenHoursAgo },
        },
      };
    }

    const sessionFilter = options?.allSessions
      ? { orderBy: { sessionDate: "desc" as const } }
      : {
          where: { active: true },
          orderBy: { sessionDate: "asc" as const },
        };

    return this.activitiesRepo.findMany({
      where,
      include: {
        sessions: {
          ...sessionFilter,
          include: {
            sessionExpenses: {
              include: {
                activityExpense: true,
              },
            },
          },
        },
        expenses: true,
        _count: { select: { redemptions: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  async getActivity(id: string) {
    return this.activitiesRepo.findUnique({
      where: { id },
      include: {
        club: { select: { id: true, name: true } },
        expenses: {
          orderBy: { createdAt: "desc" },
        },
        sessions: {
          include: {
            redemptions: {
              include: {
                client: {
                  select: {
                    id: true,
                    fullName: true,
                    phone: true,
                    email: true,
                  },
                },
              },
              orderBy: { redeemedAt: "desc" },
            },
            club: true,
            sessionExpenses: {
              include: {
                activityExpense: true,
              },
            },
          },
          orderBy: { sessionDate: "asc" },
        },
        _count: { select: { redemptions: true } },
      },
    });
  }

  async createActivity(
    data: {
      name: string;
      description?: string | null;
      creditCost?: number;
      imageUrl?: string | null;
      places?: string | null;
      duration?: string | null;
      gallery?: string | null;
      equipment?: string | null;
      requiresCheck?: boolean;
      clubId?: string | null;
      expenses?: Array<{
        name: string;
        amount: number;
        notes?: string | null;
      }>;
    },
    adminId?: string
  ) {
    const { expenses, ...activityData } = data;

    const activity = await this.activitiesRepo.create({
      data: {
        ...activityData,
        creditCost: activityData.creditCost ?? 1,
        expenses: expenses
          ? {
              create: expenses,
            }
          : undefined,
      },
      include: {
        expenses: true,
      },
    });

    if (adminId) {
      await this.reportingRepo.createAudit({
        data: {
          userId: adminId,
          action: "CREATE_ACTIVITY",
          target: `Activity "${activity.name}"`,
          details: `Created activity "${activity.name}" (Credit cost: ${activity.creditCost}, duration: ${activity.duration || "None"}).`,
        },
      });
    }

    return activity;
  }

  async updateActivity(
    id: string,
    data: {
      name?: string;
      description?: string | null;
      creditCost?: number;
      imageUrl?: string | null;
      places?: string | null;
      duration?: string | null;
      gallery?: string | null;
      equipment?: string | null;
      active?: boolean;
      requiresCheck?: boolean;
      clubId?: string | null;
    },
    adminId?: string
  ) {
    // Fetch current activity to validate merged state
    const current = await this.activitiesRepo.findUnique({ where: { id } });
    if (!current) {
      throw new Error("Activity not found");
    }

    const mergedRequiresCheck = data.requiresCheck !== undefined ? data.requiresCheck : current.requiresCheck;
    const mergedClubId = data.clubId !== undefined ? data.clubId : current.clubId;

    if (mergedRequiresCheck && !mergedClubId) {
      throw new Error("Club is required when Club Check-in is enabled");
    }

    const activity = await this.activitiesRepo.update({
      where: { id },
      data,
    });

    if (adminId) {
      await this.reportingRepo.createAudit({
        data: {
          userId: adminId,
          action: "UPDATE_ACTIVITY",
          target: `Activity "${activity.name}"`,
          details: `Updated activity "${activity.name}" (Credit cost: ${activity.creditCost}, duration: ${activity.duration || "None"}, active: ${activity.active}).`,
        },
      });
    }

    return activity;
  }

  async deleteActivity(id: string, adminId?: string) {
    const activity = await this.activitiesRepo.findUnique({
      where: { id },
    });

    if (!activity) {
      throw new Error("Activity not found");
    }

    await this.activitiesRepo.delete({
      where: { id },
    });

    if (adminId) {
      await this.reportingRepo.createAudit({
        data: {
          userId: adminId,
          action: "DELETE_ACTIVITY",
          target: `Activity "${activity.name}"`,
          details: `Deleted activity "${activity.name}" (ID: ${id}).`,
        },
      });
    }

    return { success: true };
  }

  // Session Operations
  async getSessions(filter?: { activityId?: string | null; from?: string | null; activeOnly?: boolean }) {
    const where: any = {};
    if (filter?.activityId) where.activityId = filter.activityId;
    if (filter?.from) where.sessionDate = { gte: new Date(filter.from) };
    if (filter?.activeOnly !== false) where.active = true;

    return this.activitiesRepo.findSessionMany({
      where,
      include: {
        activity: true,
        redemptions: {
          select: { id: true }
        },
        club: true,
        sessionExpenses: {
          include: {
            activityExpense: true
          }
        }
      },
      orderBy: { sessionDate: "desc" }, // Order newest first for clear viewing of recent/upcoming events
    });
  }

  async createSession(data: { activityId: string; sessionDate: Date; location?: string | null; capacity?: number | null; clubId?: string | null }) {
    return this.activitiesRepo.createSession({
      data,
      include: { activity: true },
    });
  }

  async updateSession(id: string, data: { sessionDate?: Date; location?: string | null; capacity?: number | null; active?: boolean; clubId?: string | null }) {
    return this.activitiesRepo.updateSession({
      where: { id },
      data,
    });
  }

  async deleteSession(id: string, hard: boolean = false) {
    if (hard) {
      return this.activitiesRepo.deleteSession({
        where: { id },
      });
    }

    return this.activitiesRepo.updateSession({
      where: { id },
      data: { active: false },
    });
  }

  // Expense Operations
  async getExpenses() {
    return this.activitiesRepo.findExpenseMany({
      include: {
        activity: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createExpense(data: { activityId: string; name: string; amount: number; notes?: string | null }) {
    return this.activitiesRepo.createExpense({
      data,
      include: {
        activity: { select: { name: true } },
      },
    });
  }

  async updateExpense(id: string, data: { name?: string; amount?: number; notes?: string | null; activityId?: string; createdAt?: Date }) {
    return this.activitiesRepo.updateExpense({
      where: { id },
      data,
    });
  }

  async deleteExpense(id: string) {
    return this.activitiesRepo.deleteExpense({
      where: { id },
    });
  }

  // Session Expense Operations
  async getSessionExpenses(sessionId: string) {
    return this.activitiesRepo.findSessionExpenseMany({
      where: { sessionId },
      include: {
        activityExpense: true,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async createSessionExpense(data: { sessionId: string; activityExpenseId: string; quantity: number; amount?: number }) {
    let finalAmount = data.amount;
    if (finalAmount === undefined || finalAmount === null) {
      const expenseTemplate = await this.activitiesRepo.findExpenseUnique({
        where: { id: data.activityExpenseId },
      });
      if (!expenseTemplate) throw new Error("EXPENSE_TEMPLATE_NOT_FOUND");
      finalAmount = Math.round(data.quantity * expenseTemplate.amount);
    }

    return this.activitiesRepo.createSessionExpense({
      data: {
        sessionId: data.sessionId,
        activityExpenseId: data.activityExpenseId,
        quantity: data.quantity,
        amount: finalAmount,
      },
      include: {
        activityExpense: true,
      },
    });
  }

  async updateSessionExpense(id: string, data: { quantity?: number; amount?: number }) {
    let finalAmount = data.amount;
    if (finalAmount === undefined || finalAmount === null) {
      const sessionExpense = await this.activitiesRepo.findSessionExpenseUnique({
        where: { id },
        include: { activityExpense: true },
      });
      if (sessionExpense) {
        const qty = data.quantity !== undefined ? data.quantity : sessionExpense.quantity;
        const templateAmount = sessionExpense.activityExpense.amount;
        if (templateAmount > 0) {
          finalAmount = Math.round(qty * templateAmount);
        } else {
          finalAmount = sessionExpense.amount;
        }
      }
    }

    return this.activitiesRepo.updateSessionExpense({
      where: { id },
      data: {
        quantity: data.quantity,
        amount: finalAmount,
      },
    });
  }

  async deleteSessionExpense(id: string) {
    return this.activitiesRepo.deleteSessionExpense({
      where: { id },
    });
  }
}

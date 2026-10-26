import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  DEFAULT_FINANCE_GOALS,
  DEFAULT_FINANCE_LEDGER_STATE,
  SwimFinanceLedgerState,
} from "@/lib/swim-finance";

export const dynamic = "force-dynamic";

const FINANCE_LEDGER_SETTING_KEY = "swim_finance_ledger_v1";
const BORDEREAUX_SETTING_KEY = "swim_pool_bordereaux";

const coachSalaryConfigSchema = z.object({
  coachId: z.string(),
  coachName: z.string(),
  mode: z.enum(["fixed_monthly", "per_group", "per_session", "revenue_share"]),
  fixedMonthlyDA: z.number().min(0).default(0),
  perGroupDA: z.number().min(0).default(0),
  perSessionDA: z.number().min(0).default(0),
  revenueSharePct: z.number().min(0).max(100).default(0),
  bonusDA: z.number().min(0).default(0),
  deductionDA: z.number().min(0).default(0),
  isPaid: z.boolean().default(false),
  notes: z.string().optional(),
});

const customExpenseSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  category: z.enum(["pool_extra", "marketing", "equipment", "admin", "tax_bank", "other"]),
  amountDA: z.number().min(0),
  date: z.string(),
  monthKey: z.string(),
  recurring: z.boolean().default(false),
  status: z.enum(["paid", "pending"]).default("paid"),
  notes: z.string().optional(),
});

const financeGoalsSchema = z.object({
  netProfitTargetDA: z.number().min(0),
  revenueTargetDA: z.number().min(0),
  assignedClientsTarget: z.number().min(0),
  collectionRateTargetPct: z.number().min(0).max(100),
  maxExpenseRatioPct: z.number().min(0).max(100),
});

const financeSnapshotSchema = z.object({
  id: z.string(),
  label: z.string(),
  periodKey: z.string(),
  createdAt: z.string(),
  assignedClientsCount: z.number(),
  revenuePaidDA: z.number(),
  revenueStillToPayDA: z.number(),
  totalRevenueDA: z.number(),
  poolExpenseDA: z.number(),
  coachSalaryDA: z.number(),
  otherExpenseDA: z.number(),
  totalExpensesDA: z.number(),
  netProfitDA: z.number(),
  marginPct: z.number(),
});

const saveFinanceLedgerSchema = z.object({
  coachSalaries: z.record(z.string(), coachSalaryConfigSchema).optional(),
  customExpenses: z.array(customExpenseSchema).optional(),
  goals: financeGoalsSchema.optional(),
  snapshots: z.array(financeSnapshotSchema).optional(),
  defaultAccountingBasis: z.enum(["accrual", "cash"]).optional(),
  defaultPoolBasis: z.enum(["poolpaid_only", "all_assigned"]).optional(),
  defaultRecognitionMode: z.enum(["full_contract", "monthly_amortized"]).optional(),
  includeEquipmentMargin: z.boolean().optional(),
});

async function loadFinanceLedger(): Promise<SwimFinanceLedgerState> {
  try {
    const setting = await prisma.platformSetting.findUnique({
      where: { key: FINANCE_LEDGER_SETTING_KEY },
    });
    if (setting?.value) {
      const parsed = JSON.parse(setting.value);
      return {
        ...DEFAULT_FINANCE_LEDGER_STATE,
        ...parsed,
        goals: {
          ...DEFAULT_FINANCE_GOALS,
          ...(parsed.goals || {}),
        },
        coachSalaries: parsed.coachSalaries || {},
        customExpenses: Array.isArray(parsed.customExpenses) ? parsed.customExpenses : [],
        snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots : [],
      };
    }
  } catch (err) {
    logger.error("Failed to parse swim_finance_ledger_v1:", err);
  }
  return { ...DEFAULT_FINANCE_LEDGER_STATE };
}

export async function GET(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const includeMembers = request.nextUrl.searchParams.get("includeMembers") === "true";

  try {
    const [ledger, bordereauxSetting, coaches, equipmentSales, rawMembers, rawGroups] =
      await Promise.all([
        loadFinanceLedger(),
        prisma.platformSetting.findUnique({ where: { key: BORDEREAUX_SETTING_KEY } }),
        prisma.coach.findMany({
          where: { active: true },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            defaultPayRate: true,
            commissionRate: true,
            active: true,
          },
        }),
        prisma.swimEquipmentSale.findMany({
          orderBy: { soldAt: "desc" },
          select: {
            id: true,
            article: true,
            sellPrice: true,
            costPrice: true,
            quantity: true,
            soldAt: true,
          },
        }),
        includeMembers
          ? prisma.swimMember.findMany({
              orderBy: { createdAt: "desc" },
              include: {
                group: {
                  select: {
                    id: true,
                    name: true,
                    coachName: true,
                    schedule: true,
                    category: true,
                    active: true,
                  },
                },
                payments: {
                  orderBy: { paidAt: "desc" },
                  select: {
                    id: true,
                    amount: true,
                    method: true,
                    paidAt: true,
                  },
                },
              },
            })
          : Promise.resolve(undefined),
        includeMembers
          ? prisma.swimGroup.findMany({
              orderBy: { createdAt: "desc" },
            })
          : Promise.resolve(undefined),
      ]);

    let bordereaux: unknown[] = [];
    if (bordereauxSetting?.value) {
      try {
        const parsed = JSON.parse(bordereauxSetting.value);
        if (Array.isArray(parsed)) bordereaux = parsed;
      } catch {
        // ignore
      }
    }

    return NextResponse.json(
      {
        ledger,
        bordereaux,
        coaches,
        equipmentSales,
        ...(rawMembers ? { members: rawMembers } : {}),
        ...(rawGroups ? { groups: rawGroups } : {}),
      },
      {
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (err: unknown) {
    logger.error("GET /api/admin/swim/finance error:", err);
    return NextResponse.json({ error: "Failed to load swim finance data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const rawBody = await request.json().catch(() => ({}));
    const parsed = saveFinanceLedgerSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid finance ledger payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const current = await loadFinanceLedger();
    const updated: SwimFinanceLedgerState = {
      coachSalaries: parsed.data.coachSalaries ?? current.coachSalaries,
      customExpenses: parsed.data.customExpenses ?? current.customExpenses,
      goals: parsed.data.goals ?? current.goals,
      snapshots: parsed.data.snapshots ?? current.snapshots,
      defaultAccountingBasis:
        parsed.data.defaultAccountingBasis ?? current.defaultAccountingBasis,
      defaultPoolBasis: parsed.data.defaultPoolBasis ?? current.defaultPoolBasis,
      defaultRecognitionMode:
        parsed.data.defaultRecognitionMode ?? current.defaultRecognitionMode,
      includeEquipmentMargin:
        parsed.data.includeEquipmentMargin ?? current.includeEquipmentMargin,
      updatedAt: new Date().toISOString(),
    };

    await prisma.platformSetting.upsert({
      where: { key: FINANCE_LEDGER_SETTING_KEY },
      create: {
        key: FINANCE_LEDGER_SETTING_KEY,
        value: JSON.stringify(updated),
      },
      update: {
        value: JSON.stringify(updated),
      },
    });

    return NextResponse.json({ success: true, ledger: updated });
  } catch (err: unknown) {
    logger.error("POST /api/admin/swim/finance error:", err);
    return NextResponse.json({ error: "Failed to save swim finance ledger" }, { status: 500 });
  }
}

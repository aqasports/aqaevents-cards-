import { EquipmentArticleId, SwimLeadDetails } from "./swim-lead-details";

export interface SaleCalculationInput {
  sellPrice: number;
  costPrice: number;
  quantity: number;
}

export interface SaleCalculationResult {
  revenue: number;
  cost: number;
  profit: number;
  marginPercent: number;
}

export interface EquipmentSaleRecord {
  id: string;
  article: string;
  clientName: string;
  clientPhone: string;
  leadId?: string | null;
  sellPrice: number;
  costPrice: number;
  quantity: number;
  notes?: string | null;
  soldAt: Date | string;
}

export interface ArticleProfitSummary {
  revenue: number;
  cost: number;
  profit: number;
  units: number;
  marginPercent: number;
}

export interface AggregateSalesResult {
  totalSalesRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalUnitsSold: number;
  marginPercent: number;
  byArticle: Record<string, ArticleProfitSummary>;
}

/**
 * Calculates revenue, cost, net profit, and profit margin percent for a sale transaction.
 * Strictly avoids division by zero and rounds margin to an integer.
 */
export function calculateSaleProfit(
  input: SaleCalculationInput
): SaleCalculationResult {
  const quantity = Math.max(0, input.quantity);
  const revenue = Math.max(0, input.sellPrice) * quantity;
  const cost = Math.max(0, input.costPrice) * quantity;
  const profit = revenue - cost;
  const marginPercent =
    revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

  return {
    revenue,
    cost,
    profit,
    marginPercent,
  };
}

/**
 * Aggregates a list of equipment sales into total financial metrics and per-article breakdowns.
 */
export function aggregateSalesStats(
  sales: EquipmentSaleRecord[]
): AggregateSalesResult {
  const result: AggregateSalesResult = {
    totalSalesRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    totalUnitsSold: 0,
    marginPercent: 0,
    byArticle: {},
  };

  for (const sale of sales) {
    const calc = calculateSaleProfit({
      sellPrice: sale.sellPrice,
      costPrice: sale.costPrice,
      quantity: sale.quantity,
    });

    result.totalSalesRevenue += calc.revenue;
    result.totalCost += calc.cost;
    result.totalProfit += calc.profit;
    result.totalUnitsSold += sale.quantity;

    if (!result.byArticle[sale.article]) {
      result.byArticle[sale.article] = {
        revenue: 0,
        cost: 0,
        profit: 0,
        units: 0,
        marginPercent: 0,
      };
    }

    const art = result.byArticle[sale.article];
    art.revenue += calc.revenue;
    art.cost += calc.cost;
    art.profit += calc.profit;
    art.units += sale.quantity;
    art.marginPercent =
      art.revenue > 0 ? Math.round((art.profit / art.revenue) * 100) : 0;
  }

  result.marginPercent =
    result.totalSalesRevenue > 0
      ? Math.round((result.totalProfit / result.totalSalesRevenue) * 100)
      : 0;

  return result;
}

/**
 * Extracts and filters leads who requested equipment packs during registration.
 */
export function filterEquipmentDemands<
  T extends {
    fullName: string;
    phone: string;
    status: string;
    details?: SwimLeadDetails;
  }
>(
  leads: T[],
  options?: {
    search?: string;
    article?: EquipmentArticleId | "all";
    status?: string;
  }
): T[] {
  const search = options?.search?.toLowerCase().trim() || "";
  const article = options?.article || "all";
  const status = options?.status || "all";

  return leads.filter((lead) => {
    const hasPack =
      Boolean(lead.details?.equipment.hasPack) ||
      (Array.isArray(lead.details?.equipment.articles) &&
        lead.details.equipment.articles.length > 0);

    if (!hasPack) return false;

    if (search) {
      const matchName = lead.fullName.toLowerCase().includes(search);
      const matchPhone = lead.phone.includes(search);
      if (!matchName && !matchPhone) return false;
    }

    if (status !== "all" && lead.status !== status) {
      return false;
    }

    if (article !== "all") {
      const hasArticle = lead.details?.equipment.articles?.includes(article);
      if (!hasArticle) return false;
    }

    return true;
  });
}

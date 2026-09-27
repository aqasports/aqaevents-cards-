import { describe, it, expect } from "vitest";
import {
  calculateSaleProfit,
  aggregateSalesStats,
  filterEquipmentDemands,
  EquipmentSaleRecord,
} from "./swim-equipment";
import { SwimLeadDetails } from "./swim-lead-details";

describe("Swim Equipment Profit Calculations", () => {
  it("calculates revenue, cost, profit, and margin correctly for single item", () => {
    const result = calculateSaleProfit({
      sellPrice: 2500,
      costPrice: 1200,
      quantity: 1,
    });

    expect(result.revenue).toBe(2500);
    expect(result.cost).toBe(1200);
    expect(result.profit).toBe(1300);
    expect(result.marginPercent).toBe(52); // (1300 / 2500) * 100 = 52%
  });

  it("calculates correctly for multiple quantities", () => {
    const result = calculateSaleProfit({
      sellPrice: 1200,
      costPrice: 500,
      quantity: 3,
    });

    expect(result.revenue).toBe(3600);
    expect(result.cost).toBe(1500);
    expect(result.profit).toBe(2100);
    expect(result.marginPercent).toBe(58); // (2100 / 3600) * 100 = 58.33% -> 58%
  });

  it("handles zero selling price gracefully without division by zero", () => {
    const result = calculateSaleProfit({
      sellPrice: 0,
      costPrice: 500,
      quantity: 1,
    });

    expect(result.revenue).toBe(0);
    expect(result.cost).toBe(500);
    expect(result.profit).toBe(-500);
    expect(result.marginPercent).toBe(0);
  });

  it("aggregates multiple sales records across different articles", () => {
    const sales: EquipmentSaleRecord[] = [
      {
        id: "1",
        article: "goggles",
        clientName: "Mohamed",
        clientPhone: "0555000001",
        sellPrice: 2500,
        costPrice: 1200,
        quantity: 2,
        soldAt: new Date(),
      },
      {
        id: "2",
        article: "cap",
        clientName: "Karim",
        clientPhone: "0555000002",
        sellPrice: 1200,
        costPrice: 500,
        quantity: 1,
        soldAt: new Date(),
      },
      {
        id: "3",
        article: "swimsuit",
        clientName: "Amine",
        clientPhone: "0555000003",
        sellPrice: 4500,
        costPrice: 2200,
        quantity: 1,
        soldAt: new Date(),
      },
    ];

    const stats = aggregateSalesStats(sales);

    // Goggles: 2 * 2500 = 5000 rev, 2 * 1200 = 2400 cost, 2600 profit
    // Cap: 1 * 1200 = 1200 rev, 1 * 500 = 500 cost, 700 profit
    // Swimsuit: 1 * 4500 = 4500 rev, 1 * 2200 = 2200 cost, 2300 profit
    // Total: 10700 rev, 5100 cost, 5600 profit, 4 units
    expect(stats.totalSalesRevenue).toBe(10700);
    expect(stats.totalCost).toBe(5100);
    expect(stats.totalProfit).toBe(5600);
    expect(stats.totalUnitsSold).toBe(4);
    expect(stats.marginPercent).toBe(52); // (5600 / 10700) * 100 = 52%

    expect(stats.byArticle.goggles.units).toBe(2);
    expect(stats.byArticle.goggles.profit).toBe(2600);
    expect(stats.byArticle.cap.units).toBe(1);
    expect(stats.byArticle.cap.profit).toBe(700);
    expect(stats.byArticle.swimsuit.units).toBe(1);
    expect(stats.byArticle.swimsuit.profit).toBe(2300);
  });
});

describe("filterEquipmentDemands", () => {
  const dummyLeads = [
    {
      id: "1",
      fullName: "Anis Benali",
      phone: "0555111111",
      status: "pending",
      details: {
        equipment: {
          hasPack: true,
          articles: ["goggles", "cap"],
          articleLabels: ["Lunettes", "Bonnet"],
        },
        demographics: {},
        userNotes: "",
      } as SwimLeadDetails,
    },
    {
      id: "2",
      fullName: "Walid Saidi",
      phone: "0555222222",
      status: "confirmed",
      details: {
        equipment: {
          hasPack: false,
          articles: [],
          articleLabels: [],
        },
        demographics: {},
        userNotes: "",
      } as SwimLeadDetails,
    },
    {
      id: "3",
      fullName: "Yacine Larbi",
      phone: "0555333333",
      status: "pending",
      details: {
        equipment: {
          hasPack: true,
          articles: ["swimsuit"],
          articleLabels: ["Maillot"],
        },
        demographics: {},
        userNotes: "",
      } as SwimLeadDetails,
    },
  ];

  it("filters leads that requested equipment packs", () => {
    const demands = filterEquipmentDemands(dummyLeads);
    expect(demands.length).toBe(2);
    expect(demands.map((d) => d.fullName)).toEqual([
      "Anis Benali",
      "Yacine Larbi",
    ]);
  });

  it("filters by article correctly", () => {
    const gogglesDemands = filterEquipmentDemands(dummyLeads, {
      article: "goggles",
    });
    expect(gogglesDemands.length).toBe(1);
    expect(gogglesDemands[0].fullName).toBe("Anis Benali");
  });

  it("filters by status and search query", () => {
    const searchResult = filterEquipmentDemands(dummyLeads, {
      search: "anis",
      status: "pending",
    });
    expect(searchResult.length).toBe(1);
    expect(searchResult[0].fullName).toBe("Anis Benali");
  });
});

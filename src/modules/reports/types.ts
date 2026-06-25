export interface AuditLogDto {
  id: string;
  userId: string;
  action: string;
  target: string;
  details: string;
  createdAt: Date;
}

export interface SummaryReportDto {
  totalRedemptions: number;
  totalCreditsSold: number;
  totalCreditsUsed: number;
  totalClientsWithCards: number;
}

export interface AnalyticsDataPoint {
  date: string;
  sales: number;
  redemptions: number;
}

import type { SwimLeadDetails } from "@/lib/swim-lead-details";

export type TranslateFn = (
  key: string,
  replacements?: Record<string, string | number>
) => string;

export interface CatalogArticle {
  id: string;
  name: string;
  code: string;
  description: string | null;
  defaultSellPrice: number;
  defaultCostPrice: number;
  active: boolean;
  createdAt: string;
}

export interface SwimLeadItem {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  category: string;
  level: string;
  status: string;
  createdAt: string;
  notes: string | null;
  details?: SwimLeadDetails;
}

export interface EquipmentSaleItem {
  id: string;
  article: string;
  clientName: string;
  clientPhone: string;
  leadId: string | null;
  sellPrice: number;
  costPrice: number;
  quantity: number;
  notes: string | null;
  soldAt: string;
  createdAt: string;
}

export interface SalePrefill {
  clientName: string;
  clientPhone: string;
  leadId: string;
  articleCode: string;
}

export type SaleModalState =
  | { mode: "create"; prefill: SalePrefill | null }
  | { mode: "edit"; sale: EquipmentSaleItem };

export type NoticeState = { tone: "success" | "danger"; text: string } | null;

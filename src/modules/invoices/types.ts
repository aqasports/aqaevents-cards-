export interface InvoiceCreatePayload {
  clientId: string;
  amount: number;
  category: "package" | "custom" | "adhoc";
  items: string;
  notes?: string;
  status: "paid" | "unpaid";
  packageId?: string;
  creditDelta?: number;
  creditReason?: string;
}

export interface InvoiceUpdatePayload {
  status?: "paid" | "unpaid" | "refunded";
  notes?: string | null;
  amount?: number;
  category?: "package" | "custom" | "adhoc";
  items?: string;
  createdAt?: string;
  paidAt?: string | null;
}

export interface PackageCreatePayload {
  name: string;
  creditAmount: number;
  bonusCredits: number;
  sortOrder: number;
}

export interface PackageUpdatePayload {
  name?: string;
  creditAmount?: number;
  bonusCredits?: number;
  sortOrder?: number;
  active?: boolean;
}

export interface ProductCreatePayload {
  name: string;
  price: number;
  description?: string | null;
  imageUrl?: string | null;
  advertised?: boolean;
  sortOrder?: number;
}

export interface ProductUpdatePayload {
  name?: string;
  price?: number;
  description?: string | null;
  imageUrl?: string | null;
  advertised?: boolean;
  active?: boolean;
  sortOrder?: number;
}

export interface RedemptionCreatePayload {
  sessionId?: string;
  notes?: string;
}

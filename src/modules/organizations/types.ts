export interface OrganizationWithStats {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  allowedActivities?: string | null;
  whatsappGroupUrl?: string | null;
  commChannel?: string | null;
  feedApiKey?: string | null;
  creditRate: number | null;
  sharedCreditPool: number;
  useSharedPool: boolean;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  billingAddress?: string | null;
  nif?: string | null;
  nis?: string | null;
  rc?: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    clients: number;
    invoices: number;
  };
  totalOutstandingBalance?: number;
}

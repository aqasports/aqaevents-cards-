export interface OrganizationWithStats {
  id: string;
  name: string;
  slug: string;
  creditRate: number | null;
  sharedCreditPool: number;
  useSharedPool: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    clients: number;
    invoices: number;
  };
  totalOutstandingBalance?: number;
}

export interface EquipmentAssetWithStats {
  id: string;
  name: string;
  category: string;
  purchasePrice: number;
  purchaseDate: Date;
  usefulLifeMonths: number;
  maintenanceCost: number;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    usageLogs: number;
  };
}

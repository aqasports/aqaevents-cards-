export interface ActivityCreatePayload {
  name: string;
  description?: string | null;
  creditCost?: number;
  imageUrl?: string | null;
  places?: string | null;
  duration?: string | null;
  gallery?: string | null;
  equipment?: string | null;
  eventType?: string;
  expenses?: Array<{
    name: string;
    amount: number;
    notes?: string | null;
  }>;
}

export interface ActivityUpdatePayload {
  name?: string;
  description?: string | null;
  creditCost?: number;
  imageUrl?: string | null;
  places?: string | null;
  duration?: string | null;
  gallery?: string | null;
  equipment?: string | null;
  active?: boolean;
  eventType?: string;
}

export interface SessionCreatePayload {
  activityId: string;
  sessionDate: Date;
  location?: string | null;
  capacity?: number | null;
}

export interface ExpenseCreatePayload {
  activityId: string;
  name: string;
  amount: number;
  notes?: string | null;
}

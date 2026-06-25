export interface ClientCreatePayload {
  fullName: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  packageId?: string | null;
  issueCard: boolean;
  preCardCode?: string | null;
  leadSource?: string | null;
}

export interface ClientUpdatePayload {
  fullName?: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  leadSource?: string | null;
}

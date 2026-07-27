export interface CoachWithStats {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  specialties: string | null;
  defaultPayRate: number;
  commissionRate: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    sessions: number;
  };
}

export interface CoachPayoutSession {
  sessionId: string;
  sessionDate: Date;
  activityName: string;
  attendeesCount: number;
  payoutAmount: number;
}

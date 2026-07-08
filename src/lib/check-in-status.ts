export const CHECK_IN_STATUSES = ["SUCCESS", "DUPLICATE", "NOT_REDEEMED", "INVALID_CARD"] as const;
export type CheckInStatusValue = (typeof CHECK_IN_STATUSES)[number];

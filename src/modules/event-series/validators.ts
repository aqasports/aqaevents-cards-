import { z } from "zod";

export const generateSeriesSchema = z.object({
  activityId: z.string().min(2),
  startDate: z.string(),
  repeatIntervalWeeks: z.number().int().min(1).default(1),
  count: z.number().int().min(1).max(52).default(10),
  location: z.string().optional().nullable(),
  capacity: z.number().int().optional().nullable(),
});

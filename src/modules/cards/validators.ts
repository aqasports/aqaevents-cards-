import { z } from "zod";

export const batchSchema = z.object({
  count: z.number().int().min(1).max(200),
  qrSize: z.number().int().min(100).max(800).default(400),
});

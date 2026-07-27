import { prisma } from "@/lib/prisma";
import { reportingRepo } from "@/modules/reports/repository";
import { z } from "zod";
import { generateSeriesSchema } from "./validators";
import crypto from "crypto";

export class EventSeriesService {
  async generateSeries(input: z.infer<typeof generateSeriesSchema>, adminId?: string) {
    const validated = generateSeriesSchema.parse(input);

    const seriesId = `SERIES-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const start = new Date(validated.startDate);
    const sessions = [];

    for (let i = 0; i < validated.count; i++) {
      const sessionDate = new Date(start);
      sessionDate.setDate(start.getDate() + i * 7 * validated.repeatIntervalWeeks);

      const session = await prisma.activitySession.create({
        data: {
          activityId: validated.activityId,
          sessionDate,
          location: validated.location ?? null,
          capacity: validated.capacity ?? null,
          parentSeriesId: seriesId,
          recurrenceRule: `WEEKLY:${validated.repeatIntervalWeeks}`,
        },
      });
      sessions.push(session);
    }

    if (adminId) {
      await reportingRepo.createAudit({
        userId: adminId,
        action: "GENERATE_EVENT_SERIES",
        target: seriesId,
        details: `Generated ${sessions.length} recurring sessions for activity ${validated.activityId}`,
      });
    }

    return { seriesId, sessionsCount: sessions.length, sessions };
  }
}

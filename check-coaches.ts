import "dotenv/config";
import { prisma } from "./src/lib/prisma";

async function check() {
  // 1. How many coaches exist?
  const coaches = await prisma.coach.findMany({ select: { id: true, name: true, active: true } });
  console.log("\n=== COACHES IN DATABASE ===");
  console.log(`Total: ${coaches.length}`);
  coaches.forEach(c => console.log(`  - ${c.name} (${c.id}) active=${c.active}`));

  // 2. How many sessions have coachId set vs null?
  const sessionsWithCoach = await prisma.activitySession.count({ where: { coachId: { not: null } } });
  const sessionsWithoutCoach = await prisma.activitySession.count({ where: { coachId: null } });
  const totalSessions = await prisma.activitySession.count();
  console.log("\n=== SESSION COACH ASSIGNMENTS ===");
  console.log(`Total sessions: ${totalSessions}`);
  console.log(`With coach assigned: ${sessionsWithCoach}`);
  console.log(`Without coach (null): ${sessionsWithoutCoach}`);

  // 3. Show all sessions with their coach assignments
  const allSessions = await prisma.activitySession.findMany({
    select: {
      id: true,
      sessionDate: true,
      coachId: true,
      coach: { select: { name: true } },
      activity: { select: { name: true } },
      active: true,
    },
    orderBy: { sessionDate: "desc" },
    take: 30,
  });
  console.log("\n=== LAST 30 SESSIONS ===");
  allSessions.forEach(s => {
    const coachInfo = s.coachId ? `COACH: ${s.coach?.name || "???"} (${s.coachId})` : "NO COACH";
    const date = new Date(s.sessionDate).toISOString().slice(0, 16);
    console.log(`  ${date} | ${s.activity.name} | ${coachInfo} | active=${s.active} | id=${s.id}`);
  });

  // 4. Check recent audit logs for any coach-related operations
  const recentAudits = await prisma.auditLog.findMany({
    where: {
      OR: [
        { action: { contains: "COACH" } },
        { action: { contains: "SESSION" } },
        { target: { contains: "coach" } },
      ]
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  console.log("\n=== RECENT COACH/SESSION AUDIT LOGS ===");
  recentAudits.forEach(a => {
    const date = new Date(a.createdAt).toISOString().slice(0, 19);
    console.log(`  ${date} | ${a.action} | ${a.target} | ${(a.details || "").slice(0, 100)}`);
  });

  await prisma.$disconnect();
}

check().catch(e => { console.error(e); process.exit(1); });

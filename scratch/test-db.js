const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Fetching activities...");
    const activities = await prisma.activity.findMany({
      include: {
        sessions: {
          include: {
            sessionExpenses: {
              include: {
                activityExpense: true
              }
            }
          },
          orderBy: { sessionDate: "asc" },
        },
        expenses: true,
        _count: { select: { redemptions: true } },
      },
      orderBy: { name: "asc" },
    });
    console.log("Success! Activities count:", activities.length);
  } catch (err) {
    console.error("Database query failed:");
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

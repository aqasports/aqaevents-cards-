import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth";
import { generateCardCode, generatePublicToken } from "../src/lib/tokens";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@aqasports.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123";

  // ─── Admin user ──────────────────────────────────────────────────────────────
  let admin = await prisma.adminUser.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    admin = await prisma.adminUser.create({
      data: {
        email: adminEmail,
        name: "AQA Admin",
        role: "super_admin",
        passwordHash: await hashPassword(adminPassword),
      },
    });
    console.log(`✓ Admin user: ${adminEmail}`);
  }

  // ─── Demo staff user ──────────────────────────────────────────────────────────
  const staffEmail = "staff@aqasports.com";
  let staffUser = await prisma.adminUser.findUnique({ where: { email: staffEmail } });
  if (!staffUser) {
    staffUser = await prisma.adminUser.create({
      data: {
        email: staffEmail,
        name: "Event Staff",
        role: "staff",
        passwordHash: await hashPassword("staff123"),
      },
    });
    console.log(`✓ Staff user: ${staffEmail} / staff123`);
  }

  // ─── Packages ─────────────────────────────────────────────────────────────────
  await prisma.package.deleteMany();
  const packages = await Promise.all([
    prisma.package.create({ data: { name: "Solo",    creditAmount: 1,  bonusCredits: 0,  totalCredits: 1,  price: 1900,  sortOrder: 1 } }),
    prisma.package.create({ data: { name: "Starter", creditAmount: 7,  bonusCredits: 1,  totalCredits: 8,  price: 13300, sortOrder: 2 } }),
    prisma.package.create({ data: { name: "Value",   creditAmount: 10, bonusCredits: 2,  totalCredits: 12, price: 19000, sortOrder: 3 } }),
    prisma.package.create({ data: { name: "Club",    creditAmount: 20, bonusCredits: 5,  totalCredits: 25, price: 38000, sortOrder: 4 } }),
    prisma.package.create({ data: { name: "Pro",     creditAmount: 30, bonusCredits: 9,  totalCredits: 39, price: 57000, sortOrder: 5 } }),
    prisma.package.create({ data: { name: "Elite",   creditAmount: 50, bonusCredits: 17, totalCredits: 67, price: 95000, sortOrder: 6 } }),
  ]);
  console.log("✓ Packages: Solo, Starter, Value, Club, Pro, Elite");

  // ─── Activities ───────────────────────────────────────────────────────────────
  await prisma.activity.deleteMany();

  const activitiesData = [
    {
      name: "Kayaking",
      description: "Guided kayaking session on the river",
      creditCost: 1,
      imageUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80",
      places: "Oued Fès, Sebou River, Bin El Ouidane",
      expenses: [
        { name: "Kayak Rental", amount: 1200, notes: "Per kayak rental fee" },
        { name: "Safety Vests", amount: 400, notes: "Lifejacket logistics" },
        { name: "Instructor", amount: 1500, notes: "Professional kayaking coach" }
      ]
    },
    {
      name: "Rock Climbing",
      description: "Outdoor climbing with certified instructors",
      creditCost: 2,
      imageUrl: "https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=600&q=80",
      places: "Azrou Forest, Todra Gorge, Tafraout",
      expenses: [
        { name: "Rope & Harness Gear", amount: 2000, notes: "Climbing equipment check" },
        { name: "Guide Fee", amount: 3000, notes: "Certified instructor fee" }
      ]
    },
    {
      name: "Mountain Biking",
      description: "Trail biking adventure in the Atlas foothills",
      creditCost: 2,
      imageUrl: "https://images.unsplash.com/photo-1484156818044-c040038b0719?auto=format&fit=crop&w=600&q=80",
      places: "Atlas Foothills, Ifrane National Park",
      expenses: [
        { name: "Mountain Bike Rental", amount: 2500, notes: "Premium bike rental" },
        { name: "Helmet & Pads", amount: 500, notes: "Safety gear" }
      ]
    },
    {
      name: "Hiking",
      description: "Guided mountain hike with panoramic views",
      creditCost: 1,
      imageUrl: "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=600&q=80",
      places: "Mount Toubkal, Chefchaouen Trails, Akchour",
      expenses: [
        { name: "Trail Map & First Aid", amount: 300, notes: "Basic first aid kit" },
        { name: "Local Guide", amount: 1200, notes: "Local pathfinder fee" }
      ]
    },
    {
      name: "Paddleboarding",
      description: "Stand-up paddleboard intro session",
      creditCost: 1,
      imageUrl: "https://images.unsplash.com/photo-1517178351167-452c9bad7ad0?auto=format&fit=crop&w=600&q=80",
      places: "Bin El Ouidane, Lalla Takerkoust Lake",
      expenses: [
        { name: "Paddleboard Rental", amount: 1500, notes: "Board and paddle rental" },
        { name: "Instructor", amount: 1200, notes: "SUP coach fee" }
      ]
    }
  ];

  const activities = [];
  for (const act of activitiesData) {
    const activity = await prisma.activity.create({
      data: {
        name: act.name,
        description: act.description,
        creditCost: act.creditCost,
        imageUrl: act.imageUrl,
        places: act.places,
        expenses: {
          create: act.expenses
        }
      }
    });
    activities.push(activity);
  }
  console.log("✓ Seeded activities with places, images, and expenses.");

  // Add upcoming sessions if none exist
  const sessionCount = await prisma.activitySession.count();
  if (sessionCount === 0) {
    const now = new Date();
    const soon = (days: number, hour = 9) => {
      const d = new Date(now);
      d.setDate(d.getDate() + days);
      d.setHours(hour, 0, 0, 0);
      return d;
    };
    for (const activity of activities) {
      const placesList = activity.places ? activity.places.split(",") : ["Oued Fès"];
      const loc1 = placesList[0].trim();
      const loc2 = (placesList[1] || placesList[0]).trim();
      
      await prisma.activitySession.create({
        data: { activityId: activity.id, sessionDate: soon(2), location: loc1, capacity: 12 }
      });
      await prisma.activitySession.create({
        data: { activityId: activity.id, sessionDate: soon(7), location: loc2, capacity: 10 }
      });
    }
    console.log("✓ Sessions: 2 upcoming per activity at predefined locations");
  }

  // ─── Demo clients ─────────────────────────────────────────────────────────────
  const clientCount = await prisma.client.count();
  if (clientCount > 0) {
    console.log("✓ Clients already exist — skipping demo data");
    return;
  }

  const demoClients = [
    { fullName: "Amine Benali",   phone: "+212 612 345 678", packageIdx: 1 }, // 5 pack
    { fullName: "Fatima Zahra",   phone: "+212 661 234 567", packageIdx: 2 }, // 8 pack
    { fullName: "Youssef Idrissi",phone: "+212 670 987 654", packageIdx: 0 }, // 3 pack
    { fullName: "Sara Alami",     phone: "+212 655 111 222", packageIdx: 1 }, // 5 pack
    { fullName: "Karim Tazi",     phone: "+212 699 333 444", packageIdx: 2 }, // 8 pack
    { fullName: "Nadia Chraibi",  phone: "+212 612 555 666", packageIdx: 0 }, // 3 pack
  ];

  for (const demo of demoClients) {
    const pkg = packages[demo.packageIdx];

    const client = await prisma.client.create({
      data: { fullName: demo.fullName, phone: demo.phone },
    });

    const card = await prisma.card.create({
      data: {
        clientId: client.id,
        publicToken: generatePublicToken(),
        cardCode: generateCardCode(),
      },
    });

    // Issue package credits
    await prisma.ledgerEntry.create({
      data: {
        clientId: client.id,
        cardId: card.id,
        packageId: pkg.id,
        delta: pkg.totalCredits,
        type: "credit",
        reason: `Package: ${pkg.name} (${pkg.creditAmount} paid + ${pkg.bonusCredits} bonus)`,
        createdById: admin.id,
      },
    });

    // Redeem 1–2 activities (except for 0-balance clients)
    const redemptionsToMake = demo.packageIdx === 0 ? 1 : 2; // Use most credits on small packs
    for (let i = 0; i < redemptionsToMake; i++) {
      const activity = activities[i % activities.length];
      const redemption = await prisma.redemption.create({
        data: {
          clientId: client.id,
          activityId: activity.id,
          staffId: staffUser.id,
          creditsUsed: 1,
          redeemedAt: new Date(Date.now() - (i + 1) * 3 * 24 * 60 * 60 * 1000), // days ago
          notes: "Event day redemption",
        },
      });
      await prisma.ledgerEntry.create({
        data: {
          clientId: client.id,
          cardId: card.id,
          redemptionId: redemption.id,
          delta: -1,
          type: "debit",
          reason: `Redeemed: ${activity.name}`,
          createdById: staffUser.id,
        },
      });
    }
  }

  console.log(`✓ Demo clients: ${demoClients.length} clients with cards, credits, and redemptions`);
  console.log("");
  console.log("─────────────────────────────────────────");
  console.log(" Seed complete! Log in at /admin/login");
  console.log(` Admin:  ${adminEmail} / ${adminPassword}`);
  console.log(` Staff:  ${staffEmail} / staff123`);
  console.log("─────────────────────────────────────────");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

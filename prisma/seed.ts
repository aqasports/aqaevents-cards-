import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth";
import { generateCardCode, generatePublicToken } from "../src/lib/tokens";
import { syncClientCRM } from "../src/lib/crm";

// --- PRODUCTION SAFETY GUARD ---
const dbUrl = process.env.DATABASE_URL ?? "";
if (dbUrl.includes("supabase.com") || dbUrl.includes("neon.tech") || dbUrl.includes("amazonaws.com")) {
  console.error("\n  BLOCKED: This seed script cannot run against a production database.");
  console.error("  Your DATABASE_URL points to a remote hosted database.");
  console.error("  Use the local Docker database instead: docker-compose up -d\n");
  process.exit(1);
}

const prisma = new PrismaClient();


function generateInvoiceCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "INV-";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function uniqueInvoiceCode() {
  let code = generateInvoiceCode();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.invoice.findUnique({ where: { invoiceCode: code } });
    if (!existing) return code;
    code = generateInvoiceCode();
  }
}

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
  const defaultPackages = [
    { name: "Solo",    creditAmount: 1,  bonusCredits: 0,  totalCredits: 1,  price: 1900,  sortOrder: 1 },
    { name: "Starter", creditAmount: 7,  bonusCredits: 1,  totalCredits: 8,  price: 13300, sortOrder: 2 },
    { name: "Value",   creditAmount: 10, bonusCredits: 2,  totalCredits: 12, price: 19000, sortOrder: 3 },
    { name: "Club",    creditAmount: 20, bonusCredits: 5,  totalCredits: 25, price: 38000, sortOrder: 4 },
    { name: "Pro",     creditAmount: 30, bonusCredits: 9,  totalCredits: 39, price: 57000, sortOrder: 5 },
    { name: "Elite",   creditAmount: 50, bonusCredits: 17, totalCredits: 67, price: 95000, sortOrder: 6 },
  ];

  for (const pkg of defaultPackages) {
    const existing = await prisma.package.findFirst({ where: { name: pkg.name } });
    if (!existing) {
      await prisma.package.create({ data: pkg });
      console.log(`✓ Seeded package: ${pkg.name}`);
    } else {
      console.log(`- Package already exists: ${pkg.name}`);
    }
  }

  // ─── Activities ───────────────────────────────────────────────────────────────
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

  for (const act of activitiesData) {
    const existing = await prisma.activity.findFirst({ where: { name: act.name } });
    if (!existing) {
      await prisma.activity.create({
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
      console.log(`✓ Seeded activity: ${act.name}`);
    } else {
      console.log(`- Activity already exists: ${act.name}`);
    }
  }

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

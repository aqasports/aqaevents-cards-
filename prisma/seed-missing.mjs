// Seed the 4 missing AQA activities using direct DB connection
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

const missing = [
  {
    id: 'act-kayak',
    name: 'Kayak',
    description: 'Immersive navigation mapping coastal caves and isolated coves, teaching coordination, paddle stroke technique, and marine balance.',
    places: 'Base Nautique',
    duration: '3h',
    creditCost: 3,
    active: true,
  },
  {
    id: 'act-pmt-discovery',
    name: 'PMT Discovery',
    description: 'Guided snorkeling excursions along vibrant marine paths, focusing on underwater observation, relaxation, and mastering basic snorkel and mask clearing techniques.',
    places: 'Base Nautique',
    duration: '2h',
    creditCost: 2,
    active: true,
  },
  {
    id: 'act-aquathlons',
    name: 'Aquathlons',
    description: 'A fast-paced, high-energy transition experience combining sea swimming and natural trail running.',
    places: 'Base Nautique',
    duration: '4h',
    creditCost: 4,
    active: true,
  },
  {
    id: 'act-outdoor-fitness',
    name: 'Outdoor Fitness',
    description: 'Functional bodyweight training, mobility work, and natural conditioning bootcamps integrated directly into forest environments.',
    places: 'Base Forestière',
    duration: '2h',
    creditCost: 2,
    active: true,
  },
];

async function main() {
  console.log('Seeding missing activities via DIRECT_URL ...\n');
  for (const act of missing) {
    const result = await prisma.activity.upsert({
      where: { id: act.id },
      update: { ...act },
      create: { ...act },
    });
    console.log('✓ Upserted:', result.id, '-', result.name, '|', result.places);
  }

  const total = await prisma.activity.count({ where: { active: true } });
  console.log(`\nTotal active activities in DB: ${total}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});

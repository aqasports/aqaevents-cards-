const { PrismaClient } = require('@prisma/client');

const activitiesData = [
  // Aquatic and Marine Experiences (Base Nautique)
  {
    id: "act-sea-swimming",
    name: "Sea Swimming",
    description: "A deep connection with open water. Cape crossings (traversées) and progressive initiation sessions.",
    creditCost: 1,
    imageUrl: "/events/Fav%20img%20(10).jpg",
    places: "Base Nautique",
    duration: "2h"
  },
  {
    id: "act-kayak",
    name: "Kayak",
    description: "Immersive navigation mapping coastal caves and isolated coves, teaching coordination and balance.",
    creditCost: 1,
    imageUrl: "/events/Fav%20img%20(4).jpg",
    places: "Base Nautique",
    duration: "Half day"
  },
  {
    id: "act-free-diving",
    name: "Free Diving",
    description: "An inner journey of calm. Training body and mind in breathing techniques, pressure adaptation, and deep apnea.",
    creditCost: 2,
    imageUrl: "/events/Fav%20img%20(13).jpg",
    places: "Base Nautique",
    duration: "2h"
  },
  {
    id: "act-pmt-discovery",
    name: "PMT Discovery",
    description: "Guided snorkeling excursions along vibrant marine paths, focusing on underwater observation and relaxation.",
    creditCost: 1,
    imageUrl: "/events/Fav%20img%20(5).jpg",
    places: "Base Nautique",
    duration: "2h"
  },
  {
    id: "act-scubadiving",
    name: "Scubadiving",
    description: "Controlled depth exploration. Breathing underwater under the strict supervision of professional instructors.",
    creditCost: 2,
    imageUrl: "/events/Fav%20img%20(14).jpg",
    places: "Base Nautique",
    duration: "Half day"
  },
  {
    id: "act-boat-balade",
    name: "Boat Balade",
    description: "Relaxing marine excursions and coastal cruises mapping cape topographies and offshore recovery.",
    creditCost: 1,
    imageUrl: "/events/Fav%20img%20(11).jpg",
    places: "Base Nautique",
    duration: "Half day"
  },
  {
    id: "act-triathlons",
    name: "Triathlons",
    description: "The ultimate multi-element challenge, combining open-water sea swimming, biking, and trail running.",
    creditCost: 3,
    imageUrl: "/events/Fav%20img%20(9).jpg",
    places: "Base Nautique",
    duration: "Full day"
  },
  {
    id: "act-aquathlons",
    name: "Aquathlons",
    description: "A fast-paced, high-energy transition experience combining sea swimming and natural trail running.",
    creditCost: 2,
    imageUrl: "/events/Fav%20img%20(12).jpg",
    places: "Base Nautique",
    duration: "Half day"
  },

  // Wilderness and Mountain Experiences (Base Forestière)
  {
    id: "act-biking",
    name: "Biking",
    description: "Multi-terrain cycling and mountain biking (VTT) traversing woodland paths and forest fire trails.",
    creditCost: 1,
    imageUrl: "/events/Fav%20img%20(7).jpg",
    places: "Base Forestière",
    duration: "2h"
  },
  {
    id: "act-randonnee",
    name: "Randonnée",
    description: "Wilderness hiking and navigation across dense forest tracks and high ridges for active recovery.",
    creditCost: 1,
    imageUrl: "/events/Fav%20img%20(1).jpg",
    places: "Base Forestière",
    duration: "Half day"
  },
  {
    id: "act-horse-balade",
    name: "Horse Balade",
    description: "Long-distance trail exploration on horseback, establishing a natural bond with the animal.",
    creditCost: 2,
    imageUrl: "/events/Fav%20img%20(2).jpg",
    places: "Base Forestière",
    duration: "2h"
  },
  {
    id: "act-trails",
    name: "Trails",
    description: "Pure trail running experiences across natural paths, focusing on dynamic footwork and endurance.",
    creditCost: 1,
    imageUrl: "/events/Fav%20img%20(3).jpg",
    places: "Base Forestière",
    duration: "2h"
  },
  {
    id: "act-camps-themes",
    name: "Camps with Themes",
    description: "Multi-day themed immersive camps focusing on specialized survival, conditioning, or breathwork.",
    creditCost: 3,
    imageUrl: "/events/Fav%20img%20(6).jpg",
    places: "Base Forestière",
    duration: "3 days"
  },
  {
    id: "act-challenges",
    name: "Challenges",
    description: "Collaborative group trials, navigation courses, and team-based physical obstacles.",
    creditCost: 2,
    imageUrl: "/events/Fav%20img%20(8).jpg",
    places: "Base Forestière",
    duration: "Half day"
  },
  {
    id: "act-outdoor-fitness",
    name: "Outdoor Fitness",
    description: "Functional bodyweight training, mobility work, and natural conditioning bootcamps.",
    creditCost: 1,
    imageUrl: "/events/Fav%20img%20(1).jpg",
    places: "Base Forestière",
    duration: "2h"
  },

  // Urban and Arena Experiences (Base Urbaine)
  {
    id: "act-padel",
    name: "Padel",
    description: "Dynamic racket sport play in modern courts, providing fast-paced sporting entertainment.",
    creditCost: 1,
    imageUrl: "/events/Fav%20img%20(8).jpg",
    places: "Base Urbaine",
    duration: "2h"
  }
];

async function main() {
  const prisma = new PrismaClient();
  try {
    for (const act of activitiesData) {
      const existing = await prisma.activity.findUnique({ where: { id: act.id } });
      if (!existing) {
        await prisma.activity.create({
          data: {
            id: act.id,
            name: act.name,
            description: act.description,
            creditCost: act.creditCost,
            imageUrl: act.imageUrl,
            places: act.places,
            duration: act.duration,
            active: true
          }
        });
        console.log(`✓ Seeded activity: ${act.name}`);
      } else {
        // Update it to make sure active is true and fields match
        await prisma.activity.update({
          where: { id: act.id },
          data: {
            active: true,
            places: act.places,
            imageUrl: act.imageUrl,
            description: act.description,
            duration: act.duration
          }
        });
        console.log(`~ Updated activity: ${act.name}`);
      }
    }
    console.log("Seeding finished successfully!");
  } catch (err) {
    console.error("Seeding error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

import "dotenv/config";
import { prisma } from "../src/db.js";
import { hashPassword } from "../src/password.js";
import { createProperty } from "../src/services/property.js";
import { createShareProgram, postShareAsk } from "../src/services/shares.js";
import { fundWallet } from "../src/services/wallet.js";
import { logger } from "../src/logger.js";

const DEMO_PASSWORD = "estatex-demo-123";

async function seed(): Promise<void> {
  const seller = await prisma.user.upsert({
    where: { email: "seller@estatex.demo" },
    update: {},
    create: { name: "Demo Seller", email: "seller@estatex.demo", passwordHash: await hashPassword(DEMO_PASSWORD), role: "SELLER" }
  });
  const buyer = await prisma.user.upsert({
    where: { email: "buyer@estatex.demo" },
    update: {},
    create: { name: "Demo Buyer", email: "buyer@estatex.demo", passwordHash: await hashPassword(DEMO_PASSWORD), role: "BUYER" }
  });

  await prisma.wallet.upsert({ where: { userId: buyer.id }, update: {}, create: { userId: buyer.id } });
  const buyerBalance = await fundWallet(buyer.id, 1_500_000_00, { note: "Seed top-up" });
  logger.info({ buyerId: buyer.id, balance: buyerBalance }, "seeded buyer wallet");

  const seedListings = [
    {
      title: "Villa Serene",
      description: "A sun-drenched Mediterranean villa with a private pool and olive grove views.",
      priceCents: 850_000_00,
      currency: "USD",
      country: "Portugal",
      city: "Lisbon",
      address: "Rua das Amendoeiras 12",
      sqft: 4200,
      bedrooms: 4,
      bathrooms: 3,
      images: [
        { url: "https://images.unsplash.com/photo-1613490493576-7fde63acd811", alt: "Villa Serene exterior", sortOrder: 0 }
      ]
    },
    {
      title: "Oceanfront Penthouse",
      description: "Modern penthouse with wrap-around terrace overlooking the Atlantic.",
      priceCents: 1_200_000_00,
      currency: "USD",
      country: "United States",
      city: "Miami",
      address: "1 Ocean Drive, PH",
      sqft: 3100,
      bedrooms: 3,
      bathrooms: 3,
      images: [
        { url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267", alt: "Penthouse living room", sortOrder: 0 }
      ]
    },
    {
      title: "Alpine Chalet",
      description: "Cozy ski-in/ski-out chalet with panoramic mountain views and a sauna.",
      priceCents: 640_000_00,
      currency: "USD",
      country: "Switzerland",
      city: "Zermatt",
      address: "Riedweg 4",
      sqft: 2200,
      bedrooms: 3,
      bathrooms: 2,
      images: [
        { url: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4", alt: "Chalet in the Alps", sortOrder: 0 }
      ]
    }
  ];

  for (const listing of seedListings) {
    const existing = await prisma.property.findFirst({ where: { title: listing.title } });
    if (existing) continue;

    const property = await createProperty(seller.id, listing);
    logger.info({ propertyId: property.id, title: property.title }, "seeded property");
  }

  // Fractional program on the first seed property for share demos.
  const first = await prisma.property.findFirstOrThrow({ where: { ownerId: seller.id } });
  const existingProgram = await prisma.shareProgram.findUnique({ where: { propertyId: first.id } });
  if (!existingProgram) {
    const program = await createShareProgram(seller.id, {
      propertyId: first.id,
      totalShares: 1000,
      pricePerShareCents: 850_00 // $850 per share
    });
    await postShareAsk(seller.id, { programId: program.id, units: 200 });
    logger.info({ programId: program.id }, "seeded share program");
  }

  logger.info("seed complete");
}

seed()
  .catch((err) => {
    logger.error({ err }, "seed failed");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

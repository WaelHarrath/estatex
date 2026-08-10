import { prisma } from "@estatex/core";
import { completeText } from "./completions";

function extractJson(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Model did not return JSON");
  }
  return text.slice(start, end + 1);
}

interface GeneratedListing {
  title: string;
  description: string;
  bullets: string[];
}

/** Generates a listing draft for a property owned by the caller. */
export async function generateListingDraft(ownerId: string, propertyId: string) {
  const property = await prisma.property.findUnique({ where: { id: propertyId }, include: { images: true } });
  if (!property) {
    throw new Error("Property not found");
  }
  if (property.ownerId !== ownerId) {
    throw new Error("Only the property owner can generate a listing");
  }

  const text = await completeText({
    maxTokens: 1200,
    system:
      "You write polished real-estate listings. Return ONLY JSON matching: " +
      '{"title": string, "description": string, "bullets": string[]}',
    userContent: `Write a listing for this property: ${JSON.stringify({
      title: property.title,
      city: property.city,
      country: property.country,
      sqft: property.sqft,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      price: Number(property.priceCents) / 100,
      description: property.description
    })}`
  });

  const generated = JSON.parse(extractJson(text)) as GeneratedListing;
  if (!generated.title || !generated.description || !Array.isArray(generated.bullets)) {
    throw new Error("Model returned an invalid listing");
  }

  return prisma.aiListingDraft.upsert({
    where: { propertyId },
    update: { title: generated.title, description: generated.description, bullets: generated.bullets, status: "DRAFT" },
    create: {
      propertyId,
      title: generated.title,
      description: generated.description,
      bullets: generated.bullets,
      status: "DRAFT"
    }
  });
}

/** Copies an approved draft onto the property listing. */
export async function approveListingDraft(ownerId: string, propertyId: string) {
  const draft = await prisma.aiListingDraft.findUnique({ where: { propertyId } });
  if (!draft) {
    throw new Error("No generated draft exists");
  }
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) {
    throw new Error("Property not found");
  }
  if (property.ownerId !== ownerId) {
    throw new Error("Only the property owner can approve a listing");
  }

  const updated = await prisma.property.update({
    where: { id: propertyId },
    data: { title: draft.title, description: draft.description }
  });
  await prisma.aiListingDraft.update({ where: { propertyId }, data: { status: "APPROVED" } });
  return updated;
}

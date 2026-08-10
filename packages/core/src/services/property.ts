import type { PropertyStatus } from "../../generated/prisma/client.js";
import { prisma } from "../db.js";
import { createPropertySchema, type CreatePropertyInput } from "../contracts.js";
import { toCents } from "../money.js";

export class PropertyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PropertyError";
  }
}

export async function createProperty(ownerId: string, input: CreatePropertyInput) {
  const data = createPropertySchema.parse(input);
  return prisma.property.create({
    data: {
      ownerId,
      title: data.title,
      description: data.description,
      priceCents: toCents(data.priceCents),
      currency: data.currency,
      country: data.country,
      city: data.city,
      address: data.address,
      sqft: data.sqft,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      status: "ACTIVE",
      images: {
        create: data.images.map((img) => ({
          url: img.url,
          alt: img.alt,
          sortOrder: img.sortOrder
        }))
      }
    },
    include: { images: { orderBy: { sortOrder: "asc" } } }
  });
}

export async function getProperty(id: string) {
  return prisma.property.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true } },
      images: { orderBy: { sortOrder: "asc" } },
      auction: true,
      shareProgram: true,
      aiDraft: true
    }
  });
}

export async function listProperties(options: { status?: PropertyStatus; country?: string; city?: string } = {}) {
  return prisma.property.findMany({
    where: {
      status: options.status ?? "ACTIVE",
      ...(options.country ? { country: options.country } : {}),
      ...(options.city ? { city: options.city } : {})
    },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      auction: true,
      shareProgram: true
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function setPropertyStatus(id: string, status: PropertyStatus): Promise<void> {
  const result = await prisma.property.updateMany({
    where: { id },
    data: { status }
  });
  if (result.count !== 1) {
    throw new PropertyError(`Property not found: ${id}`);
  }
}

/** All properties owned by a user (profile page), newest first. */
export async function listUserProperties(ownerId: string) {
  return prisma.property.findMany({
    where: { ownerId },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      auction: true,
      shareProgram: true
    },
    orderBy: { createdAt: "desc" }
  });
}

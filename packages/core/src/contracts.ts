import { z } from "zod";

/** Cents are always integer numbers at the API/UI boundary. */
export const centsSchema = z.number().int().positive();

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(128)
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128)
});
export type LoginInput = z.infer<typeof loginSchema>;

export const propertyImageSchema = z.object({
  url: z.string().trim().max(500),
  alt: z.string().trim().max(200).optional(),
  sortOrder: z.number().int().min(0).default(0)
});

export const createPropertySchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(5000),
  priceCents: centsSchema,
  currency: z.string().trim().length(3).default("USD"),
  country: z.string().trim().min(1).max(80),
  city: z.string().trim().min(1).max(80),
  address: z.string().trim().min(1).max(200),
  sqft: z.number().int().positive(),
  bedrooms: z.number().int().nonnegative(),
  bathrooms: z.number().int().nonnegative(),
  images: z.array(propertyImageSchema).max(20).default([])
});
export type CreatePropertyInput = z.infer<typeof createPropertySchema>;

export const createAuctionSchema = z.object({
  propertyId: z.string().trim().min(1),
  startPriceCents: centsSchema,
  minIncrementCents: centsSchema,
  startAt: z.coerce.date().optional(),
  endAt: z.coerce.date(),
  autoExtendSeconds: z.number().int().min(5).max(600).default(30)
});
export type CreateAuctionInput = z.infer<typeof createAuctionSchema>;

export const placeBidSchema = z.object({
  auctionId: z.string().trim().min(1),
  amountCents: centsSchema
});
export type PlaceBidInput = z.infer<typeof placeBidSchema>;

export const createShareProgramSchema = z.object({
  propertyId: z.string().trim().min(1),
  totalShares: z.number().int().min(1).max(1_000_000),
  pricePerShareCents: centsSchema
});
export type CreateShareProgramInput = z.infer<typeof createShareProgramSchema>;

export const postShareAskSchema = z.object({
  programId: z.string().trim().min(1),
  units: z.number().int().min(1).max(1_000_000)
});
export type PostShareAskInput = z.infer<typeof postShareAskSchema>;

export const buySharesSchema = z.object({
  askId: z.string().trim().min(1),
  units: z.number().int().min(1).max(1_000_000)
});
export type BuySharesInput = z.infer<typeof buySharesSchema>;

export const declareDividendSchema = z.object({
  programId: z.string().trim().min(1),
  perShareCents: centsSchema
});
export type DeclareDividendInput = z.infer<typeof declareDividendSchema>;

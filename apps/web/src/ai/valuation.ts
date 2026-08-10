import { getProperty, prisma } from "@estatex/core";
import { completeText } from "./completions";

export interface ValuationEstimate {
  estimateMinCents: number;
  estimateMaxCents: number;
  rationale: string;
}

function extractJson(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Model did not return JSON");
  }
  return text.slice(start, end + 1);
}

/** Estimates a property's value from comparable listings in the same area. */
export async function estimateValue(propertyId: string): Promise<ValuationEstimate> {
  const property = await getProperty(propertyId);
  if (!property) {
    throw new Error("Property not found");
  }

  const comps = await prisma.property.findMany({
    where: {
      id: { not: propertyId },
      status: { in: ["ACTIVE", "SOLD"] },
      OR: [{ city: property.city }, { country: property.country }]
    },
    orderBy: { updatedAt: "desc" },
    take: 8
  });

  const text = await completeText({
    maxTokens: 1500,
    system:
      "You are a real-estate valuation analyst. Estimate a reasonable price range in USD cents based on the " +
      "comparables. Return ONLY JSON matching: " +
      '{"estimateMinCents": number, "estimateMaxCents": number, "rationale": string}',
    userContent: JSON.stringify({
      subject: {
        title: property.title,
        sqft: property.sqft,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        city: property.city,
        country: property.country
      },
      comparables: comps.map((c) => ({
        title: c.title,
        city: c.city,
        country: c.country,
        sqft: c.sqft,
        priceUsd: Number(c.priceCents) / 100,
        status: c.status
      }))
    })
  });

  const parsed = JSON.parse(extractJson(text)) as Partial<ValuationEstimate>;
  if (
    typeof parsed.estimateMinCents !== "number" ||
    typeof parsed.estimateMaxCents !== "number" ||
    typeof parsed.rationale !== "string"
  ) {
    throw new Error("Model returned an invalid valuation");
  }
  return {
    estimateMinCents: Math.max(1, Math.round(parsed.estimateMinCents)),
    estimateMaxCents: Math.max(parsed.estimateMinCents, Math.round(parsed.estimateMaxCents)),
    rationale: parsed.rationale
  };
}

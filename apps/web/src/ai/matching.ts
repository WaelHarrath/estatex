import { listProperties } from "@estatex/core";
import { isAIConfigured } from "./client";
import { completeText } from "./completions";

export interface MatchResult {
  propertyId: string;
  score: number;
  reason: string;
}

interface RankedCandidate {
  propertyId: string;
  score: number;
  reason: string;
}

/** Returns property matches for a buyer, ranked by the model or a budget filter fallback. */
export async function recommendForUser(
  budgetCents?: number,
  city?: string,
  country?: string
): Promise<MatchResult[]> {
  const candidates = await listProperties({
    status: "ACTIVE",
    ...(city ? { city } : {}),
    ...(country ? { country } : {})
  });

  const within = candidates.filter((p) => !budgetCents || Number(p.priceCents) <= budgetCents * 1.2);
  if (within.length === 0) {
    return [];
  }

  if (!isAIConfigured()) {
    return within.slice(0, 5).map((p) => ({ propertyId: p.id, score: 5, reason: "Matches your filters." }));
  }

  const text = await completeText({
    maxTokens: 1200,
    system:
      "You are a real-estate matchmaker. Rank the candidate properties by how well they fit the buyer's " +
      "budget and preferences. Return ONLY JSON, an array of up to 5 objects: " +
      '[{"propertyId": string, "score": number (0-10), "reason": string}]',
    userContent: JSON.stringify({
      buyer: {
        budgetUsd: budgetCents ? budgetCents / 100 : undefined,
        preferredCity: city,
        preferredCountry: country
      },
      candidates: within.slice(0, 15).map((p) => ({
        propertyId: p.id,
        title: p.title,
        city: p.city,
        country: p.country,
        priceUsd: Number(p.priceCents) / 100,
        sqft: p.sqft,
        bedrooms: p.bedrooms,
        auction: Boolean(p.auction),
        shares: Boolean(p.shareProgram)
      }))
    })
  });

  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1) {
    throw new Error("Model did not return a ranking");
  }
  const ranked = JSON.parse(text.slice(start, end + 1)) as RankedCandidate[];
  const byId = new Map(within.map((p) => [p.id, p]));
  return ranked
    .filter((r) => byId.has(r.propertyId))
    .slice(0, 5)
    .map((r) => ({ propertyId: r.propertyId, score: r.score, reason: r.reason }));
}

import type Anthropic from "@anthropic-ai/sdk";
import { getProperty, listProperties } from "@estatex/core";
import { moneyString } from "./client";

export const AI_SYSTEM_PROMPT = `You are the EstateX AI concierge: a helpful assistant for an international
real-estate platform. Users buy and sell houses worldwide, bid in live auctions, and own fractional
house shares.

Rules:
- Answer from the provided data only. If you don't know, say so and suggest the user search the listings.
- Money: prices you see are in cents. Format as USD currency for the user.
- Auction basics: bids must exceed the current price by the minimum increment; funds are reserved on
  the bidder's wallet; a bid in the final 30 seconds extends the auction by 30s (anti-sniping); the
  highest active bid wins and the property is marked SOLD.
- Shares: a property owner can fractionalize a property into shares; open asks let buyers purchase units
  immediately; shareholders earn dividends per unit.
- Once you have the listings or details the user asked about, answer directly — do not keep searching.
Keep replies concise (max ~120 words) and practical.`;

export interface ToolResult {
  name: string;
  input: Record<string, unknown>;
  output: unknown;
}

const searchSchema: Anthropic.Messages.Tool.InputSchema = {
  type: "object",
  properties: {
    query: { type: "string", description: "Free-text search, e.g. 'beach villa'" },
    country: { type: "string" },
    city: { type: "string" },
    maxPriceCents: { type: "number", description: "Maximum price in cents" }
  }
};

const propertySchema: Anthropic.Messages.Tool.InputSchema = {
  type: "object",
  properties: { propertyId: { type: "string" } },
  required: ["propertyId"]
};

export const AI_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "search_properties",
    description: "Search the marketplace for active property listings. Returns title, location, price and key specs.",
    input_schema: searchSchema
  },
  {
    name: "get_property",
    description: "Get the full detail of a single property including auction and share-program availability.",
    input_schema: propertySchema
  }
];

export async function executeTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "search_properties": {
      const country = typeof input.country === "string" && input.country ? input.country : undefined;
      const city = typeof input.city === "string" && input.city ? input.city : undefined;
      const maxPriceCents = typeof input.maxPriceCents === "number" ? input.maxPriceCents : undefined;
      const query = typeof input.query === "string" && input.query ? input.query.toLowerCase() : "";

      const all = await listProperties({ status: "ACTIVE", country, city });
      const filtered = all
        .filter((p) => (maxPriceCents ? Number(p.priceCents) <= maxPriceCents : true))
        .filter((p) => {
          if (!query) return true;
          const haystack = `${p.title} ${p.city} ${p.country} ${p.description}`.toLowerCase();
          return haystack.includes(query);
        })
        .slice(0, 5);

      return filtered.map((p) => ({
        id: p.id,
        title: p.title,
        city: p.city,
        country: p.country,
        price: moneyString(p.priceCents),
        bedrooms: p.bedrooms,
        sqft: p.sqft,
        auction: Boolean(p.auction),
        shares: Boolean(p.shareProgram)
      }));
    }
    case "get_property": {
      const propertyId = typeof input.propertyId === "string" ? input.propertyId : "";
      const property = await getProperty(propertyId);
      if (!property) return { error: "Property not found" };
      return {
        id: property.id,
        title: property.title,
        description: property.description,
        price: moneyString(property.priceCents),
        city: property.city,
        country: property.country,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        sqft: property.sqft,
        status: property.status,
        auction: property.auction
          ? { status: property.auction.status, currentPrice: moneyString(property.auction.currentPriceCents), endAt: property.auction.endAt.toISOString() }
          : null,
        shareProgram: property.shareProgram
          ? { totalShares: property.shareProgram.totalShares, issuedShares: property.shareProgram.issuedShares, pricePerShare: moneyString(property.shareProgram.pricePerShareCents) }
          : null
      };
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

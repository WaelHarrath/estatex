import { describe, expect, it } from "vitest";
import { createPropertySchema, loginSchema, registerSchema } from "../src/contracts.js";

describe("registerSchema", () => {
  it("accepts a valid registration", () => {
    const result = registerSchema.safeParse({ name: "Ada", email: "Ada@Example.com ", password: "password123" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("ada@example.com");
    }
  });

  it("rejects a short password", () => {
    expect(registerSchema.safeParse({ name: "Ada", email: "ada@example.com", password: "short" }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(registerSchema.safeParse({ name: "Ada", email: "not-an-email", password: "password123" }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts a valid login", () => {
    expect(loginSchema.safeParse({ email: "Ada@Example.com", password: "x".repeat(8) }).success).toBe(true);
  });
});

describe("createPropertySchema", () => {
  it("accepts a valid property", () => {
    const result = createPropertySchema.safeParse({
      title: "Casa",
      description: "A lovely house",
      priceCents: 850_000_00,
      country: "Portugal",
      city: "Lisbon",
      address: "Rua 1",
      sqft: 4200,
      bedrooms: 4,
      bathrooms: 3
    });
    expect(result.success).toBe(true);
  });

  it("defaults currency to USD and images to empty", () => {
    const result = createPropertySchema.parse({
      title: "Casa",
      description: "A lovely house",
      priceCents: 1_000_00,
      country: "PT",
      city: "Lisbon",
      address: "Rua 1",
      sqft: 100,
      bedrooms: 1,
      bathrooms: 1
    });
    expect(result.currency).toBe("USD");
    expect(result.images).toEqual([]);
  });

  it("rejects zero price and negative sqft", () => {
    const base = {
      title: "Casa",
      description: "A lovely house",
      country: "PT",
      city: "Lisbon",
      address: "Rua 1",
      bedrooms: 1,
      bathrooms: 1
    };
    expect(createPropertySchema.safeParse({ ...base, priceCents: 0, sqft: 100 }).success).toBe(false);
    expect(createPropertySchema.safeParse({ ...base, priceCents: 100, sqft: -1 }).success).toBe(false);
  });
});

import Anthropic from "@anthropic-ai/sdk";

export const DEFAULT_MODEL = "claude-sonnet-5";

export type AIProvider = "anthropic" | "gemini" | "groq" | "openrouter";

/** Resolve which backend powers the concierge. Explicit AI_PROVIDER wins; otherwise auto-detect from keys. */
export function resolveProvider(): AIProvider {
  const p = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (p === "gemini" || p === "groq" || p === "openrouter") {
    return p;
  }
  if (p === "anthropic") {
    return "anthropic";
  }
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.OPENROUTER_API_KEY) return "openrouter";
  return "anthropic";
}

export function resolveModel(): string {
  return process.env.AI_MODEL?.trim() || DEFAULT_MODEL;
}

export function getClient(): Anthropic | null {
  if (resolveProvider() !== "anthropic") {
    return null;
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Anthropic({ apiKey });
}

/** True when the resolved provider has an API key configured. */
export function isAIConfigured(): boolean {
  if (resolveProvider() === "anthropic") {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  }
  const config = getOpenAIConfig();
  return Boolean(config && config.apiKey);
}

export interface OpenAIConfig {
  provider: Exclude<AIProvider, "anthropic">;
  model: string;
  apiKey: string;
  baseUrl: string;
}

/** Config for OpenAI-compatible providers (Gemini, Groq, OpenRouter). Null when the backend is Anthropic. */
export function getOpenAIConfig(): OpenAIConfig | null {
  const provider = resolveProvider();
  const modelOverride = process.env.AI_MODEL?.trim();

  switch (provider) {
    case "gemini": {
      const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
      return {
        provider,
        model: modelOverride || "gemini-3.6-flash",
        apiKey,
        baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/"
      };
    }
    case "groq": {
      const apiKey = process.env.GROQ_API_KEY || "";
      return {
        provider,
        model: modelOverride || "llama-3.3-70b-versatile",
        apiKey,
        baseUrl: "https://api.groq.com/openai/v1/"
      };
    }
    case "openrouter": {
      const apiKey = process.env.OPENROUTER_API_KEY || "";
      return {
        provider,
        model: modelOverride || "deepseek/deepseek-chat:free",
        apiKey,
        baseUrl: "https://openrouter.ai/api/v1/"
      };
    }
    default:
      return null;
  }
}

/** Small util to keep JSON serialization of BigInt-safe money readable. */
export function moneyString(cents: bigint): string {
  return (Number(cents) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

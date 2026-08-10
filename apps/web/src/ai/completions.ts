import type Anthropic from "@anthropic-ai/sdk";
import { logger } from "@estatex/core";
import { getClient, resolveModel, getOpenAIConfig, resolveProvider } from "./client";

export interface CompletionOptions {
  system: string;
  userContent: string;
  maxTokens?: number;
}

/**
 * Provider-aware single text completion (Anthropic or OpenAI-compatible).
 * Throws with a clear message when the configured provider has no API key.
 */
export async function completeText(opts: CompletionOptions): Promise<string> {
  const maxTokens = opts.maxTokens ?? 1024;

  if (resolveProvider() === "anthropic") {
    const client = getClient();
    if (!client) {
      throw new Error("AI is not configured (ANTHROPIC_API_KEY missing)");
    }
    const response = await client.messages.create({
      model: resolveModel(),
      max_tokens: maxTokens,
      system: opts.system,
      messages: [{ role: "user", content: opts.userContent }]
    });
    return response.content
      .filter((c): c is Anthropic.TextBlock => c.type === "text")
      .map((c) => c.text)
      .join("");
  }

  const config = getOpenAIConfig();
  if (!config || !config.apiKey) {
    throw new Error(`AI is not configured (${resolveProvider().toUpperCase()} API key missing)`);
  }

  const res = await fetch(`${config.baseUrl}chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.userContent }
      ],
      max_tokens: maxTokens
    })
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    logger.error({ provider: config.provider, status: res.status, detail }, "ai completion request failed");
    throw new Error(`AI request failed (HTTP ${res.status})`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

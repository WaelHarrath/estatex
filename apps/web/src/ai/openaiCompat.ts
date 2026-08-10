import { logger } from "@estatex/core";
import { AI_SYSTEM_PROMPT, AI_TOOLS, executeTool } from "./tools";
import { getOpenAIConfig } from "./client";
import { loadHistory, persistTurn } from "./messages";

const MAX_TOOL_ROUNDS = 3;

interface OpenAIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
}

/** Convert Anthropic-shaped tool schemas to OpenAI function-calling shape. */
function toOpenAITools() {
  return AI_TOOLS.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema
    }
  }));
}

/**
 * Runs the concierge against any OpenAI-compatible chat completions endpoint
 * (Gemini, Groq, OpenRouter) with a function-calling tool loop mirroring the
 * Anthropic path in concierge.ts. Conversation history is shared via ChatMessage.
 */
export async function runConciergeOpenAI(
  userId: string,
  sessionId: string,
  message: string,
  propertyId?: string
): Promise<string> {
  const config = getOpenAIConfig();
  if (!config || !config.apiKey) {
    return "AI concierge is not configured (missing API key). Please try again later.";
  }

  const history = await loadHistory(userId, sessionId);
  const messages: OpenAIMessage[] = history.map((m) => ({
    role: m.role,
    content: m.content
  }));
  messages.push({ role: "user", content: message });

  const system = propertyId
    ? `${AI_SYSTEM_PROMPT}\n\nThe user is currently viewing property ${propertyId} — you may call get_property with it to ground your answer.`
    : AI_SYSTEM_PROMPT;

  let reply = "";
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const res = await fetch(`${config.baseUrl}chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "system", content: system }, ...messages],
        tools: toOpenAITools(),
        max_tokens: 1024
      })
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      logger.error({ provider: config.provider, status: res.status, detail }, "openai-compat request failed");
      return "The AI concierge service is temporarily unavailable. Please try again later.";
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: OpenAIMessage }>;
    };
    const msg = data.choices?.[0]?.message;
    if (!msg) {
      return "The AI concierge returned an empty response. Please try again.";
    }

    const toolCalls = msg.tool_calls ?? [];
    if (toolCalls.length === 0) {
      reply = msg.content ?? "";
      break;
    }

    messages.push({ role: "assistant", content: msg.content, tool_calls: toolCalls });
    for (const call of toolCalls) {
      let input: Record<string, unknown> = {};
      try {
        input = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
      } catch {
        input = {};
      }
      const output = await executeTool(call.function.name, input);
      logger.debug({ tool: call.function.name }, "concierge tool executed");
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(output)
      });
    }
  }

  if (!reply) {
    // Some OpenAI-compatible providers (Gemini) keep calling tools and can
    // exhaust the round cap without a final text. Force one answer-only call
    // so the model must reply from the context it already gathered.
    try {
      const finalRes = await fetch(`${config.baseUrl}chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: "system", content: system }, ...messages],
          tools: toOpenAITools(),
          tool_choice: "none",
          max_tokens: 1024
        })
      });
      if (finalRes.ok) {
        const finalData = (await finalRes.json()) as {
          choices?: Array<{ message?: OpenAIMessage }>;
        };
        reply = finalData.choices?.[0]?.message?.content ?? "";
      }
    } catch (err) {
      logger.error({ provider: config.provider, err }, "forced concierge answer failed");
    }
  }

  if (!reply) {
    reply = "I was unable to finish an answer. Please try rephrasing your question.";
  }

  await persistTurn(userId, sessionId, message, reply);
  return reply;
}

import type Anthropic from "@anthropic-ai/sdk";
import { logger } from "@estatex/core";
import { AI_SYSTEM_PROMPT, AI_TOOLS, executeTool } from "./tools";
import { getClient, resolveModel, resolveProvider } from "./client";
import { runConciergeOpenAI } from "./openaiCompat";
import { loadHistory, persistTurn } from "./messages";

const MAX_TOOL_ROUNDS = 3;

/**
 * Runs the concierge. Backend is chosen by provider:
 * - anthropic (default): native Anthropic SDK with a lightweight tool loop.
 * - gemini / groq / openrouter: OpenAI-compatible adapter (see openaiCompat.ts).
 * Conversation history is persisted in ChatMessage for the user's session.
 */
export async function runConcierge(
  userId: string,
  sessionId: string,
  message: string,
  propertyId?: string
): Promise<string> {
  if (resolveProvider() !== "anthropic") {
    return runConciergeOpenAI(userId, sessionId, message, propertyId);
  }

  const client = getClient();
  if (!client) {
    return "AI concierge is not configured (ANTHROPIC_API_KEY missing). Please try again later.";
  }

  const history = await loadHistory(userId, sessionId);
  const messages: Anthropic.Messages.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content
  }));

  // Fresh message for this turn.
  messages.push({ role: "user", content: message });

  const system = propertyId
    ? `${AI_SYSTEM_PROMPT}\n\nThe user is currently viewing property ${propertyId} — you may call get_property with it to ground your answer.`
    : AI_SYSTEM_PROMPT;

  let reply = "";
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await client.messages.create({
      model: resolveModel(),
      max_tokens: 1024,
      system,
      tools: AI_TOOLS,
      messages
    });

    const toolUses = response.content.filter((c): c is Anthropic.ToolUseBlock => c.type === "tool_use");
    if (toolUses.length === 0) {
      reply = response.content
        .filter((c): c is Anthropic.TextBlock => c.type === "text")
        .map((c) => c.text)
        .join("");
      break;
    }

    messages.push({ role: "assistant", content: response.content });
    for (const toolUse of toolUses) {
      const output = await executeTool(toolUse.name, (toolUse.input ?? {}) as Record<string, unknown>);
      logger.debug({ tool: toolUse.name }, "concierge tool executed");
      messages.push({
        role: "user",
        content: [{ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(output) }]
      });
    }
  }

  if (!reply) {
    reply = "I was unable to finish an answer. Please try rephrasing your question.";
  }

  await persistTurn(userId, sessionId, message, reply);
  return reply;
}

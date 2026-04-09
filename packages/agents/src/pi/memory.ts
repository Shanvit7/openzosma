/**
 * LLM-based fact extraction for agent memory.
 *
 * After each conversation turn, we ask the active model to extract memorable
 * facts from the exchange and return them as ExtractedFact objects for ingestion
 * into the zosma-mem bridge. Extension path resolution lives in @openzosma/zosma-mem.
 */

import { completeSimple } from "@mariozechner/pi-ai"
import type { Api, Model } from "@mariozechner/pi-ai"
import { createLogger } from "@openzosma/logger"
import type { ExtractedFact } from "@openzosma/zosma-mem/bridge"

const log = createLogger({ component: "agents:memory" })

const EXTRACTION_SYSTEM_PROMPT = `You are a memory extraction assistant. Your job is to identify facts worth
remembering long-term from a conversation exchange.

Extract facts that are:
- User preferences (favorite things, dislikes, habits)
- Decisions made by the user
- Constraints or rules the user has stated
- Personal information the user shared
- Repeating patterns or explicit instructions

Do NOT extract:
- Facts that are only relevant to the current task
- Temporary states ("I'm tired today")
- Questions without answers
- Generic statements that apply to everyone

Return a JSON array. Each element must be an object with:
- "content": a self-contained, third-person statement of the fact (e.g. "User's favorite animal is elephant")
- "type": one of "preference" | "decision" | "pattern" | "error"
- "tags": array of 2-5 lowercase keywords

If nothing is worth remembering, return an empty array: []

Respond with ONLY the JSON array. No explanation, no markdown fences.`

/**
 * Use the active LLM to extract memorable facts from a single conversation turn.
 * Returns an empty array on any error — this is a non-critical background path.
 */
export const extractFacts = async (
  model: Model<Api>,
  apiKey: string,
  userMessage: string,
  assistantResponse: string,
): Promise<ExtractedFact[]> => {
  if (!userMessage.trim() || !assistantResponse.trim()) return []

  const prompt = `User: ${userMessage}\n\nAssistant: ${assistantResponse}`

  try {
    const result = await completeSimple(
      model,
      {
        systemPrompt: EXTRACTION_SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt, timestamp: Date.now() }],
      },
      { apiKey, maxTokens: 512 },
    )

    const text = result.content
      .filter((c): c is { type: "text"; text: string } => c.type === "text")
      .map((c) => c.text)
      .join("")
      .trim()

    if (!text) return []

    const parsed: unknown = JSON.parse(text)

    if (!Array.isArray(parsed)) return []

    return parsed.filter(
      (item): item is ExtractedFact =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Record<string, unknown>).content === "string" &&
        ["preference", "decision", "pattern", "error"].includes((item as Record<string, unknown>).type as string) &&
        Array.isArray((item as Record<string, unknown>).tags),
    )
  } catch (err) {
    log.warn("Memory extraction failed (non-fatal)", {
      error: err instanceof Error ? err.message : String(err),
    })
    return []
  }
}

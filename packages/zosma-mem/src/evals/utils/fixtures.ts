/**
 * Synthetic data builders for eval scenarios.
 *
 * All builders produce deterministic output given the same inputs.
 * No randomness, no network calls, no engine types.
 */

import type { MemoryEvent, RetrieveQuery } from "../types.js"

// ---------------------------------------------------------------------------
// Event builders
// ---------------------------------------------------------------------------

/**
 * Create a MemoryEvent with sensible defaults.
 * Any field can be overridden by passing a partial.
 */
export const createEvent = (overrides: Partial<MemoryEvent> & Pick<MemoryEvent, "id" | "content">): MemoryEvent => ({
	type: "pattern",
	tags: [],
	timestamp: 0,
	metadata: {},
	...overrides,
})

/**
 * Build a batch of N low-value events (no tags, generic content).
 * Used in signal-dilution scenarios to pad the memory store.
 */
export const createLowValueEvents = (count: number, startTimestamp: number): MemoryEvent[] =>
	Array.from({ length: count }, (_, i) => ({
		id: `low-value-${i}`,
		type: "pattern",
		content: `Routine observation ${i}: nothing notable happened.`,
		tags: [],
		timestamp: startTimestamp + i,
		metadata: {},
	}))

/**
 * Build a batch of high-value events with explicit tags.
 */
export const createHighValueEvents = (
	ids: string[],
	tags: string[],
	startTimestamp: number,
): MemoryEvent[] =>
	ids.map((id, i) => ({
		id,
		type: "decision",
		content: `Critical decision recorded: ${id}. Tags: ${tags.join(", ")}.`,
		tags,
		timestamp: startTimestamp + i,
		metadata: {},
	}))

// ---------------------------------------------------------------------------
// Query builders
// ---------------------------------------------------------------------------

/**
 * Create a RetrieveQuery with sensible defaults.
 */
export const createQuery = (overrides: Partial<RetrieveQuery> & Pick<RetrieveQuery, "text">): RetrieveQuery => ({
	tags: [],
	...overrides,
})

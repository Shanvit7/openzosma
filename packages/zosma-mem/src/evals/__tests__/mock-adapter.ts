/**
 * Trivial in-memory adapter used to test the eval framework itself.
 *
 * NOT for evaluating a real engine. This adapter implements the simplest
 * possible retrieval strategy (tag overlap count) to verify that the
 * framework's metric computation, runner lifecycle, and scenario logic
 * are all correct without needing a real engine.
 *
 * Behaviour:
 * - `ingest`: stores the event. If the same ID is ingested again, the latest
 *   version replaces the previous one (last-write-wins).
 * - `retrieve`: scores entities by the number of tag matches with the query.
 *   On tie, newer timestamps rank higher.
 * - `recordUsage`: no-op (no reinforcement learning).
 * - `gc`: removes entities whose tags contain "stale" (simulates simple decay).
 *   Also supports time-based removal: entities older than 7 days from clock.
 * - `advanceTime`: delegates to the injected DeterministicClock.
 * - `listEntities`: returns all stored IDs.
 * - `setup` / `teardown`: clears internal state.
 */

import type {
	AdapterSetupOpts,
	DeterministicClock,
	GcResult,
	MemoryAdapter,
	MemoryEvent,
	RetrievedEntity,
	RetrieveQuery,
} from "../types.js"

interface StoredEntity {
	event: MemoryEvent
	usageCount: number
	ignored: number
}

const GC_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1_000 // 7 days

export const createMockAdapter = (): MemoryAdapter => {
	const store = new Map<string, StoredEntity>()
	let clock: DeterministicClock = { now: () => Date.now(), advance: () => undefined }

	const setup = async (opts: AdapterSetupOpts): Promise<void> => {
		store.clear()
		clock = opts.clock
	}

	const ingest = async (event: MemoryEvent): Promise<void> => {
		store.set(event.id, { event, usageCount: 0, ignored: 0 })
	}

	const retrieve = async (query: RetrieveQuery, topK: number): Promise<RetrievedEntity[]> => {
		const queryTags = new Set([
			...(query.tags ?? []).map((t) => t.toLowerCase()),
			...query.text.toLowerCase().split(/\s+/),
		])

		const scored = Array.from(store.values()).map(({ event }) => {
			const tagScore = event.tags.filter((t) => queryTags.has(t.toLowerCase())).length
			return { id: event.id, content: event.content, score: tagScore, tags: event.tags, timestamp: event.timestamp }
		})

		// Sort by score desc, then timestamp desc (recency tiebreak).
		scored.sort((a, b) => b.score - a.score || b.timestamp - a.timestamp)

		return scored.slice(0, topK).map(({ id, content, score, tags }) => ({ id, content, score, tags }))
	}

	const recordUsage = async (entityId: string): Promise<void> => {
		const entry = store.get(entityId)
		if (entry) store.set(entityId, { ...entry, usageCount: entry.usageCount + 1 })
	}

	const gc = async (): Promise<GcResult> => {
		const now = clock.now()
		const toRemove: string[] = []

		for (const [id, { event }] of store) {
			const age = now - event.timestamp
			if (age > GC_MAX_AGE_MS || event.tags.includes("stale")) {
				toRemove.push(id)
			}
		}

		for (const id of toRemove) store.delete(id)

		return { removedCount: toRemove.length, archivedCount: 0, consolidatedCount: 0 }
	}

	const advanceTime = async (ms: number): Promise<void> => {
		clock.advance(ms)
	}

	const listEntities = async (): Promise<string[]> => Array.from(store.keys())

	const teardown = async (): Promise<void> => {
		store.clear()
	}

	return { setup, ingest, retrieve, recordUsage, gc, advanceTime, listEntities, teardown }
}

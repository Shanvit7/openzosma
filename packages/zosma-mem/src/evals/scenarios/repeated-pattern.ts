/**
 * Scenario 2: Repeated pattern
 *
 * The same error event is ingested 5 times (same ID, same tags, evolving
 * content). Between ingestions the adapter receives reinforcement signals
 * indicating the entity was used. After reinforcement, the entity must rank
 * first in a retrieval.
 *
 * Tests: reinforcement loop -- entities that get usage signals rise in rank.
 */

import { computeMRR, computePrecisionAtK, computeRecallAtK, computeNoiseRatio } from "../metrics.js"
import { checkAllMetrics } from "../utils/assertions.js"
import { createEvent, createQuery } from "../utils/fixtures.js"
import type { DeterministicClock, MemoryAdapter, ScenarioDefinition, ScenarioResult } from "../types.js"

const K = 5
const THRESHOLDS = { mrr: 1.0 }

const run = async (adapter: MemoryAdapter, clock: DeterministicClock): Promise<ScenarioResult> => {
	let t = clock.now()

	const recurringId = "retry-timeout"

	// Ingest the recurring entity 5 times with progressively refined content.
	for (let i = 0; i < 5; i++) {
		await adapter.ingest(
			createEvent({
				id: recurringId,
				type: "error",
				content: `Network timeout on retry attempt ${i + 1}. Increase backoff to ${(i + 1) * 200}ms.`,
				tags: ["network", "retry", "timeout"],
				timestamp: t,
			}),
		)
		// Signal that the agent used this entity after each ingestion.
		await adapter.recordUsage(recurringId, "influenced_decision")
		clock.advance(1_000)
		t = clock.now()
	}

	// Add some competing entities so the ranking is non-trivial.
	await adapter.ingest(createEvent({ id: "db-connection", type: "error", content: "DB connection pool exhausted.", tags: ["database", "pool"], timestamp: t + 1 }))
	await adapter.ingest(createEvent({ id: "cache-miss", type: "pattern", content: "Cache miss rate above 80% -- review TTL settings.", tags: ["cache", "performance"], timestamp: t + 2 }))

	const query = createQuery({ text: "What should I do when a network request times out?", tags: ["network", "retry"] })
	const results = await adapter.retrieve(query, K)
	const retrieved = results.map((r) => r.id)
	const relevantSet = new Set([recurringId])
	const everRetrieved = new Set(retrieved)
	const allEntities = await adapter.listEntities()

	const metrics = {
		precisionAtK: computePrecisionAtK(retrieved, relevantSet, K),
		recallAtK: computeRecallAtK(retrieved, relevantSet, K),
		mrr: computeMRR(retrieved, relevantSet),
		noiseRatio: computeNoiseRatio(allEntities, everRetrieved),
		gcEffectiveness: -1,
		salienceDrift: -1,
	}

	const failures = checkAllMetrics(metrics, THRESHOLDS)
	return { metrics, passed: failures.length === 0, details: failures.join("; ") }
}

export const repeatedPatternScenario: ScenarioDefinition = {
	name: "Repeated pattern",
	description: "Recurring entity ingested 5 times with reinforcement signals; must rank first.",
	run,
}

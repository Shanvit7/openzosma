/**
 * Scenario 4: Stale memory
 *
 * Events are ingested, then the clock is advanced 30 days without any access.
 * GC is run. A fresh event is ingested. Retrieval must prefer the fresh entity
 * over the stale ones. GC effectiveness is measured by checking how many of
 * the stale, never-retrieved events were removed.
 *
 * Tests: time-based decay + GC pruning of unused entities.
 */

import { computeGcEffectiveness, computeMRR, computeNoiseRatio, computePrecisionAtK, computeRecallAtK } from "../metrics.js"
import { checkAllMetrics } from "../utils/assertions.js"
import { createEvent, createQuery } from "../utils/fixtures.js"
import { THIRTY_DAYS_MS } from "../utils/time.js"
import type { DeterministicClock, MemoryAdapter, ScenarioDefinition, ScenarioResult } from "../types.js"

const K = 5
// GC effectiveness is advisory here -- not all engines support decay.
const THRESHOLDS = { mrr: 1.0 }

const run = async (adapter: MemoryAdapter, clock: DeterministicClock): Promise<ScenarioResult> => {
	const t = clock.now()

	// Ingest stale events -- none of them will be retrieved after the time jump.
	const staleIds = ["stale-a", "stale-b", "stale-c", "stale-d", "stale-e"]
	for (const id of staleIds) {
		await adapter.ingest(
			createEvent({
				id,
				type: "pattern",
				content: `Old preference: ${id}. No longer relevant.`,
				tags: ["legacy", "stale"],
				timestamp: t,
			}),
		)
	}

	// Record the entity list before GC.
	const entitiesBeforeGc = await adapter.listEntities()

	// Advance the clock 30 days -- simulates no activity.
	await adapter.advanceTime(THIRTY_DAYS_MS)
	clock.advance(THIRTY_DAYS_MS)

	// Run GC.
	await adapter.gc()

	// Ingest a fresh, highly relevant event after the time jump.
	const freshId = "fresh-auth-decision"
	await adapter.ingest(
		createEvent({
			id: freshId,
			type: "decision",
			content: "New auth policy: enforce MFA for all admin accounts.",
			tags: ["auth", "security", "policy"],
			timestamp: clock.now(),
		}),
	)

	const entitiesAfterGc = await adapter.listEntities()

	// Identify noise (stale entities never retrieved).
	const noiseBeforeGc = entitiesBeforeGc.filter((id) => staleIds.includes(id))

	const query = createQuery({ text: "What is the current auth policy for admin accounts?", tags: ["auth", "policy"] })
	const results = await adapter.retrieve(query, K)
	const retrieved = results.map((r) => r.id)
	const relevantSet = new Set([freshId])
	const everRetrieved = new Set(retrieved)

	const metrics = {
		precisionAtK: computePrecisionAtK(retrieved, relevantSet, K),
		recallAtK: computeRecallAtK(retrieved, relevantSet, K),
		mrr: computeMRR(retrieved, relevantSet),
		noiseRatio: computeNoiseRatio(entitiesAfterGc, everRetrieved),
		gcEffectiveness: computeGcEffectiveness(noiseBeforeGc, entitiesAfterGc),
		salienceDrift: -1,
	}

	const failures = checkAllMetrics(metrics, THRESHOLDS)
	return { metrics, passed: failures.length === 0, details: failures.join("; ") }
}

export const staleMemoryScenario: ScenarioDefinition = {
	name: "Stale memory",
	description: "Events ingested, clock advanced 30 days, GC run. Fresh entity must rank first.",
	run,
}

/**
 * Scenario 3: Signal dilution
 *
 * 100 low-value events are ingested alongside 3 high-value events. A targeted
 * query is issued that matches only the high-value events. The engine must
 * surface at least 3 of the 5 top results from the high-value set, proving
 * that the pool size does not dilute retrieval quality.
 *
 * Tests: attention gating / relevance ranking at scale.
 */

import { computeMRR, computePrecisionAtK, computeRecallAtK, computeNoiseRatio } from "../metrics.js"
import { checkAllMetrics } from "../utils/assertions.js"
import { createHighValueEvents, createLowValueEvents, createQuery } from "../utils/fixtures.js"
import type { DeterministicClock, MemoryAdapter, ScenarioDefinition, ScenarioResult } from "../types.js"

const K = 5
const THRESHOLDS = { precisionAtK: 0.6, recallAtK: 1.0, mrr: 1.0 }

const run = async (adapter: MemoryAdapter, clock: DeterministicClock): Promise<ScenarioResult> => {
	const t = clock.now()

	const highValueIds = ["perf-critical-1", "perf-critical-2", "perf-critical-3"]
	const highValueTags = ["performance", "critical", "database"]

	// Ingest 100 low-value events first (noise).
	for (const event of createLowValueEvents(100, t)) {
		await adapter.ingest(event)
	}

	// Ingest the 3 high-value events.
	for (const event of createHighValueEvents(highValueIds, highValueTags, t + 100)) {
		await adapter.ingest(event)
	}

	const query = createQuery({
		text: "Critical database performance issues that need immediate attention",
		tags: ["performance", "database", "critical"],
	})

	const results = await adapter.retrieve(query, K)
	const retrieved = results.map((r) => r.id)
	const relevantSet = new Set(highValueIds)
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

export const signalDilutionScenario: ScenarioDefinition = {
	name: "Signal dilution",
	description: "100 low-value + 3 high-value events; engine must surface high-value despite pool size.",
	run,
}

/**
 * Scenario 5: Conflicting updates
 *
 * The same logical entity is ingested 4 times with progressively updated
 * content (simulating a fact that evolved over sessions). The most recent
 * version must appear first in retrieval results.
 *
 * Tests: last-write-wins / recency preference for updated entities.
 */

import { computeMRR, computePrecisionAtK, computeRecallAtK, computeNoiseRatio } from "../metrics.js"
import { checkAllMetrics } from "../utils/assertions.js"
import { createEvent, createQuery } from "../utils/fixtures.js"
import type { DeterministicClock, MemoryAdapter, ScenarioDefinition, ScenarioResult } from "../types.js"

const K = 5
const THRESHOLDS = { mrr: 1.0 }

const run = async (adapter: MemoryAdapter, clock: DeterministicClock): Promise<ScenarioResult> => {
	let t = clock.now()

	const entityId = "db-schema-decision"
	const versions = [
		"Initial: use a single users table with a role column.",
		"Update: split roles into a separate roles table for normalisation.",
		"Update: add an audit_log table for compliance tracking.",
		"Final: add soft-delete (deleted_at) to users; audit_log is append-only.",
	]

	// Ingest all 4 versions of the same entity.
	for (const content of versions) {
		await adapter.ingest(
			createEvent({
				id: entityId,
				type: "decision",
				content,
				tags: ["database", "schema", "users"],
				timestamp: t,
			}),
		)
		clock.advance(60_000) // 1 minute between updates
		t = clock.now()
	}

	// Add an unrelated entity to ensure ranking is non-trivial.
	await adapter.ingest(
		createEvent({ id: "cache-strategy", type: "pattern", content: "Use Redis for session caching.", tags: ["cache", "redis"], timestamp: t }),
	)

	const query = createQuery({ text: "What is the current database schema for users?", tags: ["database", "schema"] })
	const results = await adapter.retrieve(query, K)
	const retrieved = results.map((r) => r.id)
	const relevantSet = new Set([entityId])
	const everRetrieved = new Set(retrieved)
	const allEntities = await adapter.listEntities()

	// Additionally verify that the content of the top result reflects the latest version.
	const topResult = results[0]
	const contentIsLatest = topResult?.id === entityId && topResult.content.includes("soft-delete")
	const contentDetails = topResult?.id === entityId && !contentIsLatest
		? `top result content does not reflect latest version (got: "${topResult.content?.slice(0, 60)}")`
		: ""

	const metrics = {
		precisionAtK: computePrecisionAtK(retrieved, relevantSet, K),
		recallAtK: computeRecallAtK(retrieved, relevantSet, K),
		mrr: computeMRR(retrieved, relevantSet),
		noiseRatio: computeNoiseRatio(allEntities, everRetrieved),
		gcEffectiveness: -1,
		salienceDrift: -1,
	}

	const failures = checkAllMetrics(metrics, THRESHOLDS)
	if (contentDetails) failures.push(contentDetails)

	return { metrics, passed: failures.length === 0, details: failures.join("; ") }
}

export const conflictingUpdatesScenario: ScenarioDefinition = {
	name: "Conflicting updates",
	description: "Entity ingested 4 times with evolving content; most recent version must rank first.",
	run,
}

/**
 * Scenario 1: Cold start
 *
 * An empty engine ingests a mixed set of events (decisions, errors, patterns,
 * preferences). A targeted query is issued. The engine must surface the
 * semantically relevant events in the top K.
 *
 * Tests: basic ingestion and retrieval with no prior state.
 */

import { computeMRR, computePrecisionAtK, computeRecallAtK, computeNoiseRatio } from "../metrics.js"
import { checkAllMetrics } from "../utils/assertions.js"
import { createEvent, createQuery } from "../utils/fixtures.js"
import type { DeterministicClock, MemoryAdapter, ScenarioDefinition, ScenarioResult } from "../types.js"

const K = 5

const THRESHOLDS = { precisionAtK: 0.6, recallAtK: 0.8, mrr: 0.5 }

const run = async (adapter: MemoryAdapter, clock: DeterministicClock): Promise<ScenarioResult> => {
	const t = clock.now()

	// Ingest 10 events -- 3 relevant (tagged "auth"), 7 irrelevant noise.
	const relevant = ["auth-decision", "auth-error", "auth-pattern"]

	await adapter.ingest(createEvent({ id: "auth-decision", type: "decision", content: "Use short-lived JWTs with refresh token rotation.", tags: ["auth", "security"], timestamp: t }))
	await adapter.ingest(createEvent({ id: "auth-error", type: "error", content: "Session invalidated on password reset -- must revoke all tokens.", tags: ["auth", "session"], timestamp: t + 1 }))
	await adapter.ingest(createEvent({ id: "auth-pattern", type: "pattern", content: "Always validate token expiry before issuing a new one.", tags: ["auth", "token"], timestamp: t + 2 }))

	// Noise events -- different domain.
	for (let i = 0; i < 7; i++) {
		await adapter.ingest(createEvent({ id: `noise-${i}`, type: "pattern", content: `Styling preference ${i}: use 4-space indentation.`, tags: ["style"], timestamp: t + 3 + i }))
	}

	const query = createQuery({ text: "How should authentication tokens be managed?", tags: ["auth"] })
	const results = await adapter.retrieve(query, K)
	const retrieved = results.map((r) => r.id)
	const relevantSet = new Set(relevant)
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

export const coldStartScenario: ScenarioDefinition = {
	name: "Cold start",
	description: "Empty engine ingests 10 events (3 relevant) and retrieves for an auth query.",
	run,
}

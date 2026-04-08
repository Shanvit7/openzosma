/**
 * Scenario 6: Co-access cluster
 *
 * Three entities (A, B, C) are always retrieved together during a series of
 * usage sessions. Each time A is retrieved and used, B and C are also
 * retrieved and used. Later, a query is issued that directly matches only A.
 * All three must appear in the top K -- demonstrating that the engine surfaces
 * contextually related entities (co-access boost).
 *
 * Tests: co-access / relational memory clustering.
 */

import { computeMRR, computePrecisionAtK, computeRecallAtK, computeNoiseRatio } from "../metrics.js"
import { checkAllMetrics } from "../utils/assertions.js"
import { createEvent, createQuery } from "../utils/fixtures.js"
import type { DeterministicClock, MemoryAdapter, ScenarioDefinition, ScenarioResult } from "../types.js"

const K = 5
// All 3 cluster members must appear in top-5.
const THRESHOLDS = { recallAtK: 1.0, precisionAtK: 0.6 }

const run = async (adapter: MemoryAdapter, clock: DeterministicClock): Promise<ScenarioResult> => {
	let t = clock.now()

	// Ingest the three cluster entities.
	await adapter.ingest(createEvent({ id: "auth-flow", type: "decision", content: "OAuth2 flow: redirect to /authorize, exchange code for token.", tags: ["auth", "oauth", "flow"], timestamp: t }))
	await adapter.ingest(createEvent({ id: "retry-logic", type: "pattern", content: "Retry token refresh up to 3 times with exponential backoff.", tags: ["auth", "retry", "token"], timestamp: t + 1 }))
	await adapter.ingest(createEvent({ id: "timeout-handling", type: "error", content: "If token refresh times out after 5s, force re-login.", tags: ["auth", "timeout", "session"], timestamp: t + 2 }))

	// Ingest unrelated entities to pad the store.
	await adapter.ingest(createEvent({ id: "ci-config", type: "pattern", content: "Run tests on every PR using GitHub Actions.", tags: ["ci", "testing"], timestamp: t + 3 }))
	await adapter.ingest(createEvent({ id: "deploy-strategy", type: "decision", content: "Blue-green deployment via Kubernetes rolling updates.", tags: ["deploy", "k8s"], timestamp: t + 4 }))

	// Simulate 3 sessions where A, B, C are always retrieved together.
	for (let session = 0; session < 3; session++) {
		clock.advance(60_000)
		t = clock.now()

		await adapter.recordUsage("auth-flow", "influenced_decision")
		await adapter.recordUsage("retry-logic", "used")
		await adapter.recordUsage("timeout-handling", "used")
	}

	// Query that directly matches only auth-flow.
	const query = createQuery({ text: "How does the OAuth2 authentication flow work?", tags: ["auth", "oauth"] })
	const results = await adapter.retrieve(query, K)
	const retrieved = results.map((r) => r.id)
	const clusterIds = ["auth-flow", "retry-logic", "timeout-handling"]
	const relevantSet = new Set(clusterIds)
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

export const coAccessClusterScenario: ScenarioDefinition = {
	name: "Co-access cluster",
	description: "Three entities always used together; querying one must surface all three in top K.",
	run,
}

/**
 * Scenario 7: Cross-context
 *
 * An entity tagged ["auth", "security"] is relevant when the agent is working
 * on authentication but irrelevant when working on UI styling. Two queries are
 * issued -- one on-topic, one off-topic. The entity must rank in top-3 for the
 * auth query and outside top-5 for the styling query.
 *
 * Tests: context-sensitive retrieval -- the same entity should surface only
 * when contextually appropriate.
 */

import { computeMRR, computePrecisionAtK, computeRecallAtK, computeNoiseRatio } from "../metrics.js"
import { checkAllMetrics } from "../utils/assertions.js"
import { createEvent, createQuery } from "../utils/fixtures.js"
import type { DeterministicClock, MemoryAdapter, ScenarioDefinition, ScenarioResult } from "../types.js"

const K = 5
const THRESHOLDS = { mrr: 1.0 }

const run = async (adapter: MemoryAdapter, clock: DeterministicClock): Promise<ScenarioResult> => {
	const t = clock.now()

	// The entity we care about -- highly relevant to auth, irrelevant to styling.
	const targetId = "session-expiry-policy"
	await adapter.ingest(
		createEvent({
			id: targetId,
			type: "decision",
			content: "Sessions expire after 30 minutes of inactivity. Refresh tokens are valid for 7 days.",
			tags: ["auth", "security", "session"],
			timestamp: t,
		}),
	)

	// Add styling-domain entities that should dominate the off-topic query.
	for (let i = 0; i < 5; i++) {
		await adapter.ingest(
			createEvent({
				id: `style-rule-${i}`,
				type: "preference",
				content: `UI guideline ${i}: use Tailwind utility classes, avoid inline styles.`,
				tags: ["ui", "styling", "tailwind"],
				timestamp: t + 1 + i,
			}),
		)
	}

	// Add more auth entities to confirm the target is retrieved in the right context.
	await adapter.ingest(createEvent({ id: "mfa-requirement", type: "decision", content: "MFA required for all accounts with admin privileges.", tags: ["auth", "mfa", "security"], timestamp: t + 6 }))
	await adapter.ingest(createEvent({ id: "password-policy", type: "decision", content: "Passwords must be at least 12 characters with mixed case and symbols.", tags: ["auth", "password", "security"], timestamp: t + 7 }))

	// --- Query 1: on-topic (auth) ---
	const authQuery = createQuery({ text: "How long before a user session expires?", tags: ["auth", "session"] })
	const authResults = await adapter.retrieve(authQuery, K)
	const authRetrieved = authResults.map((r) => r.id)
	const authRelevant = new Set([targetId])

	const authMrr = computeMRR(authRetrieved, authRelevant)
	const authRank = authRetrieved.indexOf(targetId) // 0-based; -1 = not found

	// --- Query 2: off-topic (styling) ---
	const styleQuery = createQuery({ text: "What CSS conventions should I use for the UI components?", tags: ["ui", "styling"] })
	const styleResults = await adapter.retrieve(styleQuery, K)
	const styleRetrieved = styleResults.map((r) => r.id)

	// Target must NOT appear in top-5 of the styling query.
	const targetInStyleTop5 = styleRetrieved.includes(targetId)

	const everRetrieved = new Set([...authRetrieved, ...styleRetrieved])
	const allEntities = await adapter.listEntities()

	const metrics = {
		precisionAtK: computePrecisionAtK(authRetrieved, authRelevant, K),
		recallAtK: computeRecallAtK(authRetrieved, authRelevant, K),
		mrr: authMrr,
		noiseRatio: computeNoiseRatio(allEntities, everRetrieved),
		gcEffectiveness: -1,
		salienceDrift: -1,
	}

	const failures = checkAllMetrics(metrics, THRESHOLDS)

	if (authRank > 2) {
		failures.push(`target ranked ${authRank + 1} in auth query (expected top-3)`)
	}
	if (targetInStyleTop5) {
		failures.push("target appeared in top-5 of off-topic styling query (should be absent)")
	}

	return { metrics, passed: failures.length === 0, details: failures.join("; ") }
}

export const crossContextScenario: ScenarioDefinition = {
	name: "Cross-context",
	description: "Entity relevant to auth must rank top-3 for auth query but not appear in styling query top-5.",
	run,
}

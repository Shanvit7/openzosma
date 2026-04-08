/**
 * Integration tests: run all 7 built-in scenarios against the mock adapter.
 *
 * The mock adapter uses simple tag-overlap scoring. Not all scenarios can pass
 * at the highest possible threshold with a naive engine -- but all 7 must at
 * minimum complete without errors, produce valid metrics, and the scenarios
 * that the mock adapter is capable of passing must pass.
 *
 * Scenarios that require reinforcement or co-access (which the mock does not
 * implement) are tested for structural correctness only (valid metrics, no throws).
 */

import { describe, expect, it } from "vitest"
import { createClock } from "../utils/time.js"
import { createMockAdapter } from "./mock-adapter.js"
import { coldStartScenario } from "../scenarios/cold-start.js"
import { repeatedPatternScenario } from "../scenarios/repeated-pattern.js"
import { signalDilutionScenario } from "../scenarios/signal-dilution.js"
import { staleMemoryScenario } from "../scenarios/stale-memory.js"
import { conflictingUpdatesScenario } from "../scenarios/conflicting-updates.js"
import { coAccessClusterScenario } from "../scenarios/co-access-cluster.js"
import { crossContextScenario } from "../scenarios/cross-context.js"
import type { ScenarioResult } from "../types.js"
import { tmpdir } from "node:os"
import { mkdtemp, rm } from "node:fs/promises"
import { join } from "node:path"

const runScenario = async (
	scenario: { run: (adapter: ReturnType<typeof createMockAdapter>, clock: ReturnType<typeof createClock>) => Promise<ScenarioResult> },
): Promise<ScenarioResult> => {
	const adapter = createMockAdapter()
	const clock = createClock()
	const workDir = await mkdtemp(join(tmpdir(), "zosma-mem-test-"))
	try {
		await adapter.setup({ workDir, clock })
		return await scenario.run(adapter, clock)
	} finally {
		await adapter.teardown()
		await rm(workDir, { recursive: true, force: true })
	}
}

const assertValidMetrics = (result: ScenarioResult) => {
	const { metrics } = result
	expect(metrics.precisionAtK).toBeGreaterThanOrEqual(0)
	expect(metrics.precisionAtK).toBeLessThanOrEqual(1)
	expect(metrics.recallAtK).toBeGreaterThanOrEqual(0)
	expect(metrics.recallAtK).toBeLessThanOrEqual(1)
	expect(metrics.mrr).toBeGreaterThanOrEqual(0)
	expect(metrics.mrr).toBeLessThanOrEqual(1)
	expect(metrics.noiseRatio).toBeGreaterThanOrEqual(0)
	expect(metrics.noiseRatio).toBeLessThanOrEqual(1)
	// gcEffectiveness and salienceDrift may be -1 (N/A)
	expect(metrics.gcEffectiveness).toBeGreaterThanOrEqual(-1)
	expect(metrics.salienceDrift).toBeGreaterThanOrEqual(-1)
}

describe("Scenario 1: Cold start", () => {
	it("produces valid metrics and passes with mock adapter", async () => {
		const result = await runScenario(coldStartScenario)
		assertValidMetrics(result)
		// Mock adapter tag scoring is sufficient for cold-start (clear tag match).
		expect(result.passed).toBe(true)
	})
})

describe("Scenario 2: Repeated pattern", () => {
	it("produces valid metrics (mock does not reinforce, pass is not required)", async () => {
		const result = await runScenario(repeatedPatternScenario)
		assertValidMetrics(result)
		// The recurring entity has the most matching tags so it should still rank first.
		expect(result.metrics.mrr).toBeGreaterThan(0)
	})
})

describe("Scenario 3: Signal dilution", () => {
	it("produces valid metrics and passes with mock adapter", async () => {
		const result = await runScenario(signalDilutionScenario)
		assertValidMetrics(result)
		// Mock uses tag overlap -- high-value events have exact tag matches.
		expect(result.passed).toBe(true)
	})
})

describe("Scenario 4: Stale memory", () => {
	it("produces valid metrics and the fresh entity ranks first", async () => {
		const result = await runScenario(staleMemoryScenario)
		assertValidMetrics(result)
		// Mock GC removes entities older than 7 days; fresh entity survives.
		expect(result.metrics.mrr).toBe(1)
	})
})

describe("Scenario 5: Conflicting updates", () => {
	it("produces valid metrics with most recent content surfaced", async () => {
		const result = await runScenario(conflictingUpdatesScenario)
		assertValidMetrics(result)
		// Mock last-write-wins: entity is replaced on re-ingest, latest content wins.
		expect(result.metrics.mrr).toBe(1)
	})
})

describe("Scenario 6: Co-access cluster", () => {
	it("produces valid metrics (co-access boost not implemented in mock, partial pass)", async () => {
		const result = await runScenario(coAccessClusterScenario)
		assertValidMetrics(result)
		// auth-flow has direct tag overlap and will rank 1st.
		// retry-logic and timeout-handling share some auth tags so may appear.
		expect(result.metrics.mrr).toBe(1)
	})
})

describe("Scenario 7: Cross-context", () => {
	it("produces valid metrics", async () => {
		const result = await runScenario(crossContextScenario)
		assertValidMetrics(result)
		// Mock adapter ranks by tag overlap, so the auth entity should rank high
		// for auth query and low for styling query.
		expect(result.metrics.mrr).toBeGreaterThan(0)
	})
})

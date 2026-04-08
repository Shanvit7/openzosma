/**
 * Scenario runner for zosma-mem/evals.
 *
 * Orchestrates the full lifecycle for each scenario:
 *   1. Create an isolated temp directory.
 *   2. Instantiate a deterministic clock.
 *   3. Call adapter.setup().
 *   4. Execute the scenario.
 *   5. Call adapter.teardown() (always, even on failure).
 *   6. Remove the temp directory.
 *   7. Aggregate results into an EvalReport.
 */

import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createClock } from "./utils/time.js"
import { builtInScenarios } from "./scenarios/index.js"
import type { EvalReport, RunnerOpts, ScenarioResult } from "./types.js"

const DEFAULT_K = 5
const DEFAULT_CONCURRENCY = 1

/**
 * Run the eval suite against the provided adapter.
 *
 * @param opts - Runner options. Only `adapter` is required.
 * @returns A structured EvalReport with per-scenario metrics and a summary.
 */
export const runEvals = async (opts: RunnerOpts): Promise<EvalReport> => {
	const { adapter, k = DEFAULT_K, thresholds = {}, concurrency = DEFAULT_CONCURRENCY } = opts
	const scenarios = opts.scenarios ?? builtInScenarios

	// Run with controlled concurrency.
	const results: Array<{ scenario: string; metrics: ScenarioResult["metrics"]; passed: boolean; details: string }> = []
	const queue = [...scenarios]

	const runNext = async (): Promise<void> => {
		const scenario = queue.shift()
		if (!scenario) return

		opts.onScenarioStart?.(scenario.name)

		let result: ScenarioResult
		const workDir = await mkdtemp(join(tmpdir(), `zosma-mem-eval-${scenario.name.replace(/\s+/g, "-")}-`))
		const clock = createClock()

		try {
			await adapter.setup({ workDir, clock })
			result = await scenario.run(adapter, clock)
		} catch (err) {
			result = {
				metrics: {
					precisionAtK: 0,
					recallAtK: 0,
					mrr: 0,
					noiseRatio: 0,
					gcEffectiveness: -1,
					salienceDrift: -1,
				},
				passed: false,
				details: err instanceof Error ? err.message : String(err),
			}
		} finally {
			try {
				await adapter.teardown()
			} catch {
				// teardown failures are non-fatal -- the scenario result stands
			}
			await rm(workDir, { recursive: true, force: true })
		}

		// Apply runner-level threshold overrides on top of scenario defaults.
		if (Object.keys(thresholds).length > 0 && result.passed) {
			const { checkAllMetrics } = await import("./utils/assertions.js")
			const failures = checkAllMetrics(result.metrics, thresholds)
			if (failures.length > 0) {
				result = { ...result, passed: false, details: failures.join("; ") }
			}
		}

		// Attach K to metrics context (not stored on the type, used by scenarios internally).
		void k // k is passed to scenarios via RunnerOpts; they reference it through the closure

		results.push({
			scenario: scenario.name,
			metrics: result.metrics,
			passed: result.passed,
			details: result.details,
		})

		opts.onScenarioEnd?.(scenario.name, result)
	}

	// Build a pool of `concurrency` runners.
	const workers = Array.from({ length: Math.max(1, concurrency) }, () => {
		const drain = async (): Promise<void> => {
			while (queue.length > 0) {
				await runNext()
			}
		}
		return drain()
	})
	await Promise.all(workers)

	const passed = results.filter((r) => r.passed).length
	const failed = results.length - passed

	const avgPrecision =
		results.length > 0 ? results.reduce((s, r) => s + r.metrics.precisionAtK, 0) / results.length : 0
	const avgRecall =
		results.length > 0 ? results.reduce((s, r) => s + r.metrics.recallAtK, 0) / results.length : 0
	const avgMrr =
		results.length > 0 ? results.reduce((s, r) => s + r.metrics.mrr, 0) / results.length : 0

	return {
		timestamp: Date.now(),
		results,
		summary: {
			total: results.length,
			passed,
			failed,
			avgPrecision,
			avgRecall,
			avgMrr,
		},
	}
}

import { describe, expect, it, vi } from "vitest"
import { runEvals } from "../runner.js"
import type { ScenarioDefinition } from "../types.js"
import { createMockAdapter } from "./mock-adapter.js"

const makePassingScenario = (name: string): ScenarioDefinition => ({
	name,
	description: `Always-passing scenario: ${name}`,
	run: async (_adapter, _clock) => ({
		metrics: { precisionAtK: 1, recallAtK: 1, mrr: 1, noiseRatio: 0, gcEffectiveness: -1, salienceDrift: -1 },
		passed: true,
		details: "",
	}),
})

const makeFailingScenario = (name: string): ScenarioDefinition => ({
	name,
	description: `Always-failing scenario: ${name}`,
	run: async (_adapter, _clock) => ({
		metrics: { precisionAtK: 0, recallAtK: 0, mrr: 0, noiseRatio: 1, gcEffectiveness: -1, salienceDrift: -1 },
		passed: false,
		details: "always fails",
	}),
})

describe("runEvals", () => {
	it("returns a report with the correct scenario count", async () => {
		const adapter = createMockAdapter()
		const report = await runEvals({
			adapter,
			scenarios: [makePassingScenario("A"), makePassingScenario("B")],
		})
		expect(report.summary.total).toBe(2)
	})

	it("counts passed scenarios correctly", async () => {
		const adapter = createMockAdapter()
		const report = await runEvals({
			adapter,
			scenarios: [makePassingScenario("A"), makeFailingScenario("B"), makePassingScenario("C")],
		})
		expect(report.summary.passed).toBe(2)
		expect(report.summary.failed).toBe(1)
	})

	it("calls onScenarioStart and onScenarioEnd for each scenario", async () => {
		const adapter = createMockAdapter()
		const started: string[] = []
		const ended: string[] = []

		await runEvals({
			adapter,
			scenarios: [makePassingScenario("X"), makePassingScenario("Y")],
			onScenarioStart: (name) => started.push(name),
			onScenarioEnd: (name) => ended.push(name),
		})

		expect(started).toEqual(["X", "Y"])
		expect(ended).toEqual(["X", "Y"])
	})

	it("calls teardown even when the scenario throws", async () => {
		const adapter = createMockAdapter()
		const teardownSpy = vi.spyOn(adapter, "teardown")

		const throwingScenario: ScenarioDefinition = {
			name: "Thrower",
			description: "Throws during run",
			run: async () => {
				throw new Error("intentional scenario error")
			},
		}

		const report = await runEvals({ adapter, scenarios: [throwingScenario] })

		expect(teardownSpy).toHaveBeenCalledTimes(1)
		expect(report.summary.failed).toBe(1)
		expect(report.results[0].details).toContain("intentional scenario error")
	})

	it("computes correct averages in summary", async () => {
		const adapter = createMockAdapter()
		const report = await runEvals({
			adapter,
			scenarios: [makePassingScenario("A"), makeFailingScenario("B")],
		})
		expect(report.summary.avgPrecision).toBe(0.5)
		expect(report.summary.avgMrr).toBe(0.5)
	})

	it("includes a unix timestamp in the report", async () => {
		const adapter = createMockAdapter()
		const report = await runEvals({ adapter, scenarios: [makePassingScenario("A")] })
		expect(report.timestamp).toBeGreaterThan(0)
	})
})

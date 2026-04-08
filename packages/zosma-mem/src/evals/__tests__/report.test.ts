import { describe, expect, it } from "vitest"
import { renderMarkdownReport } from "../report.js"
import type { EvalReport } from "../types.js"

const makeReport = (overrides?: Partial<EvalReport>): EvalReport => ({
	timestamp: new Date("2026-04-07T12:00:00.000Z").getTime(),
	results: [
		{
			scenario: "Cold start",
			metrics: { precisionAtK: 1, recallAtK: 1, mrr: 1, noiseRatio: 0.1, gcEffectiveness: -1, salienceDrift: -1 },
			passed: true,
			details: "",
		},
		{
			scenario: "Signal dilution",
			metrics: { precisionAtK: 0.4, recallAtK: 0.8, mrr: 0.5, noiseRatio: 0.9, gcEffectiveness: -1, salienceDrift: -1 },
			passed: false,
			details: "precisionAtK: 0.400 < threshold 0.600",
		},
	],
	summary: { total: 2, passed: 1, failed: 1, avgPrecision: 0.7, avgRecall: 0.9, avgMrr: 0.75 },
	...overrides,
})

describe("renderMarkdownReport", () => {
	it("includes a heading with the timestamp", () => {
		const output = renderMarkdownReport(makeReport())
		expect(output).toContain("## zosma-mem Eval Report -- 2026-04-07T12:00:00.000Z")
	})

	it("includes all scenario names", () => {
		const output = renderMarkdownReport(makeReport())
		expect(output).toContain("Cold start")
		expect(output).toContain("Signal dilution")
	})

	it("marks passing scenarios with 'yes'", () => {
		const output = renderMarkdownReport(makeReport())
		expect(output).toContain("yes")
	})

	it("marks failing scenarios with 'NO'", () => {
		const output = renderMarkdownReport(makeReport())
		expect(output).toContain("NO")
	})

	it("includes the summary line", () => {
		const output = renderMarkdownReport(makeReport())
		expect(output).toContain("Summary: 1/2 passed")
	})

	it("includes a failures section when there are failures", () => {
		const output = renderMarkdownReport(makeReport())
		expect(output).toContain("### Failures")
		expect(output).toContain("precisionAtK: 0.400 < threshold 0.600")
	})

	it("does not include failures section when all pass", () => {
		const allPass = makeReport({
			results: [
				{
					scenario: "Cold start",
					metrics: { precisionAtK: 1, recallAtK: 1, mrr: 1, noiseRatio: 0, gcEffectiveness: -1, salienceDrift: -1 },
					passed: true,
					details: "",
				},
			],
			summary: { total: 1, passed: 1, failed: 0, avgPrecision: 1, avgRecall: 1, avgMrr: 1 },
		})
		const output = renderMarkdownReport(allPass)
		expect(output).not.toContain("### Failures")
	})

	it("renders N/A values as ' -- '", () => {
		const output = renderMarkdownReport(makeReport())
		expect(output).toContain(" -- ")
	})
})

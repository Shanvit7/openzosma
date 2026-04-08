/**
 * Markdown report renderer for zosma-mem/evals.
 *
 * Produces a CI-friendly markdown table from an EvalReport.
 * No external dependencies -- pure string manipulation.
 */

import type { EvalReport } from "./types.js"

const fmt = (n: number): string => {
	if (n === -1) return " -- "
	return n.toFixed(3)
}

const pad = (s: string, width: number): string => s.padEnd(width)

/**
 * Render an EvalReport as a markdown string suitable for CI logs, PR comments,
 * or writing to a file with --out.
 */
export const renderMarkdownReport = (report: EvalReport): string => {
	const date = new Date(report.timestamp).toISOString()

	const headers = ["Scenario", "P@K", "R@K", "MRR", "Noise", "GC Eff", "Drift", "Pass"]
	const rows = report.results.map((r) => [
		r.scenario,
		fmt(r.metrics.precisionAtK),
		fmt(r.metrics.recallAtK),
		fmt(r.metrics.mrr),
		fmt(r.metrics.noiseRatio),
		fmt(r.metrics.gcEffectiveness),
		fmt(r.metrics.salienceDrift),
		r.passed ? "yes" : "NO",
	])

	// Compute column widths.
	const colWidths = headers.map((h, i) =>
		Math.max(h.length, ...rows.map((r) => r[i].length)),
	)

	const header = `| ${headers.map((h, i) => pad(h, colWidths[i])).join(" | ")} |`
	const divider = `| ${colWidths.map((w) => "-".repeat(w)).join(" | ")} |`
	const body = rows
		.map((row) => `| ${row.map((cell, i) => pad(cell, colWidths[i])).join(" | ")} |`)
		.join("\n")

	const failureDetails = report.results
		.filter((r) => !r.passed && r.details)
		.map((r) => `**${r.scenario}**: ${r.details}`)
		.join("\n")

	const lines: string[] = [
		`## zosma-mem Eval Report -- ${date}`,
		"",
		header,
		divider,
		body,
		"",
		`Summary: ${report.summary.passed}/${report.summary.total} passed.` +
			` Avg P@K: ${report.summary.avgPrecision.toFixed(3)},` +
			` Avg R@K: ${report.summary.avgRecall.toFixed(3)},` +
			` Avg MRR: ${report.summary.avgMrr.toFixed(3)}`,
	]

	if (failureDetails) {
		lines.push("", "### Failures", "", failureDetails)
	}

	return lines.join("\n")
}

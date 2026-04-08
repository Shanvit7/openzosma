#!/usr/bin/env node
/**
 * zosma-mem-eval CLI entry point.
 *
 * Usage:
 *   zosma-mem-eval --adapter ./my-adapter.js [options]
 *
 * The adapter module must export a default or named `adapter` that satisfies
 * the MemoryAdapter interface.
 */

import { writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { render } from "ink"
import { Command } from "commander"
import chalk from "chalk"
import { createElement } from "react"
import { builtInScenarios } from "../scenarios/index.js"
import { renderMarkdownReport } from "../report.js"
import { runEvals } from "../runner.js"
import type { EvalReport, MemoryAdapter } from "../types.js"
import { App } from "./components/App.js"

const program = new Command()

program
	.name("zosma-mem-eval")
	.description("Run the zosma-mem evaluation suite against a memory engine adapter.")
	.requiredOption("--adapter <path>", "Path to a JS/TS module exporting a MemoryAdapter")
	.option("--scenarios <names>", "Comma-separated scenario names to run (default: all)")
	.option("--k <number>", "Top-K for precision/recall (default: 5)", "5")
	.option("--ci", "Disable interactive Ink UI, output plain markdown to stdout")
	.option("--json", "Output raw JSON report to stdout")
	.option("--out <path>", "Write markdown report to a file")
	.parse(process.argv)

const opts = program.opts<{
	adapter: string
	scenarios?: string
	k: string
	ci?: boolean
	json?: boolean
	out?: string
}>()

const loadAdapter = async (adapterPath: string): Promise<MemoryAdapter> => {
	const absolutePath = resolve(adapterPath)
	const mod = await import(absolutePath) as Record<string, unknown>
	const adapter = (mod.default ?? mod.adapter) as MemoryAdapter | undefined

	if (!adapter || typeof adapter.setup !== "function") {
		console.error(
			chalk.red(
				`Error: adapter module at "${adapterPath}" must export a default or named "adapter" that satisfies the MemoryAdapter interface.`,
			),
		)
		process.exit(1)
	}

	return adapter
}

const filterScenarios = (names?: string) => {
	if (!names) return builtInScenarios
	const requested = names.split(",").map((n) => n.trim().toLowerCase())
	return builtInScenarios.filter((s) => requested.includes(s.name.toLowerCase()))
}

const writeReport = async (report: EvalReport, outPath: string) => {
	const markdown = renderMarkdownReport(report)
	await writeFile(outPath, markdown, "utf8")
	console.log(chalk.green(`Report written to ${outPath}`))
}

const main = async () => {
	const adapter = await loadAdapter(opts.adapter)
	const scenarios = filterScenarios(opts.scenarios)
	const k = Number.parseInt(opts.k, 10)
	const isCi = Boolean(opts.ci) || !process.stdout.isTTY

	if (isCi || opts.json) {
		// Plain mode: no Ink, just run and print.
		const report = await runEvals({
			adapter,
			scenarios,
			k,
			onScenarioStart: (name) => {
				if (!opts.json) process.stdout.write(`  running: ${name}\n`)
			},
			onScenarioEnd: (name, result) => {
				if (!opts.json) {
					const icon = result.passed ? chalk.green("✓") : chalk.red("✗")
					process.stdout.write(`  ${icon} ${name}\n`)
				}
			},
		})

		if (opts.json) {
			process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
		} else {
			process.stdout.write(`\n${renderMarkdownReport(report)}\n`)
		}

		if (opts.out) await writeReport(report, opts.out)

		process.exit(report.summary.failed > 0 ? 1 : 0)
	} else {
		// Interactive Ink mode.
		let finalReport: EvalReport | null = null

		const { waitUntilExit } = render(
			createElement(App, {
				adapter,
				scenarios,
				k,
				onComplete: (r: EvalReport) => {
					finalReport = r
				},
			}),
		)

		await waitUntilExit()

		if (opts.out && finalReport) await writeReport(finalReport, opts.out)

		process.exit(finalReport && (finalReport as EvalReport).summary.failed > 0 ? 1 : 0)
	}
}

main().catch((err) => {
	console.error(chalk.red("Fatal:"), err instanceof Error ? err.message : err)
	process.exit(1)
})

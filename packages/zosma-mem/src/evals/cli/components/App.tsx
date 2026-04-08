import { Box, Text, useApp } from "ink"
import type React from "react"
import { useEffect, useRef, useState } from "react"
import { runEvals } from "../../runner.js"
import type { EvalReport, MemoryAdapter, ScenarioDefinition, ScenarioResult } from "../../types.js"
import { ErrorDisplay } from "./ErrorDisplay.js"
import { ScenarioRow } from "./ScenarioRow.js"
import { SummaryTable } from "./SummaryTable.js"

type ScenarioStatus = "pending" | "running" | "done"

interface ScenarioState {
	name: string
	status: ScenarioStatus
	result?: ScenarioResult
}

interface Props {
	adapter: MemoryAdapter
	scenarios?: ScenarioDefinition[]
	k?: number
	onComplete: (report: EvalReport) => void
}

export const App: React.FC<Props> = ({ adapter, scenarios, k, onComplete }) => {
	const { exit } = useApp()
	const [states, setStates] = useState<ScenarioState[]>([])
	const [report, setReport] = useState<EvalReport | null>(null)
	const [error, setError] = useState<string | null>(null)

	// Capture props in a ref so the effect dependency array stays stable.
	// The CLI renders once and never re-renders with different props.
	const optsRef = useRef({ adapter, scenarios, k, onComplete, exit })

	useEffect(() => {
		const { adapter: a, scenarios: sc, k: topK, onComplete: done, exit: quit } = optsRef.current

		const run = async () => {
			try {
				const result = await runEvals({
					adapter: a,
					scenarios: sc,
					k: topK,
					onScenarioStart: (name) => {
						setStates((prev) => {
							const next = [...prev]
							const idx = next.findIndex((s) => s.name === name)
							if (idx >= 0) {
								next[idx] = { ...next[idx], status: "running" }
							} else {
								next.push({ name, status: "running" })
							}
							return next
						})
					},
					onScenarioEnd: (name, scenarioResult) => {
						setStates((prev) => {
							const next = [...prev]
							const idx = next.findIndex((s) => s.name === name)
							if (idx >= 0) {
								next[idx] = { name, status: "done", result: scenarioResult }
							}
							return next
						})
					},
				})

				setReport(result)
				done(result)
			} catch (err) {
				setError(err instanceof Error ? err.message : String(err))
			} finally {
				quit()
			}
		}

		// Initialise state with pending entries before running.
		const scenarioList = sc ?? []
		setStates(scenarioList.map((s) => ({ name: s.name, status: "pending" })))
		run()
	}, [])

	if (error) {
		return <ErrorDisplay message={error} />
	}

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold>zosma-mem eval</Text>
			<Box flexDirection="column" marginTop={1}>
				{states.map((s) => (
					<ScenarioRow key={s.name} name={s.name} status={s.status} result={s.result} />
				))}
			</Box>
			{report ? <SummaryTable report={report} /> : null}
		</Box>
	)
}

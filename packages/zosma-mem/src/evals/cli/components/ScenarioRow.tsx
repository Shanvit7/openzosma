import { Text } from "ink"
import Spinner from "ink-spinner"
import type React from "react"
import type { ScenarioResult } from "../../types.js"

interface Props {
	name: string
	status: "pending" | "running" | "done"
	result?: ScenarioResult
}

export const ScenarioRow: React.FC<Props> = ({ name, status, result }) => {
	if (status === "pending") {
		return (
			<Text>
				<Text color="gray">{"  "}</Text>
				<Text dimColor>{name}</Text>
			</Text>
		)
	}

	if (status === "running") {
		return (
			<Text>
				<Text color="cyan">
					<Spinner type="dots" />
				</Text>
				<Text>{" "}</Text>
				<Text>{name}</Text>
			</Text>
		)
	}

	const icon = result?.passed ? "✓" : "✗"
	const color = result?.passed ? "green" : "red"
	const p = result?.metrics.precisionAtK.toFixed(3) ?? "-"
	const r = result?.metrics.recallAtK.toFixed(3) ?? "-"
	const m = result?.metrics.mrr.toFixed(3) ?? "-"

	return (
		<Text>
			<Text color={color}>{icon}</Text>
			<Text>{" "}</Text>
			<Text>{name.padEnd(30)}</Text>
			<Text dimColor>{`P@K:${p}  R@K:${r}  MRR:${m}`}</Text>
			{!result?.passed && result?.details ? (
				<Text color="red">{`  -- ${result.details}`}</Text>
			) : null}
		</Text>
	)
}

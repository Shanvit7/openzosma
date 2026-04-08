import { Box, Text } from "ink"
import type React from "react"
import type { EvalReport } from "../../types.js"

interface Props {
	report: EvalReport
}

export const SummaryTable: React.FC<Props> = ({ report }) => {
	const { summary } = report
	const allPassed = summary.failed === 0

	return (
		<Box flexDirection="column" marginTop={1}>
			<Text bold>Summary</Text>
			<Text>
				{"  Scenarios: "}
				<Text color={allPassed ? "green" : "red"} bold>
					{`${summary.passed}/${summary.total} passed`}
				</Text>
			</Text>
			<Text>
				{"  Avg P@K: "}
				<Text bold>{summary.avgPrecision.toFixed(3)}</Text>
				{"  Avg R@K: "}
				<Text bold>{summary.avgRecall.toFixed(3)}</Text>
				{"  Avg MRR: "}
				<Text bold>{summary.avgMrr.toFixed(3)}</Text>
			</Text>
		</Box>
	)
}

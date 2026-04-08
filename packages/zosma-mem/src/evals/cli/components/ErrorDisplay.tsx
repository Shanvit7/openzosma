import { Box, Text } from "ink"
import type React from "react"

interface Props {
	message: string
}

export const ErrorDisplay: React.FC<Props> = ({ message }) => (
	<Box flexDirection="column" marginTop={1} borderStyle="round" borderColor="red" paddingX={1}>
		<Text color="red" bold>
			Error
		</Text>
		<Text>{message}</Text>
	</Box>
)

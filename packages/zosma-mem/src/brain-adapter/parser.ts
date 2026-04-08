/**
 * Parse commits.md into structured commit records.
 *
 * Expected format (one or more entries):
 *
 * ## <ref>
 * <optional blank line>
 * <body text>
 * tags: tag1, tag2
 */

export interface CommitRecord {
	ref: string
	body: string
	tags: string[]
}

/**
 * Parse a commits.md markdown file into an array of CommitRecord objects.
 */
export const parseCommitsMarkdown = (markdown: string): CommitRecord[] => {
	const commits: CommitRecord[] = []
	const sections = markdown.split(/^## /m).filter((s) => s.trim().length > 0)

	for (const section of sections) {
		const lines = section.split("\n")
		const ref = lines[0].trim()
		if (!ref) continue

		const bodyLines: string[] = []
		let tags: string[] = []

		for (let i = 1; i < lines.length; i++) {
			const line = lines[i]
			const tagMatch = /^tags:\s*(.+)$/i.exec(line)
			if (tagMatch) {
				tags = tagMatch[1]
					.split(",")
					.map((t) => t.trim())
					.filter(Boolean)
			} else {
				bodyLines.push(line)
			}
		}

		const body = bodyLines.join("\n").trim()
		commits.push({ ref, body, tags })
	}

	return commits
}

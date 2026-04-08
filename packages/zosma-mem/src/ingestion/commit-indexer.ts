import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { parseCommitsMarkdown } from "../brain-adapter/parser.js"
import type { EntityStore } from "../store/entity-store.js"
import type { MemoryConfig } from "../types.js"
import { ingest } from "./ingest.js"

const INDEXED_FILE = ".indexed"

/**
 * Parse commits.md and ingest new entities. Idempotent.
 * Returns number of new entities ingested.
 */
export const reindex = (
	memoryDir: string,
	store: EntityStore,
	config: Pick<MemoryConfig, "salienceThreshold" | "now">,
): number => {
	const commitsPath = join(memoryDir, "commits.md")
	if (!existsSync(commitsPath)) return 0

	const indexedPath = join(memoryDir, ".salience", INDEXED_FILE)
	const indexed: string[] = existsSync(indexedPath) ? (JSON.parse(readFileSync(indexedPath, "utf-8")) as string[]) : []

	const markdown = readFileSync(commitsPath, "utf-8")
	const commits = parseCommitsMarkdown(markdown)
	const newRefs = commits.filter((c) => !indexed.includes(c.ref))

	let count = 0
	for (const commit of newRefs) {
		const event = {
			id: `main-${commit.ref}`,
			type: "pattern" as const,
			content: commit.body,
			tags: commit.tags,
			metadata: { branch: "main", commitRef: commit.ref },
			timestamp: config.now ? config.now() : Date.now(),
		}
		ingest(event, store, config)
		indexed.push(commit.ref)
		count++
	}

	writeFileSync(indexedPath, JSON.stringify(indexed), "utf-8")
	return count
}

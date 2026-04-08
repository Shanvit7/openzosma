import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { EntityStore } from "../../store/entity-store.js"
import type { MemoryEvent } from "../../types.js"
import { reindex } from "../commit-indexer.js"
import { ingest } from "../ingest.js"

const makeEvent = (overrides: Partial<MemoryEvent> = {}): MemoryEvent => ({
	id: "test-entity",
	type: "pattern",
	content: "Some content",
	tags: ["tag-a"],
	timestamp: Date.now(),
	...overrides,
})

let dir: string
let store: EntityStore

describe("ingest", () => {
	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "ingest-test-"))
		store = new EntityStore(dir)
		store.ensureDir()
	})

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true })
	})

	it("always persists regardless of event type", () => {
		for (const type of ["pattern", "error", "preference", "decision"] as const) {
			const event = makeEvent({ id: `ev-${type}`, type })
			const result = ingest(event, store, {})
			expect(result).toBe(true)
			expect(store.read(`ev-${type}`)).toBeDefined()
		}
	})

	it("upsert: second ingest with same id updates content", () => {
		ingest(makeEvent({ id: "upsert-me", content: "original" }), store, {})
		ingest(makeEvent({ id: "upsert-me", content: "updated" }), store, {})
		const entity = store.read("upsert-me")
		expect(entity?.content).toBe("updated")
	})

	it("preserves existing score on upsert", () => {
		ingest(makeEvent({ id: "score-preserve" }), store, {})
		const first = store.read("score-preserve")!
		// Manually bump reuseCount
		store.write({ ...first, score: { ...first.score, reuseCount: 5 } })
		ingest(makeEvent({ id: "score-preserve", content: "new content" }), store, {})
		const second = store.read("score-preserve")!
		expect(second.score.reuseCount).toBe(5)
	})
})

describe("reindex", () => {
	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "reindex-test-"))
		store = new EntityStore(dir)
		store.ensureDir()
	})

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true })
	})

	it("returns 0 when commits.md does not exist", () => {
		expect(reindex(dir, store, {})).toBe(0)
	})

	it("ingests commits from commits.md", () => {
		const md = "## abc123\nFixed the auth bug.\ntags: auth, fix\n"
		writeFileSync(join(dir, "commits.md"), md, "utf-8")
		const count = reindex(dir, store, {})
		expect(count).toBe(1)
		expect(store.read("main-abc123")).toBeDefined()
	})

	it("is idempotent: second call returns 0 for already-indexed commits", () => {
		const md = "## abc123\nFixed the auth bug.\ntags: auth, fix\n"
		writeFileSync(join(dir, "commits.md"), md, "utf-8")
		reindex(dir, store, {})
		const count = reindex(dir, store, {})
		expect(count).toBe(0)
	})

	it("ingests only new commits on second call", () => {
		writeFileSync(join(dir, "commits.md"), "## ref1\nFirst commit.\ntags: a\n", "utf-8")
		reindex(dir, store, {})
		writeFileSync(
			join(dir, "commits.md"),
			"## ref1\nFirst commit.\ntags: a\n\n## ref2\nSecond commit.\ntags: b\n",
			"utf-8",
		)
		const count = reindex(dir, store, {})
		expect(count).toBe(1)
		expect(store.read("main-ref2")).toBeDefined()
	})
})

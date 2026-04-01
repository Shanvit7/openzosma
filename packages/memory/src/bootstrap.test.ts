import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { bootstrapMemory } from "./bootstrap.js"
import { applyMemoryEnv } from "./config.js"

describe("applyMemoryEnv", () => {
	const saved: Record<string, string | undefined> = {}

	beforeEach(() => {
		for (const key of ["PI_MEMORY_DIR", "PI_MEMORY_QMD_UPDATE", "PI_MEMORY_NO_SEARCH"]) {
			saved[key] = process.env[key]
			delete process.env[key]
		}
	})

	afterEach(() => {
		for (const [key, val] of Object.entries(saved)) {
			if (val === undefined) delete process.env[key]
			else process.env[key] = val
		}
	})

	it("sets PI_MEMORY_DIR to default subdir", () => {
		const dir = applyMemoryEnv({ workspaceDir: "/home/agent" })
		expect(dir).toBe("/home/agent/.pi/agent/memory")
		expect(process.env.PI_MEMORY_DIR).toBe("/home/agent/.pi/agent/memory")
	})

	it("uses explicit memoryDir when provided", () => {
		const dir = applyMemoryEnv({ workspaceDir: "/home/agent", memoryDir: "/custom/mem" })
		expect(dir).toBe("/custom/mem")
		expect(process.env.PI_MEMORY_DIR).toBe("/custom/mem")
	})

	it("sets qmd update mode", () => {
		applyMemoryEnv({ workspaceDir: "/w", qmdUpdateMode: "manual" })
		expect(process.env.PI_MEMORY_QMD_UPDATE).toBe("manual")
	})

	it("does not set qmd update mode when not specified", () => {
		applyMemoryEnv({ workspaceDir: "/w" })
		expect(process.env.PI_MEMORY_QMD_UPDATE).toBeUndefined()
	})

	it("sets PI_MEMORY_NO_SEARCH when disableSearch is true", () => {
		applyMemoryEnv({ workspaceDir: "/w", disableSearch: true })
		expect(process.env.PI_MEMORY_NO_SEARCH).toBe("1")
	})
})

describe("bootstrapMemory", () => {
	beforeEach(() => {
		process.env.PI_MEMORY_DIR = undefined
	})

	afterEach(() => {
		process.env.PI_MEMORY_DIR = undefined
	})

	it("sets memoryDir in result", () => {
		const result = bootstrapMemory({ workspaceDir: "/home/agent" })
		expect(result.memoryDir).toBe("/home/agent/.pi/agent/memory")
	})

	it("sets PI_MEMORY_DIR env var", () => {
		bootstrapMemory({ workspaceDir: "/home/agent" })
		expect(process.env.PI_MEMORY_DIR).toBe("/home/agent/.pi/agent/memory")
	})
})

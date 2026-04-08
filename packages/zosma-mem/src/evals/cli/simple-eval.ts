#!/usr/bin/env node

/**
 * zosma-mem - Zero-config memory evaluation
 *
 * Just run it - it'll find and evaluate your memory system automatically.
 */

import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { builtInScenarios } from "../scenarios/index.js"
import { runEvals } from "../runner.js"
import { renderMarkdownReport } from "../report.js"
import { MemoryAdapter, MemoryEvent, DeterministicClock } from "../types.js"

interface MemoryInfo {
  type: "openzosma" | "file"
  path: string
}

interface StoredMemoryEvent extends MemoryEvent {
  usageCount: number
  lastRetrieved: number
}

const detectMemory = (): MemoryInfo | null => {
  const cwd = process.cwd()

  // Check for OpenZosma memory
  const openzosmaPath = join(cwd, "packages/gateway/workspace/agents/default/memory/MEMORY.md")
  if (existsSync(openzosmaPath)) {
    return { type: "openzosma", path: openzosmaPath }
  }

  // Check for generic memory files
  const memoryFiles = ["MEMORY.md", "memory.md", ".memory.md"]
  for (const file of memoryFiles) {
    const path = join(cwd, file)
    if (existsSync(path)) {
      return { type: "file", path }
    }
  }

  return null
}

const createMemoryAdapter = (memoryInfo: MemoryInfo): MemoryAdapter => {
  const events = new Map<string, StoredMemoryEvent>()
  let clock: DeterministicClock = { now: () => Date.now(), advance: () => {} }

  const loadMemory = () => {
    if (memoryInfo.type === "openzosma") {
      // Parse OpenZosma format: <!-- timestamp [hash] -->\ncontent
      const content = readFileSync(memoryInfo.path, "utf-8")
      const lines = content.split("\n")
      let currentEvent: Partial<MemoryEvent> | null = null

      for (const line of lines) {
        const match = line.match(/^<!-- (\d+) \[([a-f0-9]+)\] -->$/)
        if (match) {
          if (currentEvent && currentEvent.id) {
            events.set(currentEvent.id, { ...currentEvent, usageCount: 0, lastRetrieved: 0 } as StoredMemoryEvent)
          }
          const [, ts, id] = match
          currentEvent = {
            id,
            type: "preference",
            content: "",
            tags: ["user", "memory"],
            timestamp: parseInt(ts)
          }
        } else if (currentEvent && line.trim()) {
          currentEvent.content += line + "\n"
        }
      }
      if (currentEvent && currentEvent.id) {
        events.set(currentEvent.id, { ...currentEvent, usageCount: 0, lastRetrieved: 0 } as StoredMemoryEvent)
      }
    } else {
      // Simple file format
      const content = readFileSync(memoryInfo.path, "utf-8")
      content.split("\n").forEach((line, i) => {
        if (line.trim()) {
          events.set(`entry-${i}`, {
            id: `entry-${i}`,
            type: "note",
            content: line.trim(),
            tags: [],
            timestamp: Date.now() - (i * 1000),
            usageCount: 0,
            lastRetrieved: 0
          })
        }
      })
    }
  }

  return {
    setup: async (opts) => {
      clock = opts.clock
      loadMemory()
    },

    ingest: async (event: MemoryEvent) => {
      events.set(event.id, { ...event, usageCount: 0, lastRetrieved: 0 })
    },

    retrieve: async (query, topK) => {
      const queryWords = new Set(query.text.toLowerCase().split(/\s+/))
      const queryTags = new Set(query.tags || [])

      const scored = Array.from(events.values()).map((stored) => {
        let score = 0

        // Tag matching
        const tagMatches = stored.tags.filter(tag => queryTags.has(tag.toLowerCase())).length
        score += tagMatches * 2

        // Content matching
        const contentWords = new Set(stored.content.toLowerCase().split(/\s+/))
        const wordMatches = Array.from(queryWords).filter(word => contentWords.has(word)).length
        score += wordMatches

        // Recency boost
        const ageHours = (clock.now() - stored.timestamp) / (1000 * 60 * 60)
        score += Math.max(0, 1 - ageHours / 24) * 0.5

        // Usage boost
        score += stored.usageCount * 0.1

        return {
          id: stored.id,
          content: stored.content.trim(),
          score: Math.max(0, score),
          tags: stored.tags
        }
      })

      scored.sort((a, b) => b.score - a.score)
      const top = scored.slice(0, topK)

      // Mark as retrieved
      for (const item of top) {
        const stored = events.get(item.id)
        if (stored) stored.lastRetrieved = clock.now()
      }

      return top
    },

    recordUsage: async (entityId: string, signal) => {
      const stored = events.get(entityId)
      if (stored && signal === "used") {
        stored.usageCount++
      }
    },

    gc: async () => ({ removedCount: 0, archivedCount: 0, consolidatedCount: 0 }),

    advanceTime: async (ms: number) => {
      clock.advance(ms)
    },

    listEntities: async () => Array.from(events.keys()),

    teardown: async () => {
      events.clear()
    }
  }
}

const main = async (): Promise<void> => {
  const memory = detectMemory()

  if (!memory) {
    console.log("❌ No memory system found!")
    console.log("")
    console.log("To use zosma-mem, create one of:")
    console.log("• MEMORY.md (generic format)")
    console.log("• packages/gateway/workspace/agents/default/memory/MEMORY.md (OpenZosma)")
    console.log("")
    console.log("Run from your project root.")
    process.exit(1)
  }

  console.log(`✅ Found ${memory.type} memory at ${memory.path}`)

  const adapter = createMemoryAdapter(memory)
  const report = await runEvals({ adapter, scenarios: builtInScenarios, k: 5 })

  console.log("")
  console.log(renderMarkdownReport(report))

  if (report.summary.passed === report.summary.total) {
    console.log("🎉 All tests passed!")
  } else {
    console.log(`❌ ${report.summary.failed} tests failed`)
  }
}

main().catch(console.error)
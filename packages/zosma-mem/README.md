# @openzosma/zosma-mem

**Memory engine with bridge for agent integration**

A file-based memory system with salience scoring, tag-based retrieval, and reinforcement learning. Provides cross-conversation memory persistence for AI agents, with a clean bridge interface for session lifecycle integration.

## Installation

```bash
# In OpenZosma workspace
pnpm add @openzosma/zosma-mem
```

## Core Concepts

### Salience Engine

The memory system uses **attention-based salience scoring** to prioritize facts:

- **Reuse count** - How often a fact has been retrieved
- **Decision influence** - How often a fact led to agent actions
- **Time decay** - Recent facts rank higher than old ones
- **Ignored reads** - Facts that didn't help get demoted

### Tag-Based Retrieval

Facts are retrieved using semantic tags rather than embeddings:

```typescript
// Retrieve memories relevant to a task
const results = await engine.retrieve({
  taskDescription: "fix the authentication bug",
  intent: "auth security debugging"
}, 8)
```

### Cross-Conversation Persistence

Memory persists across conversations via stable per-agent directories:

```
workspace/agents/<agentConfigId>/memory/
├── .salience/          # YAML files with scored entities
├── .salience/archive/  # Pruned entities
└── .salience/co-access # Access pattern correlations
```

## Usage

### Basic Engine Usage

```typescript
import { createMemoryEngine } from "@openzosma/zosma-mem"

const engine = createMemoryEngine({
  memoryDir: "/path/to/memory",
  salienceThreshold: 0.4,  // Minimum salience to keep
  gcIntervalMs: 3600000,   // GC every hour
})

// Ingest facts
await engine.ingest({
  id: "user-pref-dark",
  type: "preference",
  content: "User prefers dark mode interfaces",
  tags: ["ui", "theme", "preference"],
  timestamp: Date.now(),
})

// Retrieve relevant memories
const results = await engine.retrieve({
  taskDescription: "design the new UI",
  intent: "interface design"
}, 5)

console.log(results.map(r => ({
  content: r.entity.content,
  score: r.attentionScore
})))
```

### Agent Bridge Integration

For AI agent sessions, use the bridge interface:

```typescript
import { createMemoryBridge } from "@openzosma/zosma-mem/bridge"

const bridge = createMemoryBridge({
  memoryDir: "/workspace/agents/config-123/memory",
  topK: 8  // Max memories per turn
})

// Before each agent turn
const context = await bridge.loadContext("user's question")
if (context) {
  await session.steer(context)  // Inject memory into prompt
}

// After each turn, extract and store facts
const facts = await extractFacts(model, apiKey, userMsg, assistantResponse)
await bridge.ingestFacts(facts)

// Track reinforcement
await bridge.recordUsage(entityId, "used")  // or "ignored" or "influenced_decision"
```

### Extension Path Resolution

For pi-brain and pi-dcp extensions:

```typescript
import { resolveMemoryExtensionPaths } from "@openzosma/zosma-mem/bridge"

const { paths, missing } = resolveMemoryExtensionPaths()
if (missing.length > 0) {
  console.warn("Missing extensions:", missing)
}

// Use paths with DefaultResourceLoader
```

## Memory Types

The system handles different categories of facts:

- **preference** - User likes/dislikes, habits
- **decision** - Choices made, constraints set
- **pattern** - Repeating behaviors, workflows
- **error** - Mistakes, lessons learned

## Garbage Collection

Automatic cleanup runs periodically:

- **Decay** - Reduce salience of old/unused facts
- **Prune** - Remove facts below salience threshold
- **Consolidate** - Merge similar entities

```typescript
// Manual GC
const report = await engine.gc()
console.log(`${report.pruned} pruned, ${report.decayed} decayed`)
```

## Configuration

```typescript
interface MemoryConfig {
  memoryDir: string                    // Required: where to store files
  salienceThreshold?: number          // Default: 0.4
  gcIntervalMs?: number               // Default: 3,600,000 (1 hour)
  gcPruneCycles?: number              // Default: 1
  summarizer?: (texts: string[]) => Promise<string>
  now?: () => number                  // For testing
}
```

## Architecture

### Core Modules

- **engine/** - Salience scoring, reinforcement, GC
- **store/** - File-based entity storage with co-access patterns
- **ingestion/** - Fact ingestion and scoring
- **retrieval/** - Tag-based search with attention ranking
- **gc/** - Decay, pruning, consolidation
- **bridge/** - Agent session integration

### File Storage

- **Entity files**: `.salience/*.yaml` - Individual facts with scores
- **Archive**: `.salience/archive/` - Pruned entities
- **Co-access**: `.salience/co-access` - Access pattern correlations

## Development

```bash
# Build
pnpm run build

# Test
pnpm run test

# Type check
pnpm run check
```

## Publishing

```bash
pnpm run build && pnpm run test
npm publish
```

Built for OpenZosma agents, works with any AI agent framework that needs persistent cross-conversation memory. 🚀
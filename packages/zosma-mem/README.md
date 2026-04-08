# zosma-mem

**Standalone CLI for evaluating agentic memory systems**

A zero-config evaluation tool that automatically detects and tests memory systems against standardized information retrieval scenarios.

## Installation

```bash
# For development (current)
cd packages/zosma-mem
npm install -g .

# After publishing
npm install -g zosma-mem
```

## Usage

```bash
# Auto-detect and evaluate memory system
zosma-mem

# Run specific scenarios
zosma-mem --scenarios "cold-start,signal-dilution"

# Output JSON instead of markdown
zosma-mem --json

# Save report to file
zosma-mem --out report.md
```

## What It Does

zosma-mem evaluates memory systems against 7 standardized scenarios:

- **Cold start** - Basic ingestion and retrieval
- **Signal dilution** - Handling noise at scale
- **Repeated patterns** - Reinforcement learning
- **Stale memory** - Time-based decay
- **Conflicts** - Update resolution
- **Context awareness** - Cross-context relevance
- **Co-access clusters** - Relational recall

## Auto-Detection

zosma-mem automatically detects memory systems:

1. **OpenZosma**: `packages/gateway/workspace/agents/default/memory/MEMORY.md`
2. **Generic file**: `MEMORY.md`, `memory.md`, or `.memory.md`

## Example Output

```
✅ Found openzosma memory at packages/gateway/workspace/agents/default/memory/MEMORY.md

## zosma-mem Eval Report -- 2026-04-08T10:00:00Z

| Scenario            | P@K   | R@K   | MRR   | Noise | Pass |
| ------------------- | ----- | ----- | ----- | ----- | ---- |
| Cold start          | 0.800 | 1.000 | 1.000 | 0.100 | yes  |
| Signal dilution     | 0.600 | 1.000 | 1.000 | 0.900 | yes  |
| Repeated pattern    | 0.200 | 1.000 | 1.000 | 0.000 | NO   |
| ...                 |      |      |      |       |      |

Summary: 3/7 passed. Avg P@K: 0.37
❌ 4 tests failed
```

## Metrics Explained

- **P@K**: Precision@K - How many of top-K results are relevant
- **R@K**: Recall@K - How many relevant items found in top-K
- **MRR**: Mean Reciprocal Rank - How quickly relevant items appear
- **Noise**: Fraction of stored items never retrieved

## Usage in OpenZosma (Current Development)

Install zosma-mem globally for development:

```bash
# From the zosma-mem package directory
cd packages/zosma-mem
npm install -g .

# Now use from anywhere
zosma-mem
```

The tool automatically detects your OpenZosma memory system and runs the evaluation.

## Advanced Usage

### Programmatic API

```typescript
import { runEvals, builtInScenarios } from "zosma-mem/evals"

const report = await runEvals({
  adapter: myCustomAdapter,
  scenarios: builtInScenarios,
  k: 5
})
```

### Custom Adapters

For custom memory systems, implement the MemoryAdapter interface:

```typescript
import { MemoryAdapter, MemoryEvent } from "zosma-mem/evals"

const adapter: MemoryAdapter = {
  setup: async (opts) => { /* initialize */ },
  ingest: async (event: MemoryEvent) => { /* store */ },
  retrieve: async (query, topK) => { /* search */ },
  // ... other methods
}
```

## Publishing

This package is published to npm as `zosma-mem`. To publish updates:

```bash
# Build and test
pnpm run build
pnpm run test

# Publish
npm publish
```

## Development

```bash
# Build
pnpm run build

# Test
pnpm run test

# Run locally
pnpm eval
```

Built for developers who want to evaluate memory systems without configuration complexity. Made for OpenZosma, works with any memory system. 🚀
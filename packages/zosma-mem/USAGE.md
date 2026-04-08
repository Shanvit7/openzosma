# zosma-mem Usage Guide

**Standalone CLI for evaluating agentic memory systems**

A zero-config evaluation tool that automatically detects and tests memory systems against standardized information retrieval scenarios.

## Installation for Development

Since zosma-mem isn't published yet, install it globally from source:

```bash
# From your OpenZosma project
cd packages/zosma-mem
npm install -g .

# Now use from anywhere
zosma-mem
```

## Usage Examples

```bash
# Basic evaluation
zosma-mem

# Run specific scenarios only
zosma-mem --scenarios "cold-start,signal-dilution"

# Output JSON instead of markdown
zosma-mem --json

# Save report to file
zosma-mem --out memory-report.md
```

## CLI Options

```bash
zosma-mem [options]

Options:
  --scenarios <names>    Run specific scenarios (comma-separated)
  --k <number>          Top-K for metrics (default: 5)
  --json                Output JSON instead of markdown
  --out <path>          Save report to file
  --help                Show help
```

## What It Evaluates

zosma-mem tests your memory system against 7 standardized scenarios:

### ✅ Working Scenarios (Your Goals)
- **Cold start** - Basic ingestion and retrieval
- **Signal dilution** - Handling noise at scale
- **Co-access cluster** - Relational recall

### 🎯 Advanced Scenarios (Future Improvements)
- **Repeated patterns** - Reinforcement learning
- **Stale memory** - Time-based decay
- **Conflicts** - Update resolution
- **Context awareness** - Cross-context relevance

## Example Output

```
✅ Found openzosma memory at packages/gateway/workspace/agents/default/memory/MEMORY.md

## zosma-mem Eval Report -- 2026-04-08T10:00:00Z

| Scenario            | P@K   | R@K   | MRR   | Noise | Pass |
| ------------------- | ----- | ----- | ----- | ----- | ---- |
| Cold start          | 0.600 | 1.000 | 1.000 | 0.500 | yes  |
| Repeated pattern    | 0.200 | 1.000 | 1.000 | 0.000 | NO   |
| Signal dilution     | 0.600 | 1.000 | 1.000 | 0.951 | yes  |
| Stale memory        | 0.200 | 1.000 | 1.000 | 0.167 | NO   |
| Conflicting updates | 0.200 | 1.000 | 1.000 | 0.000 | NO   |
| Co-access cluster   | 0.600 | 1.000 | 1.000 | 0.000 | yes  |
| Cross-context       | 0.200 | 1.000 | 1.000 | 0.000 | NO   |

Summary: 3/7 passed. Avg P@K: 0.371, Avg R@K: 1.000, Avg MRR: 1.000
```

## Understanding Your Results

### Current Status (3/7 passed)
Your OpenZosma memory system handles basic operations well but lacks advanced features.

### What the Scores Mean

- **P@K (Precision@K)**: Fraction of top-5 results that are relevant
  - 0.600 = 3/5 relevant results in top-5
  - 0.200 = 1/5 relevant results in top-5

- **R@K (Recall@K)**: Fraction of all relevant items found in top-5
  - 1.000 = All relevant items found

- **MRR (Mean Reciprocal Rank)**: How quickly relevant items appear
  - 1.000 = Relevant items appear first

- **Noise**: Fraction of stored items never retrieved
  - Lower is better

## Roadmap for OpenZosma Memory

Use zosma-mem results to guide development:

1. **Phase 1** ✅ Basic storage and retrieval
2. **Phase 2** 🔄 Add reinforcement learning (repeated patterns)
3. **Phase 3** 🔄 Add time-based decay (stale memory)
4. **Phase 4** 🔄 Add conflict resolution
5. **Phase 5** 🔄 Add context awareness

## Advanced Usage

### Programmatic Evaluation

```typescript
import { runEvals, builtInScenarios } from "zosma-mem/evals"

const report = await runEvals({
  adapter: myAdapter,
  scenarios: builtInScenarios,
  k: 5
})
```

### Custom Memory Adapters

For non-OpenZosma memory systems:

```typescript
import { MemoryAdapter, MemoryEvent } from "zosma-mem/evals"

const adapter: MemoryAdapter = {
  setup: async (opts) => { /* init */ },
  ingest: async (event: MemoryEvent) => { /* store */ },
  retrieve: async (query, topK) => { /* search */ },
  recordUsage: async (id, signal) => { /* learn */ },
  gc: async () => ({ removedCount: 0, archivedCount: 0, consolidatedCount: 0 }),
  advanceTime: async (ms) => { /* time travel */ },
  listEntities: async () => [/* all ids */],
  teardown: async () => { /* cleanup */ }
}
```

## Publishing

This package is published to npm as `zosma-mem`. To publish updates:

```bash
# Build
pnpm run build

# Test locally
pnpm eval

# Publish
npm publish
```

## Development

```bash
# Install dependencies
pnpm install

# Build TypeScript
pnpm run build

# Run tests
pnpm run test

# Test CLI locally
pnpm eval
```

## OpenZosma Integration

zosma-mem is the official evaluation tool for OpenZosma memory systems. It:

- Auto-detects OpenZosma memory formats
- Provides standardized evaluation metrics
- Tracks improvement over time
- Guides feature development priorities

Run `zosma-mem` regularly to see how your memory system evolves! 🚀
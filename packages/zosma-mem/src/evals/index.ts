/**
 * Public API surface for zosma-mem/evals.
 *
 * Import via:
 *   import { runEvals, builtInScenarios } from "zosma-mem/evals"
 */

// Runner
export { runEvals } from "./runner.js"

// Report
export { renderMarkdownReport } from "./report.js"

// Scenarios
export {
	builtInScenarios,
	coldStartScenario,
	repeatedPatternScenario,
	signalDilutionScenario,
	staleMemoryScenario,
	conflictingUpdatesScenario,
	coAccessClusterScenario,
	crossContextScenario,
} from "./scenarios/index.js"

// Metrics (for custom scenario authors)
export {
	computePrecisionAtK,
	computeRecallAtK,
	computeMRR,
	computeNoiseRatio,
	computeGcEffectiveness,
	computeSalienceDrift,
} from "./metrics.js"

// Fixtures and utilities (for custom scenario authors)
export { createEvent, createQuery, createLowValueEvents, createHighValueEvents } from "./utils/fixtures.js"
export { createClock, ONE_HOUR_MS, ONE_DAY_MS, ONE_WEEK_MS, THIRTY_DAYS_MS } from "./utils/time.js"
export { checkMetric, checkAllMetrics, DEFAULT_THRESHOLDS } from "./utils/assertions.js"

// Types
export type {
	MemoryAdapter,
	MemoryEvent,
	RetrieveQuery,
	RetrievedEntity,
	UsageSignal,
	GcResult,
	AdapterSetupOpts,
	DeterministicClock,
	EvalMetrics,
	EvalReport,
	ScenarioDefinition,
	ScenarioResult,
	RunnerOpts,
} from "./types.js"

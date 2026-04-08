/**
 * Engine-agnostic types for zosma-mem/evals.
 *
 * These types define the contract between the eval framework and any memory
 * engine under test. No implementation details leak through here -- engines
 * are black boxes that accept events and answer queries.
 */

// ---------------------------------------------------------------------------
// Deterministic clock
// ---------------------------------------------------------------------------

/**
 * A synthetic clock injected into the adapter at setup time.
 * Scenarios that test time-sensitive behaviour (decay, stale memory) advance
 * this clock instead of using wall-clock time, making tests deterministic.
 */
export interface DeterministicClock {
	/** Return the current synthetic timestamp (ms since epoch). */
	now: () => number
	/** Move the clock forward by the given number of milliseconds. */
	advance: (ms: number) => void
}

// ---------------------------------------------------------------------------
// Adapter setup
// ---------------------------------------------------------------------------

export interface AdapterSetupOpts {
	/**
	 * Temporary directory created by the runner for this scenario.
	 * The engine may use it for any persistent state.
	 * The runner cleans it up after teardown.
	 */
	workDir: string
	/** Deterministic clock. The engine must use this instead of Date.now(). */
	clock: DeterministicClock
}

// ---------------------------------------------------------------------------
// Memory events
// ---------------------------------------------------------------------------

/**
 * A memory event as seen by the eval framework.
 * Deliberately minimal -- engines may treat `type` and `metadata` as they see fit.
 */
export interface MemoryEvent {
	id: string
	/**
	 * Semantic category. Common values: "decision" | "error" | "pattern" | "preference".
	 * Not constrained to an enum -- each engine defines its own taxonomy.
	 */
	type: string
	/** Human-readable content to be stored. */
	content: string
	/** Tags used for retrieval matching. */
	tags: string[]
	/** Synthetic timestamp produced by the deterministic clock. */
	timestamp: number
	/** Engine-specific passthrough. The eval framework never reads this. */
	metadata?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Retrieval
// ---------------------------------------------------------------------------

export interface RetrieveQuery {
	/** Natural language task description. */
	text: string
	/** Optional hint tags to narrow the search. */
	tags?: string[]
	/** Engine-specific context passthrough. The eval framework never reads this. */
	context?: Record<string, unknown>
}

export interface RetrievedEntity {
	id: string
	content: string
	/**
	 * Engine-assigned relevance score. The eval framework only uses this for
	 * ordering -- it does not interpret the magnitude.
	 */
	score: number
	tags: string[]
}

// ---------------------------------------------------------------------------
// Usage signals
// ---------------------------------------------------------------------------

/**
 * Signal sent back to the engine after a retrieval to model agent behaviour.
 * - `used`               -- the agent acted on this entity (reinforces it)
 * - `ignored`            -- the agent did not act on it (demotes it)
 * - `influenced_decision` -- the entity directly shaped a tool call or decision (strongest signal)
 */
export type UsageSignal = "used" | "ignored" | "influenced_decision"

// ---------------------------------------------------------------------------
// GC
// ---------------------------------------------------------------------------

export interface GcResult {
	/** Entities fully removed from the store. */
	removedCount: number
	/** Entities moved to an archive / cold tier. */
	archivedCount: number
	/** Groups of entities merged into a single summary entity. */
	consolidatedCount: number
}

// ---------------------------------------------------------------------------
// Adapter interface
// ---------------------------------------------------------------------------

/**
 * Engine-agnostic adapter that the eval framework programs against.
 *
 * Engine authors implement this interface to make their engine evaluable.
 * The adapter is the only coupling point between the eval module and any
 * specific engine -- nothing else in this package imports engine code.
 */
export interface MemoryAdapter {
	/**
	 * Initialise the engine with a clean, isolated state.
	 * Called once before each scenario.
	 */
	setup: (opts: AdapterSetupOpts) => Promise<void>

	/** Ingest a memory event into the engine. */
	ingest: (event: MemoryEvent) => Promise<void>

	/**
	 * Retrieve the top-K most relevant entities for the given query.
	 * Results must be ordered by descending relevance (most relevant first).
	 */
	retrieve: (query: RetrieveQuery, topK: number) => Promise<RetrievedEntity[]>

	/**
	 * Report how the agent used a previously retrieved entity.
	 * Engines that support reinforcement learning update internal state here.
	 * Engines that do not may no-op.
	 */
	recordUsage: (entityId: string, signal: UsageSignal) => Promise<void>

	/**
	 * Trigger garbage collection / decay / pruning.
	 * Engines that do not support GC may no-op and return a zero GcResult.
	 */
	gc: () => Promise<GcResult>

	/**
	 * Advance the engine's internal clock by the given duration.
	 * Must delegate to the `DeterministicClock` provided in `setup`.
	 * Engines that use wall-clock time must accept a synthetic clock override.
	 */
	advanceTime: (ms: number) => Promise<void>

	/**
	 * Return all currently persisted entity IDs (including low-score ones).
	 * Used to compute noise ratio and GC effectiveness.
	 */
	listEntities: () => Promise<string[]>

	/**
	 * Tear down the engine and release any held resources.
	 * Called once after each scenario, regardless of pass/fail.
	 */
	teardown: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

export interface EvalMetrics {
	/** Of the top-K retrieved entities, what fraction was relevant? */
	precisionAtK: number
	/** Of all relevant entities, what fraction appeared in top-K? */
	recallAtK: number
	/** Mean reciprocal rank of the first relevant result (0 if none in top-K). */
	mrr: number
	/**
	 * Fraction of persisted entities never retrieved after ingestion.
	 * Measures ingestion threshold quality (high = lots of junk stored).
	 */
	noiseRatio: number
	/**
	 * Fraction of noise entities successfully removed by GC.
	 * Only meaningful in scenarios that exercise GC. -1 when not applicable.
	 */
	gcEffectiveness: number
	/**
	 * Standard deviation of entity scores across GC cycles.
	 * High drift = unstable scoring. -1 when not applicable.
	 */
	salienceDrift: number
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

export interface ScenarioResult {
	metrics: EvalMetrics
	passed: boolean
	/** Human-readable explanation on failure. Empty string when passing. */
	details: string
}

export interface ScenarioDefinition {
	name: string
	description: string
	/**
	 * Execute the scenario against the provided adapter and return results.
	 * The runner handles setup/teardown; the scenario only drives ingest/retrieve.
	 */
	run: (adapter: MemoryAdapter, clock: DeterministicClock) => Promise<ScenarioResult>
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

export interface RunnerOpts {
	/** The adapter wrapping the engine under test. */
	adapter: MemoryAdapter
	/**
	 * Scenarios to run. Defaults to all built-in scenarios when omitted.
	 */
	scenarios?: ScenarioDefinition[]
	/** Top-K for precision/recall computation. Default: 5. */
	k?: number
	/** Override default pass/fail thresholds per metric. */
	thresholds?: Partial<EvalMetrics>
	/**
	 * Max scenarios running concurrently. Default: 1 (sequential).
	 * Parallel execution is only safe if the adapter supports isolated instances.
	 */
	concurrency?: number
	/** Called immediately before each scenario starts. */
	onScenarioStart?: (name: string) => void
	/** Called immediately after each scenario completes. */
	onScenarioEnd?: (name: string, result: ScenarioResult) => void
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

export interface EvalReport {
	/** Unix ms timestamp of when the run completed. */
	timestamp: number
	results: Array<{
		scenario: string
		metrics: EvalMetrics
		passed: boolean
		details: string
	}>
	summary: {
		total: number
		passed: number
		failed: number
		avgPrecision: number
		avgRecall: number
		avgMrr: number
	}
}

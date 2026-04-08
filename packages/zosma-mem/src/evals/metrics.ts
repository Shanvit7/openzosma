/**
 * Pure metric computation functions for zosma-mem/evals.
 *
 * All functions are stateless and side-effect-free. They accept raw arrays/sets
 * of entity IDs and return a single numeric value. No engine types are imported.
 */

// ---------------------------------------------------------------------------
// Standard information retrieval metrics
// ---------------------------------------------------------------------------

/**
 * Precision@K: of the first K retrieved entities, what fraction is relevant?
 *
 * @param retrieved - Ordered list of retrieved entity IDs (most relevant first).
 * @param relevant  - Set of all entity IDs that are considered relevant.
 * @param k         - Cutoff rank.
 * @returns Value in [0, 1]. Returns 0 when k === 0.
 */
export const computePrecisionAtK = (retrieved: readonly string[], relevant: ReadonlySet<string>, k: number): number => {
	if (k === 0) return 0
	const topK = retrieved.slice(0, k)
	const hits = topK.filter((id) => relevant.has(id)).length
	return hits / k
}

/**
 * Recall@K: of all relevant entities, what fraction appeared in the top K?
 *
 * @param retrieved - Ordered list of retrieved entity IDs (most relevant first).
 * @param relevant  - Set of all entity IDs that are considered relevant.
 * @param k         - Cutoff rank.
 * @returns Value in [0, 1]. Returns 1 when `relevant` is empty (vacuously true).
 */
export const computeRecallAtK = (retrieved: readonly string[], relevant: ReadonlySet<string>, k: number): number => {
	if (relevant.size === 0) return 1
	const topK = retrieved.slice(0, k)
	const hits = topK.filter((id) => relevant.has(id)).length
	return hits / relevant.size
}

/**
 * Mean Reciprocal Rank: reciprocal of the rank of the first relevant result.
 *
 * Called "MRR" even though it is computed for a single query here; callers
 * average across queries to get the true MRR.
 *
 * @param retrieved - Ordered list of retrieved entity IDs (most relevant first).
 * @param relevant  - Set of all entity IDs that are considered relevant.
 * @returns Value in (0, 1]. Returns 0 if no relevant entity appears in the list.
 */
export const computeMRR = (retrieved: readonly string[], relevant: ReadonlySet<string>): number => {
	for (let i = 0; i < retrieved.length; i++) {
		if (relevant.has(retrieved[i])) {
			return 1 / (i + 1)
		}
	}
	return 0
}

// ---------------------------------------------------------------------------
// Memory-specific metrics
// ---------------------------------------------------------------------------

/**
 * Noise ratio: fraction of stored entities never retrieved after ingestion.
 *
 * A high noise ratio means the engine is persisting lots of low-value entities
 * that never surface. Useful for assessing ingestion threshold quality.
 *
 * @param allEntities   - All entity IDs currently persisted by the engine.
 * @param everRetrieved - Set of entity IDs that appeared in at least one result set.
 * @returns Value in [0, 1]. Returns 0 when `allEntities` is empty.
 */
export const computeNoiseRatio = (
	allEntities: readonly string[],
	everRetrieved: ReadonlySet<string>,
): number => {
	if (allEntities.length === 0) return 0
	const noiseCount = allEntities.filter((id) => !everRetrieved.has(id)).length
	return noiseCount / allEntities.length
}

/**
 * GC effectiveness: fraction of noise entities removed after GC.
 *
 * @param noiseBeforeGc - Entity IDs that were noise (never retrieved) before GC.
 * @param entitiesAfterGc - All entity IDs persisted after GC runs.
 * @returns Value in [0, 1]. Returns -1 when `noiseBeforeGc` is empty (N/A).
 */
export const computeGcEffectiveness = (
	noiseBeforeGc: readonly string[],
	entitiesAfterGc: readonly string[],
): number => {
	if (noiseBeforeGc.length === 0) return -1
	const afterSet = new Set(entitiesAfterGc)
	const removed = noiseBeforeGc.filter((id) => !afterSet.has(id)).length
	return removed / noiseBeforeGc.length
}

/**
 * Salience drift: standard deviation of entity scores across GC cycles.
 *
 * A high drift value indicates the scoring function is unstable -- entities
 * oscillate in relevance across cycles rather than converging.
 *
 * @param scoreSnapshots - Array of score arrays, one per GC cycle.
 *                         Each inner array contains one score per entity.
 * @returns Standard deviation across all scores. Returns -1 when fewer than
 *          two cycles are provided (not enough data).
 */
export const computeSalienceDrift = (scoreSnapshots: ReadonlyArray<readonly number[]>): number => {
	if (scoreSnapshots.length < 2) return -1

	const allScores: number[] = scoreSnapshots.flat()
	if (allScores.length === 0) return -1

	const mean = allScores.reduce((sum, s) => sum + s, 0) / allScores.length
	const variance = allScores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / allScores.length
	return Math.sqrt(variance)
}

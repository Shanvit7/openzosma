/**
 * Threshold helpers for scenario pass/fail decisions.
 *
 * Each function returns a human-readable failure message, or an empty string
 * when the check passes. Scenarios collect these messages and join them to
 * produce the `details` field of ScenarioResult.
 */

import type { EvalMetrics } from "../types.js"

/** Default pass thresholds used when the runner does not provide overrides. */
export const DEFAULT_THRESHOLDS: Readonly<EvalMetrics> = {
	precisionAtK: 0.6,
	recallAtK: 0.6,
	mrr: 0.5,
	noiseRatio: -1,    // no hard limit by default -- informational only
	gcEffectiveness: -1, // -1 = N/A, skip check
	salienceDrift: -1,   // -1 = N/A, skip check
}

/**
 * Check a single metric against a threshold.
 * Returns an empty string on pass, a descriptive message on fail.
 *
 * For `gcEffectiveness` and `salienceDrift`, a threshold of -1 means "skip".
 */
export const checkMetric = (
	name: keyof EvalMetrics,
	actual: number,
	threshold: number,
): string => {
	if (threshold === -1) return "" // N/A
	if (actual >= threshold) return ""
	return `${name}: ${actual.toFixed(3)} < threshold ${threshold.toFixed(3)}`
}

/**
 * Check all metrics against a threshold object.
 * Returns an array of failure messages (empty array = all passed).
 */
export const checkAllMetrics = (
	metrics: EvalMetrics,
	thresholds: Readonly<Partial<EvalMetrics>>,
): string[] => {
	const merged: EvalMetrics = { ...DEFAULT_THRESHOLDS, ...thresholds }
	const failures: string[] = []

	for (const key of Object.keys(merged) as Array<keyof EvalMetrics>) {
		const msg = checkMetric(key, metrics[key], merged[key])
		if (msg) failures.push(msg)
	}

	return failures
}

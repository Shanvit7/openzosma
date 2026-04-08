/**
 * Deterministic clock implementation for use in eval scenarios.
 *
 * Scenarios advance this clock explicitly rather than relying on wall-clock
 * time, making time-sensitive tests (decay, stale memory) fully reproducible.
 */

import type { DeterministicClock } from "../types.js"

/**
 * Create a new deterministic clock starting at the given epoch timestamp.
 *
 * @param startMs - Initial timestamp in milliseconds. Defaults to a fixed
 *                  reference point (2026-01-01T00:00:00.000Z) so tests are
 *                  not sensitive to when they run.
 */
export const createClock = (startMs = 1_735_689_600_000): DeterministicClock => {
	let current = startMs

	return {
		now: () => current,
		advance: (ms: number) => {
			current += ms
		},
	}
}

// Convenience constants for advancing time in scenarios.
export const ONE_HOUR_MS = 60 * 60 * 1_000
export const ONE_DAY_MS = 24 * ONE_HOUR_MS
export const ONE_WEEK_MS = 7 * ONE_DAY_MS
export const THIRTY_DAYS_MS = 30 * ONE_DAY_MS

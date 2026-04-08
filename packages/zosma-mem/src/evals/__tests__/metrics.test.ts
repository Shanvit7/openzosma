import { describe, expect, it } from "vitest"
import {
	computeGcEffectiveness,
	computeMRR,
	computeNoiseRatio,
	computePrecisionAtK,
	computeRecallAtK,
	computeSalienceDrift,
} from "../metrics.js"

describe("computePrecisionAtK", () => {
	it("returns 1.0 when all top-K are relevant", () => {
		expect(computePrecisionAtK(["a", "b", "c"], new Set(["a", "b", "c"]), 3)).toBe(1)
	})

	it("returns 0.0 when none of the top-K are relevant", () => {
		expect(computePrecisionAtK(["x", "y", "z"], new Set(["a", "b", "c"]), 3)).toBe(0)
	})

	it("returns 0.6 when 3 of 5 are relevant", () => {
		expect(computePrecisionAtK(["a", "b", "x", "c", "y"], new Set(["a", "b", "c"]), 5)).toBe(0.6)
	})

	it("returns 0 when k is 0", () => {
		expect(computePrecisionAtK(["a"], new Set(["a"]), 0)).toBe(0)
	})

	it("only evaluates up to K positions even if list is longer", () => {
		expect(computePrecisionAtK(["a", "b", "c", "d", "e"], new Set(["d", "e"]), 3)).toBe(0)
	})
})

describe("computeRecallAtK", () => {
	it("returns 1.0 when all relevant entities appear in top-K", () => {
		expect(computeRecallAtK(["a", "b", "c"], new Set(["a", "b"]), 3)).toBe(1)
	})

	it("returns 0.5 when half of relevant entities appear in top-K", () => {
		expect(computeRecallAtK(["a", "x", "y"], new Set(["a", "b"]), 3)).toBe(0.5)
	})

	it("returns 1.0 when relevant set is empty (vacuously true)", () => {
		expect(computeRecallAtK(["a", "b"], new Set(), 5)).toBe(1)
	})

	it("returns 0 when no relevant entities in top-K", () => {
		expect(computeRecallAtK(["x", "y", "z"], new Set(["a", "b"]), 3)).toBe(0)
	})
})

describe("computeMRR", () => {
	it("returns 1.0 when the first result is relevant", () => {
		expect(computeMRR(["a", "b", "c"], new Set(["a"]))).toBe(1)
	})

	it("returns 0.5 when the second result is the first relevant", () => {
		expect(computeMRR(["x", "a", "b"], new Set(["a"]))).toBe(0.5)
	})

	it("returns 0.333... when the third result is the first relevant", () => {
		expect(computeMRR(["x", "y", "a"], new Set(["a"]))).toBeCloseTo(1 / 3)
	})

	it("returns 0 when no relevant entity is found", () => {
		expect(computeMRR(["x", "y", "z"], new Set(["a"]))).toBe(0)
	})

	it("handles empty retrieved list", () => {
		expect(computeMRR([], new Set(["a"]))).toBe(0)
	})
})

describe("computeNoiseRatio", () => {
	it("returns 0 when all entities were retrieved at least once", () => {
		expect(computeNoiseRatio(["a", "b", "c"], new Set(["a", "b", "c"]))).toBe(0)
	})

	it("returns 1 when no entity was ever retrieved", () => {
		expect(computeNoiseRatio(["a", "b", "c"], new Set())).toBe(1)
	})

	it("returns 0.5 when half were never retrieved", () => {
		expect(computeNoiseRatio(["a", "b", "c", "d"], new Set(["a", "b"]))).toBe(0.5)
	})

	it("returns 0 when entity list is empty", () => {
		expect(computeNoiseRatio([], new Set())).toBe(0)
	})
})

describe("computeGcEffectiveness", () => {
	it("returns -1 when no noise entities before GC", () => {
		expect(computeGcEffectiveness([], ["a", "b"])).toBe(-1)
	})

	it("returns 1.0 when all noise entities were removed", () => {
		expect(computeGcEffectiveness(["x", "y"], ["a", "b"])).toBe(1)
	})

	it("returns 0.5 when half of noise entities were removed", () => {
		expect(computeGcEffectiveness(["x", "y"], ["x", "a", "b"])).toBe(0.5)
	})

	it("returns 0 when no noise entities were removed", () => {
		expect(computeGcEffectiveness(["x", "y"], ["x", "y", "a"])).toBe(0)
	})
})

describe("computeSalienceDrift", () => {
	it("returns -1 with fewer than 2 snapshots", () => {
		expect(computeSalienceDrift([[1, 2, 3]])).toBe(-1)
		expect(computeSalienceDrift([])).toBe(-1)
	})

	it("returns 0 when all scores are identical across cycles", () => {
		expect(computeSalienceDrift([[1, 1, 1], [1, 1, 1]])).toBe(0)
	})

	it("returns a positive value when scores vary", () => {
		const drift = computeSalienceDrift([[0, 1, 2], [3, 4, 5]])
		expect(drift).toBeGreaterThan(0)
	})

	it("returns -1 when snapshots exist but all are empty", () => {
		expect(computeSalienceDrift([[], []])).toBe(-1)
	})
})

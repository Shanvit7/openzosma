/**
 * Built-in scenario registry.
 *
 * Import `builtInScenarios` to run the full default suite.
 * Scenarios are listed in the order they will run when no override is provided.
 */

import { coldStartScenario } from "./cold-start.js"
import { coAccessClusterScenario } from "./co-access-cluster.js"
import { conflictingUpdatesScenario } from "./conflicting-updates.js"
import { crossContextScenario } from "./cross-context.js"
import { repeatedPatternScenario } from "./repeated-pattern.js"
import { signalDilutionScenario } from "./signal-dilution.js"
import { staleMemoryScenario } from "./stale-memory.js"
import type { ScenarioDefinition } from "../types.js"

export const builtInScenarios: ScenarioDefinition[] = [
	coldStartScenario,
	repeatedPatternScenario,
	signalDilutionScenario,
	staleMemoryScenario,
	conflictingUpdatesScenario,
	coAccessClusterScenario,
	crossContextScenario,
]

export {
	coldStartScenario,
	repeatedPatternScenario,
	signalDilutionScenario,
	staleMemoryScenario,
	conflictingUpdatesScenario,
	coAccessClusterScenario,
	crossContextScenario,
}

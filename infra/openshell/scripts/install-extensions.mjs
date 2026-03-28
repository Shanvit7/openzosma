#!/usr/bin/env node
/**
 * Install pi extensions from a JSON manifest file.
 *
 * Usage: node install-extensions.mjs [manifest-path]
 *
 * manifest-path defaults to /tmp/extensions.json
 *
 * The manifest must be a JSON array of pi install specifiers, e.g.:
 *   ["npm:pi-web-access@0.10.3", "git:github.com/user/pi-tool"]
 */

import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"

const manifestPath = process.argv[2] ?? "/tmp/extensions.json"

let manifest
try {
	manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
} catch (err) {
	console.error(`Failed to read manifest at ${manifestPath}: ${err.message}`)
	process.exit(1)
}

if (!Array.isArray(manifest)) {
	console.error(`Manifest must be a JSON array, got: ${typeof manifest}`)
	process.exit(1)
}

for (const pkg of manifest) {
	if (typeof pkg !== "string" || !pkg.trim()) {
		console.error(`Invalid entry (must be a non-empty string): ${JSON.stringify(pkg)}`)
		process.exit(1)
	}
	console.log(`Installing ${pkg}...`)
	// Use execFileSync with split args to avoid shell injection
	execFileSync("pi", ["install", pkg], { stdio: "inherit" })
}

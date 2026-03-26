import { log, note } from "@clack/prompts"
import pc from "picocolors"
import { tryCommand } from "../utils/exec.js"

interface PrereqResult {
	name: string
	version: string | null
	required: boolean
}

/**
 * Check that all required prerequisites are installed and report status.
 * Hard-fails on missing required deps (node, pnpm, docker, git).
 * Soft-warns on missing optional deps (openshell).
 */
export const checkPrerequisites = async (): Promise<{ openshellAvailable: boolean }> => {
	const checks: PrereqResult[] = []

	// Node.js
	const nodeVersion = await tryCommand("node --version")
	checks.push({ name: "Node.js", version: nodeVersion, required: true })

	// pnpm
	const pnpmVersion = await tryCommand("pnpm --version")
	checks.push({ name: "pnpm", version: pnpmVersion, required: true })

	// Docker
	const dockerOut = await tryCommand("docker --version")
	const dockerVersion = dockerOut?.match(/Docker version ([^\s,]+)/)?.[1] ?? dockerOut
	checks.push({ name: "Docker", version: dockerVersion ? dockerVersion : null, required: true })

	// Docker daemon running
	const dockerInfo = await tryCommand("docker info --format '{{.ServerVersion}}'")
	if (!dockerInfo && dockerVersion) {
		checks.push({ name: "Docker daemon", version: null, required: true })
	}

	// Docker Compose
	const composeVersion = await tryCommand("docker compose version --short")
	checks.push({ name: "Docker Compose", version: composeVersion, required: true })

	// Git
	const gitOut = await tryCommand("git --version")
	const gitVersion = gitOut?.match(/git version (.+)/)?.[1] ?? gitOut
	checks.push({ name: "Git", version: gitVersion ? gitVersion : null, required: true })

	// OpenShell (optional)
	const openshellVersion = await tryCommand("openshell --version")
	const openshellParsed = openshellVersion?.match(/(\d+\.\d+\.\d+)/)?.[1] ?? openshellVersion
	checks.push({
		name: "OpenShell CLI",
		version: openshellParsed ? openshellParsed : null,
		required: false,
	})

	// Format output
	const lines: string[] = []
	const missing: string[] = []

	for (const check of checks) {
		if (check.version) {
			lines.push(`  ${pc.green("✓")} ${check.name} ${pc.dim(check.version)}`)
		} else if (check.required) {
			lines.push(`  ${pc.red("✗")} ${check.name} ${pc.red("not found")}`)
			missing.push(check.name)
		} else {
			lines.push(`  ${pc.yellow("⚠")} ${check.name} ${pc.yellow("not found (optional)")}`)
		}
	}

	note(lines.join("\n"), "Prerequisites")

	if (missing.length > 0) {
		const installHelp = [
			`Missing required tools: ${missing.join(", ")}.`,
			"",
			"Install them before continuing:",
			"  Node.js 22+:       https://nodejs.org",
			"  pnpm:              npm install -g pnpm",
			"  Docker:            https://docs.docker.com/get-docker",
			"  Git:               https://git-scm.com/downloads",
		].join("\n")
		log.error(installHelp)
		process.exit(1)
	}

	// Validate Node.js version >= 22
	if (nodeVersion) {
		const major = Number.parseInt(nodeVersion.replace("v", "").split(".")[0] ?? "0", 10)
		if (major < 22) {
			log.error(`Node.js 22+ is required, but found ${nodeVersion}.`)
			process.exit(1)
		}
	}

	return { openshellAvailable: openshellParsed !== null && openshellParsed !== undefined }
}

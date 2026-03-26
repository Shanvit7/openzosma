import { cancel, confirm, isCancel, log, select } from "@clack/prompts"
import { OPENSHELL_INSTALL_CURL, OPENSHELL_INSTALL_UV, SANDBOX_IMAGE_DEFAULT } from "../constants.js"
import { run } from "../utils/exec.js"
import { tryCommand } from "../utils/exec.js"

export interface SandboxConfig {
	mode: "local" | "orchestrator"
	image?: string
}

/**
 * Prompt the user for sandbox execution mode.
 * If orchestrator is selected and OpenShell is missing, offer to install it.
 */
export const configureSandbox = async (openshellAvailable: boolean): Promise<SandboxConfig> => {
	const mode = await select({
		message: "Agent execution mode",
		options: [
			{
				value: "local" as const,
				label: "Local",
				hint: "in-process, recommended for development",
			},
			{
				value: "orchestrator" as const,
				label: "Orchestrator",
				hint: "isolated OpenShell sandboxes, recommended for production",
			},
		],
	})

	if (isCancel(mode)) {
		cancel("Setup cancelled.")
		process.exit(0)
	}

	if (mode === "local") {
		return { mode: "local" }
	}

	// Orchestrator mode -- need OpenShell
	let hasOpenshell = openshellAvailable

	if (!hasOpenshell) {
		log.warn("OpenShell CLI is required for orchestrator mode but was not found.")

		const installMethod = await select({
			message: "Install OpenShell?",
			options: [
				{
					value: "curl",
					label: "Install via curl",
					hint: "recommended",
				},
				{
					value: "uv",
					label: "Install via PyPI",
					hint: "requires uv",
				},
				{
					value: "skip",
					label: "Skip",
					hint: "I'll install it manually later",
				},
			],
		})

		if (isCancel(installMethod)) {
			cancel("Setup cancelled.")
			process.exit(0)
		}

		if (installMethod === "curl") {
			await run("Installing OpenShell", OPENSHELL_INSTALL_CURL)
			hasOpenshell = true
		} else if (installMethod === "uv") {
			// Verify uv is available
			const uvVersion = await tryCommand("uv --version")
			if (!uvVersion) {
				log.error("uv is not installed. Install it first: https://docs.astral.sh/uv/getting-started/installation/")
				log.info("Falling back to curl install...")
				await run("Installing OpenShell", OPENSHELL_INSTALL_CURL)
			} else {
				await run("Installing OpenShell via PyPI", OPENSHELL_INSTALL_UV)
			}
			hasOpenshell = true
		}

		if (hasOpenshell) {
			// Verify installation
			const version = await tryCommand("openshell --version")
			if (version) {
				log.success(`OpenShell installed: ${version}`)
			} else {
				log.warn(
					"OpenShell was installed but could not be verified. " +
						"You may need to restart your shell or add it to your PATH.",
				)
			}
		}
	}

	// Offer to start the OpenShell gateway
	if (hasOpenshell) {
		const startGateway = await confirm({
			message: "Start the OpenShell gateway now? (bootstraps a local K3s cluster)",
			initialValue: false,
		})

		if (isCancel(startGateway)) {
			cancel("Setup cancelled.")
			process.exit(0)
		}

		if (startGateway) {
			await run("Starting OpenShell gateway", "openshell gateway start")
		}
	}

	return {
		mode: "orchestrator",
		image: SANDBOX_IMAGE_DEFAULT,
	}
}

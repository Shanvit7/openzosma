import { applyMemoryEnv } from "./config.js"
import type { MemoryBootstrapResult, MemoryConfig } from "./types.js"

/**
 * Bootstrap the memory system for an agent pod session.
 *
 * Sets environment variables (PI_MEMORY_DIR, etc.) so the pre-installed
 * pi-memory and pi-extension-observational-memory extensions pick up the
 * correct workspace-scoped memory directory at session startup.
 *
 * Extensions are installed at image build time via extensions.json — no
 * runtime path resolution is needed here.
 */
export function bootstrapMemory(config: MemoryConfig): MemoryBootstrapResult {
	const memoryDir = applyMemoryEnv(config)
	return { memoryDir }
}

export interface ProviderConfig {
	name: string
	value: string
	defaultModel: string
	envKey: string
	description: string
}

/** Supported LLM providers in preference order. */
export const PROVIDERS: ProviderConfig[] = [
	{
		name: "Anthropic",
		value: "anthropic",
		defaultModel: "claude-sonnet-4-20250514",
		envKey: "ANTHROPIC_API_KEY",
		description: "Claude Sonnet 4 -- recommended",
	},
	{
		name: "OpenAI",
		value: "openai",
		defaultModel: "gpt-4o",
		envKey: "OPENAI_API_KEY",
		description: "GPT-4o",
	},
	{
		name: "Google",
		value: "google",
		defaultModel: "gemini-2.5-flash-preview-05-20",
		envKey: "GEMINI_API_KEY",
		description: "Gemini 2.5 Flash",
	},
	{
		name: "Groq",
		value: "groq",
		defaultModel: "llama-3.3-70b-versatile",
		envKey: "GROQ_API_KEY",
		description: "Llama 3.3 70B",
	},
	{
		name: "xAI",
		value: "xai",
		defaultModel: "grok-3",
		envKey: "XAI_API_KEY",
		description: "Grok 3",
	},
	{
		name: "Mistral",
		value: "mistral",
		defaultModel: "mistral-large-latest",
		envKey: "MISTRAL_API_KEY",
		description: "Mistral Large",
	},
]

export const REPO_URL = "https://github.com/zosmaai/openzosma.git"
export const REPO_TARBALL_URL = "https://github.com/zosmaai/openzosma/archive/refs/heads/main.tar.gz"

export const DEFAULT_DB = {
	host: "localhost",
	port: "5432",
	name: "openzosma",
	user: "openzosma",
	password: "openzosma",
} as const

export const DEFAULT_PORTS = {
	gateway: "4000",
	web: "3000",
} as const

export const LOCAL_MODEL_DEFAULTS = {
	id: "local-model",
	apiKey: "dummy",
	contextWindow: "131072",
	maxTokens: "32768",
} as const

export const OPENSHELL_INSTALL_CURL =
	"curl -LsSf https://raw.githubusercontent.com/NVIDIA/OpenShell/main/install.sh | sh"
export const OPENSHELL_INSTALL_UV = "uv tool install -U --force openshell"

export const SANDBOX_IMAGE_DEFAULT = "openzosma/sandbox-server:v0.1.0"

/** Collected configuration from all interactive steps. */
export interface SetupConfig {
	/** Absolute path to the project root. */
	projectDir: string

	/** Whether this is a post-clone setup (project already exists). */
	postClone: boolean

	/** LLM provider. */
	provider: string
	providerModel: string
	providerApiKey: string

	/** Optional secondary API keys. */
	perplexityApiKey?: string
	geminiApiKey?: string

	/** Local model configuration (mutually exclusive with cloud provider). */
	localModel?: {
		url: string
		id: string
		name?: string
		apiKey: string
		contextWindow: string
		maxTokens: string
	}

	/** Database configuration. */
	db: {
		host: string
		port: string
		name: string
		user: string
		password: string
	}

	/** Sandbox mode. */
	sandboxMode: "local" | "orchestrator"
	sandboxImage?: string

	/** Auth secrets (auto-generated). */
	authSecret: string
	encryptionKey: string

	/** OAuth providers. */
	googleOAuth?: { clientId: string; clientSecret: string }
	githubOAuth?: { clientId: string; clientSecret: string }
}

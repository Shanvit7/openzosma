<div align="center">

<img src="https://raw.githubusercontent.com/zosmaai/openzosma/main/assets/logo.png" alt="OpenZosma" width="300" />

# create-openzosma

**Interactive setup CLI for [OpenZosma](https://github.com/zosmaai/openzosma)**

Go from zero to a running AI agent platform with a single command.

<p>
  <a href="https://www.npmjs.com/package/create-openzosma"><img src="https://img.shields.io/npm/v/create-openzosma?style=flat-square&color=cb3837" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/create-openzosma"><img src="https://img.shields.io/npm/dm/create-openzosma?style=flat-square" alt="npm downloads" /></a>
  <a href="https://github.com/zosmaai/openzosma/blob/main/LICENSE"><img src="https://img.shields.io/github/license/zosmaai/openzosma?style=flat-square&color=blue" alt="License" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22-brightgreen?style=flat-square" alt="Node.js >= 22" />
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
</p>

</div>

---

## What is OpenZosma?

[OpenZosma](https://github.com/zosmaai/openzosma) is an open-source, self-hosted platform for creating hierarchical AI agents that act as digital work twins for your team. You define an agent org chart that mirrors your business structure, delegate tasks through natural conversation, and manage operations from your phone, WhatsApp, Slack, or a web dashboard.

**This package** (`create-openzosma`) is the interactive setup CLI that handles cloning, environment configuration, Docker services, database migrations, and the initial build in one shot -- so you don't have to do any of it manually.

---

## Quick Start

```bash
# Using pnpm (recommended)
pnpm create openzosma

# Using npx
npx create-openzosma
```

That's it. The CLI walks you through every decision interactively -- no flags to memorize, no YAML to edit by hand.

### Already cloned the repo?

Contributors who already cloned the repo can run the setup from the project root:

```bash
pnpm setup
```

The CLI auto-detects whether it's inside an OpenZosma repo and skips the clone step.

---

## What It Does

The setup pipeline runs 12 steps in order:

| # | Step | What happens |
|---|------|-------------|
| 1 | **Prerequisites** | Checks for Node.js 22+, pnpm, Docker, Docker Compose, Git. Warns if OpenShell CLI is missing. |
| 2 | **Project** | Clones the repo into a new directory, or detects an existing checkout. |
| 3 | **LLM Provider** | Pick your provider (Anthropic, OpenAI, Google, etc.) and enter an API key. |
| 4 | **Local Model** | Optional. Configure a local/self-hosted model endpoint (Ollama, vLLM, etc.). |
| 5 | **Database** | PostgreSQL connection details. Defaults to `localhost:5432/openzosma`. |
| 6 | **Sandbox** | Choose local mode (in-process, for development) or orchestrator mode (isolated OpenShell sandboxes, for production). |
| 7 | **Auth** | Auto-generates `BETTER_AUTH_SECRET` and `ENCRYPTION_KEY`. Optionally configure Google/GitHub OAuth. |
| 8 | **.env** | Writes `.env.local` with all collected values. |
| 9 | **Docker** | Starts PostgreSQL (with pgvector), Valkey, and RabbitMQ via `docker compose up -d`. |
| 10 | **Install** | Runs `pnpm install` to install all dependencies. |
| 11 | **Build** | Builds all packages with Turborepo (required before migrations). |
| 12 | **Migrations** | Runs database schema and auth migrations against PostgreSQL. |

At the end, it offers to start the gateway (port 4000) and dashboard (port 3000) for you.

---

## Supported LLM Providers

| Provider | Default Model | Env Variable |
|----------|--------------|-------------|
| Anthropic | Claude Sonnet 4 | `ANTHROPIC_API_KEY` |
| OpenAI | GPT-4o | `OPENAI_API_KEY` |
| Google | Gemini 2.5 Flash | `GEMINI_API_KEY` |
| Groq | Llama 3.3 70B | `GROQ_API_KEY` |
| xAI | Grok 3 | `XAI_API_KEY` |
| Mistral | Mistral Large | `MISTRAL_API_KEY` |
| Local model | Any OpenAI-compatible endpoint | `OPENZOSMA_LOCAL_MODEL_URL` |

---

## Execution Modes

| Mode | Description | Use case |
|------|-------------|----------|
| **Local** | pi-agent runs in-process inside the gateway. No container isolation. | Development, testing |
| **Orchestrator** | Each user gets a persistent [OpenShell](https://github.com/NVIDIA/OpenShell) sandbox with Landlock + seccomp isolation. | Production deployments |

The orchestrator mode requires the OpenShell CLI. If it's not found during prerequisites, the CLI offers to install it for you.

---

## Requirements

| Tool | Version | Required |
|------|---------|----------|
| Node.js | >= 22 | Yes |
| pnpm | Latest | Yes |
| Docker | Latest | Yes |
| Docker Compose | Latest | Yes |
| Git | Any | Yes |
| OpenShell CLI | Latest | Only for orchestrator sandbox mode |

---

## What Gets Created

After the CLI finishes, your project directory will contain:

```
openzosma/
  .env.local              Environment configuration (API keys, DB, auth secrets)
  apps/
    web/                  Next.js dashboard (port 3000)
  packages/
    gateway/              API gateway (port 4000)
    orchestrator/         Sandbox lifecycle management
    db/                   Database migrations and queries
    auth/                 Better Auth setup
    ...                   Other packages
```

Open <http://localhost:3000>, sign up, and start a conversation with your first agent.

---

## Troubleshooting

**Docker not running:** The CLI checks for Docker during prerequisites. Make sure the Docker daemon is started before running the CLI.

**Port conflicts:** The gateway defaults to port 4000 and the dashboard to port 3000. If these ports are in use, stop the conflicting processes or change the ports in `.env.local`.

**Build failures:** If the build step fails, ensure you have Node.js 22+ installed. Run `node --version` to check. The build requires Turborepo which is included as a dev dependency.

**Migration errors:** Migrations require PostgreSQL to be running and accessible. The Docker step starts PostgreSQL automatically. If you're using an external database, verify the connection details in `.env.local`.

---

## Related

- **[OpenZosma](https://github.com/zosmaai/openzosma)** -- The full platform repository
- **[Architecture](https://github.com/zosmaai/openzosma/blob/main/ARCHITECTURE.md)** -- System design and component details
- **[Contributing](https://github.com/zosmaai/openzosma/blob/main/CONTRIBUTING.md)** -- Development setup and conventions

---

## License

[Apache-2.0](https://github.com/zosmaai/openzosma/blob/main/LICENSE)

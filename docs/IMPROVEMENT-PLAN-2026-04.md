# OpenZosma Improvement Plan — April 2026

> **Status:** Draft  
> **Context:** Strategic rethink after building 20K+ lines of code. What to keep, what to kill, and where to go.

---

## 1. Honest Assessment of Current State

### What We Built (20,716 lines of TypeScript)

| Component                               | Lines  | What It Does                                                 | Verdict                                               |
| --------------------------------------- | ------ | ------------------------------------------------------------ | ----------------------------------------------------- |
| `apps/web/`                             | ~4,000 | Next.js dashboard with auth, chat UI, agent wizard, settings | **Built a SaaS UI nobody asked for**                  |
| `packages/gateway/`                     | ~2,500 | Hono REST + WebSocket + A2A server, session routing          | **Unnecessary abstraction for Discord-first UX**      |
| `packages/orchestrator/`                | ~3,000 | OpenShell sandbox lifecycle, HTTP/SSE proxying               | **Solid engineering but overkill for v1**             |
| `packages/db/`                          | ~1,500 | PostgreSQL migrations, queries, 10+ tables                   | **Database empire for a stateless bot**               |
| `packages/auth/`                        | ~1,000 | Better Auth with OAuth, email/password, RBAC                 | **Discord handles identity; we don't need this**      |
| `packages/sandbox/` + `sandbox-server/` | ~1,500 | OpenShell CLI wrapper, Hono server inside sandbox            | **Useful for enterprise isolation, not MVP**          |
| `packages/a2a/`                         | ~800   | gRPC stubs, agent cards, executor (unused at runtime)        | **Aspirational — not used in production**             |
| `packages/agents/`                      | ~350   | Pi agent wrapper with memory bridge, event translation       | **The real gem — keep this**                          |
| `packages/pi-harness/`                  | ~500   | Headless pi HTTP/SSE server                                  | **Clean, focused — keep this pattern**                |
| `packages/skills/reports/`              | ~1,200 | PDF, PPTX, XLSX, chart.js renderers                          | **YAGNI — nobody asked a Discord bot for PowerPoint** |
| `packages/integrations/`                | ~400   | Database connectors, encryption                              | **Unused**                                            |
| `packages/zosma-mem/`                   | ~1,000 | Custom memory with GC, decay, consolidation                  | **Competes with pi's native memory**                  |
| `proto/`, `infra/`, `charts/`           | ~1,500 | K8s manifests, Dockerfiles, gRPC definitions                 | **K8s overkill for v1**                               |

### The Core Problem

**We built a web-based SaaS platform (dashboard, auth, billing-ready database, K8s orchestration) when what we actually want is:**

> A Discord-first fleet of employee AI twins. Each twin is a long-living pi-coding-agent that evolves with its human, keeps files separate, and can talk to other twins.

That is maybe **2,000 lines** of actual code. Not 20,000.

### Bugs Found During Audit

1. **`sandbox-manager.ts` — `.env` never actually injected**: `buildSandboxEnv()` constructs the env dict but never calls `openshell.injectEnv()`. The `log.info(".env injected successfully")` fires before injection. Sandboxes start without API keys.
2. **`gateway/session-manager.ts` — Race condition hack**: `setTimeout(() => releaseLock!(), 100)` prays the extension loader reads `PI_MEMORY_DIR` within 100ms instead of properly sequencing.
3. **Only 13 TODO/FIXMEs across 20,000 lines** — credit where due: the code is disciplined. But disciplined bloat is still bloat.

---

## 2. The Vision: Employee Twins

### What Is an Employee Twin?

An employee twin is not a chatbot. It is:

- A **long-living agent** that learns about its human over time
- Has **isolated disk space** — files, memory, config, history
- Can **talk to other twins** on behalf of its human
- Is **reachable via Discord** (or Slack, WhatsApp) as `@alice-twin`
- **Evolves** — skills added, memory compounds, behavior adapts

### Two Deployment Modes

#### Mode A: Enterprise (Isolated Sandboxes)

For companies where security and isolation matter:

- Each twin runs in an **OpenShell sandbox** (Landlock + seccomp)
- Completely isolated filesystem, network, process space
- **This is what the current orchestrator does** — keep it, but make it optional
- Twins talk via internal HTTP mesh (not A2A — overkill for same-host)

#### Mode B: Small Team / Individual (Process Isolation)

For startups, small teams, and individual users:

- Each twin = **one Node.js process** with its own `--cwd`
- Different home directory per twin (`~/.openzosma/twins/alice/`)
- OS-level process isolation is enough
- Same Discord bot handles **multiple user profiles** via session switching
- No OpenShell, no PostgreSQL, no auth system

### Individual User Profiles (Discord Multi-Tenancy)

For small deployments, a single Discord bot can serve multiple users:

```
User A DMs @openzosma-bot: "deploy my API"
→ Bot loads User A's profile (from `~/.openzosma/users/alice/`)
→ Creates session in User A's workspace
→ Responds as User A's context

User B DMs same bot: "review my PR"
→ Bot loads User B's profile
→ Completely separate session, workspace, memory
```

This is the **pi-messenger-bridge pattern** but with per-user CWD isolation instead of one shared workspace.

---

## 3. The Auth-Less Admin Dashboard

### Why No Auth?

The dashboard is not a user-facing product. It is an **admin tool** for managing the twin fleet — like Paperclip or the Hermes admin panel.

- Runs on `localhost` or behind a VPN
- No login, no OAuth, no password reset flows
- Just a simple UI for:
  - Viewing twin status (running/stopped)
  - Reading twin logs
  - Editing twin config files
  - Restarting twins
  - Viewing file trees per twin

### Dashboard Features

```
┌─────────────────────────────────────────┐
│  OpenZosma Admin                        │
├─────────────────────────────────────────┤
│  Twins:  [alice] [bob] [sre-team]       │
│                                         │
│  alice-twin        ● running            │
│  ───────────────                        │
│  Status:    Online                      │
│  Memory:    87MB                        │
│  Uptime:    3d 4h                       │
│  Workspace: ~/.openzosma/twins/alice/   │
│                                         │
│  [View Files] [View Logs] [Restart]     │
│  [Edit Config] [Shell]                  │
│                                         │
│  Recent Activity:                       │
│  - Deployed to staging (2m ago)         │
│  - Talked to sre-twin about oncall      │
│                                         │
└─────────────────────────────────────────┘
```

Built as a **tiny static HTML + JS** served by the main process, or a separate lightweight server. No Next.js, no React SSR, no database.

---

## 4. Architecture: The Rethink

### New Project Structure (on a `slim` branch)

```
openzosma/                      # same repo, slim branch
├── twins/                      # Twin configs
│   ├── alice.yaml
│   ├── bob.yaml
│   └── sre-team.yaml
├── packages/
│   ├── twin-core/              # Pi agent wrapper (from agents/)
│   ├── twin-server/            # Headless HTTP/SSE server (from pi-harness/)
│   ├── discord-router/         # Discord bot + message routing
│   └── twin-mesh/              # Inter-twin HTTP communication
├── skills/                     # Company-specific skills
│   ├── deploy-to-staging/
│   └── security-audit/
├── admin/                      # Static admin dashboard
│   ├── index.html
│   └── app.js
├── bin/
│   └── openzosma               # CLI: manage the twin fleet
├── package.json
└── docker-compose.yml          # Optional: for enterprise sandbox mode
```

### What Stays

| Component                 | Source                                | Why                                                |
| ------------------------- | ------------------------------------- | -------------------------------------------------- |
| `PiAgentSession` wrapper  | `packages/agents/src/pi.agent.ts`     | Core agent logic, memory bridge, event translation |
| `pi-harness` pattern      | `packages/pi-harness/`                | Headless HTTP/SSE server for tool access           |
| Discord transport         | `pi-messenger-bridge` (external fork) | Already works, just needs per-user session routing |
| OpenShell sandbox manager | `packages/orchestrator/` (reference)  | Salvage for enterprise mode later                  |

### What Goes

| Component                                 | Why Delete                    |
| ----------------------------------------- | ----------------------------- |
| `apps/web/` (Next.js dashboard)           | Admin dashboard replaces it   |
| `packages/db/` (PostgreSQL)               | JSON files per twin           |
| `packages/auth/` (Better Auth)            | No auth needed                |
| `packages/gateway/` (Hono REST/WebSocket) | Discord is the gateway        |
| `packages/a2a/` (gRPC/A2A)                | HTTP mesh for same-host twins |
| `packages/skills/reports/`                | YAGNI                         |
| `packages/integrations/`                  | YAGNI                         |
| `packages/zosma-mem/`                     | Use pi's native memory        |
| `proto/`, `infra/k8s/`, `charts/`         | Not needed for v1             |

---

## 5. Inter-Twin Communication

### Same-Host HTTP Mesh (Not A2A)

A2A is designed for cross-network, cross-org agent negotiation. For twins on the same server:

```
# Each twin exposes
POST http://localhost:<twin-port>/internal/ask
Body: { "from": "alice", "question": "..." }
Response: SSE stream of answer
```

**Discovery:**

```
~/.openzosma/registry/
├── alice.json      # { "port": 8081, "capabilities": ["terraform"] }
├── bob.json        # { "port": 8082, "capabilities": ["react"] }
└── sre-team.json   # { "port": 8083, "capabilities": ["kubernetes"] }
```

A 50-line file watcher loads these into memory. No protobuf, no JSON-RPC, no agent cards.

### Example Twin-to-Twin Flow

```
User asks @alice-twin: "What's the status of the ML pipeline?"

[alice-twin]: I don't own that. Let me check with @ml-twin...
  → alice POSTs to ml-twin's /internal/ask
  → ml-twin responds: "Training epoch 47/100, ETA 2h"
  → alice reports back to user: "ml-twin says pipeline training, ETA 2h"

User sees: Single coherent response from alice-twin
Behind scenes: HTTP request between local processes
```

---

## 6. Discord UX

### Enterprise Mode (One Bot Per Twin)

```
# In #engineering channel
@alice-twin deploy the API to staging
@alice-twin ask sre-team about the oncall rotation
@alice-twin create a terraform module for the new VPC

# Alice can also talk to Bob directly
@alice-twin ask bob about the frontend auth flow
  → alice sends HTTP to bob's port
  → bob answers
  → alice summarizes to user
```

### Small Team Mode (One Bot, Multiple Profiles)

```
# User A DMs @openzosma-bot
> deploy my API
< Routing as User A... >
[alice]: Deployed to staging ✅

# User B DMs same bot
> review my PR
< Routing as User B... >
[bob]: PR looks good, one comment about error handling...

# In shared channel
@openzosma-bot @alice deploy to staging
→ Bot checks who mentioned, routes to alice's profile
```

---

## 7. The `openzosma` CLI

```bash
# Initialize the platform
openzosma init

# Create a new twin
openzosma twin create alice
# → Interactive wizard: role, skills, model, Discord token
# → Generates twins/alice.yaml

# Start the fleet
openzosma up
# → Reads twins/*.yaml
# → Spawns process per twin
# → Each twin connects its own Discord bot

# Start in small-team mode (one bot, multi-user)
openzosma up --shared-bot

# Admin dashboard
openzosma dashboard
# → Opens http://localhost:3000

# View twin logs
openzosma logs alice

# Restart a twin
openzosma restart alice

# Twin-to-tiny health check
openzosma status
# alice:  ● running  (87MB)  uptime: 3d
# bob:    ● running  (92MB)  uptime: 3d
# sre:    ○ stopped            (crashed 10m ago)
```

---

## 8. Migration Plan

### Phase 1: Create `slim` Branch

1. Branch from `main` → `slim`
2. Delete everything in the "What Goes" list above
3. Extract `PiAgentSession` into `packages/twin-core/`
4. Extract `pi-harness` into `packages/twin-server/`
5. Port Discord transport from `pi-messenger-bridge`

### Phase 2: Minimal Discord Fleet

1. `twins/*.yaml` config format
2. `openzosma up` spawns N processes
3. Each process = one Discord bot
4. Basic admin dashboard (static HTML)

### Phase 3: Inter-Twin Mesh

1. Registry file format
2. `ask_twin()` tool in each twin
3. HTTP mesh between local processes

### Phase 4: Enterprise Sandbox Mode (Optional)

1. Re-introduce OpenShell orchestrator
2. Make it a config flag: `mode: sandbox` vs `mode: process`
3. Same Discord UX, different isolation

---

## 9. Open Questions

1. **Memory strategy:** Use pi's native `context.jsonl` + observational-memory, or keep `zosma-mem` bridge?
2. **Skill packaging:** How do skills get installed into a twin? npm package? Git clone? Directory copy?
3. **Dashboard technology:** Pure HTML/JS, or lightweight framework (Preact, HTMX)?
4. **File sync:** How do twins share files when needed? Read-only mount? Copy-on-write?

---

## 10. Why This Rethink?

The original OpenZosma was built as a **platform play** — web dashboard, auth, K8s, enterprise sandboxing, SaaS-ready. That is a valid product, but it is **not the product we described**.

What we actually want:

- Discord-first (not web-first)
- Employee twins (not generic agents)
- Long-living, evolving agents (not stateless sessions)
- Auth-less admin (not user auth)
- Process isolation for small teams (not mandatory K8s)

This plan simplifies 20,000 lines into ~2,000. The deleted code is not bad — it is **wrong for this product**.

---

_Document written after deep code audit. All assessments are honest, not performative._

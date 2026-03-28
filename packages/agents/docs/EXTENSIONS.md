# Agents Extension Setup

This package integrates Pi extensions into `@openzosma/agents` so the runtime can use:

- `pi-subagents` (`subagent`, `subagent_status`)
- `pi-web-access` (`web_search`, `fetch_content`, `get_search_content`)
- `@aliou/pi-guardrails` (file-access policies + dangerous-command permission gate)
- `pi-memory` + `pi-extension-observational-memory` (cross-session agent memory)

## How extensions are loaded

Extensions are installed into the Docker image at build time via `pi install`. Once installed,
`DefaultResourceLoader` auto-discovers them from `~/.pi/agent/settings.json` — no runtime
path resolution or bootstrapping code is needed.

## Extension manifest — `extensions.json`

`packages/agents/extensions.json` lists every extension as a `pi install` specifier:

```json
[
  "npm:pi-web-access@0.10.3",
  "npm:pi-subagents@0.11.6",
  "npm:@aliou/pi-guardrails@0.9.5",
  "npm:pi-memory@0.3.6",
  "npm:pi-extension-observational-memory@0.1.3"
]
```

During the Docker build, `infra/openshell/scripts/install-extensions.mjs` reads this file and
runs `pi install` for each entry as the `sandbox` user, writing the result to
`~/.pi/agent/settings.json` inside the image.

To add or upgrade an extension: edit `extensions.json` and rebuild the image. Pin a version
with `@x.y.z`; omit the version for latest.

## Static config — `src/pi/.config/`

Extension config files live in `src/pi/.config/`, which mirrors the `~/.pi/` directory
structure exactly. The Dockerfile copies this entire tree into `/home/sandbox/.pi/` at build
time:

```
src/pi/.config/
├── web-search.json                        → ~/.pi/web-search.json
└── agent/
    ├── agents/
    │   └── engineering-lead.md            → ~/.pi/agent/agents/engineering-lead.md
    └── extensions/
        ├── guardrails.json                → ~/.pi/agent/extensions/guardrails.json
        └── subagent/
            └── config.json               → ~/.pi/agent/extensions/subagent/config.json
```

### `web-search.json`

Controls `pi-web-access` search behaviour. API keys are **not** stored here — the extension
reads `GEMINI_API_KEY` and `PERPLEXITY_API_KEY` directly from environment variables at
runtime, overriding anything in this file.

```json
{ "provider": "auto" }
```

> **Why is this not under `agent/extensions/`?**
> `pi-web-access` has the path `~/.pi/web-search.json` hardcoded internally. It predates the
> `extensions/` convention and was never moved. Placing it under `extensions/` would cause it
> to be silently ignored. *(Verified against `pi-web-access` source, 2026-03-27)*

### `agent/extensions/guardrails.json`

Controls `@aliou/pi-guardrails`. Disabled by default. Set `enabled: true` and add rules under
`policies.rules` to restrict file access or gate dangerous shell commands.

```json
{
  "enabled": false,
  "features": { "policies": false, "permissionGate": false },
  "permissionGate": { "requireConfirmation": false, "explainCommands": false, ... }
}
```

For workspace-level overrides (per-user guardrail rules), drop a `.pi/extensions/guardrails.json`
file inside the workspace directory — pi-guardrails merges it with the global config, with the
workspace file winning on conflicts.

### `agent/extensions/subagent/config.json`

Controls `pi-subagents` runtime behaviour.

```json
{ "asyncByDefault": false }
```

### `agent/agents/*.md`

Subagent definitions — markdown files with YAML frontmatter declaring the agent's name, model,
tools, and system prompt. Drop a new `.md` file here to register an additional subagent.

> **Why are agent definitions not under `agent/extensions/`?**
> `pi-subagents` treats agent definitions as first-class pi resources (alongside skills and
> prompts) and reads them from `~/.pi/agent/agents/` — separate from extension config by
> design. The extension discovers `.md` files there; `agent/extensions/subagent/config.json`
> is only for the extension's own runtime settings (e.g. `asyncByDefault`).
> *(Verified against `pi-subagents` source, 2026-03-27)*

#### Config path reference

The locations below are all hardcoded by the respective extension authors — they are not our
design choices. If any path stops working after a package upgrade, diff the extension source
against the paths listed here. *(Last verified 2026-03-27)*

| File | Read by | Hardcoded path |
|---|---|---|
| `web-search.json` | `pi-web-access` | `~/.pi/web-search.json` |
| `agent/agents/*.md` | `pi-subagents` | `~/.pi/agent/agents/` |
| `agent/extensions/guardrails.json` | `@aliou/pi-guardrails` | `~/.pi/agent/extensions/guardrails.json` |
| `agent/extensions/subagent/config.json` | `pi-subagents` | `~/.pi/agent/extensions/subagent/config.json` |

## Memory

Memory extensions (`pi-memory`, `pi-extension-observational-memory`) are installed via
`extensions.json` like all other extensions. Their config is environment-variable-driven:

- `PI_MEMORY_DIR` — where memories are stored (defaults to `<workspaceDir>/.pi/agent/memory`)
- `PI_MEMORY_QMD_UPDATE` — update mode: `background | manual | off`
- `PI_MEMORY_NO_SEARCH` — set to `1` to disable selective memory injection

These are applied at session start by `bootstrapMemory()` in `@openzosma/memory`.

## Notes on tools and system prompt

- Built-in tool selection is in `src/pi/tools.ts` and respects `toolsEnabled`.
- Extension tools are loaded automatically by `DefaultResourceLoader` and are available in the session.
- System prompt comes from `opts.systemPrompt` or falls back to `DEFAULT_SYSTEM_PROMPT`.

## Local verification

1. Run `pi install` for each entry in `extensions.json` on your local machine.
2. Copy `src/pi/.config/` contents into `~/.pi/` (or let the sandbox image do it).
3. Start the gateway/agent service.
4. Send a prompt that should trigger delegation or search:
   - "Use subagents to analyze the auth flow and propose a plan."
   - "Research X using web_search and summarize findings."
5. Confirm stream events include tool calls: `subagent`, `web_search`, `fetch_content`.
6. To verify guardrails, enable them in `guardrails.json`, then ask the agent to read a `.env`
   file — it should be blocked.

## Troubleshooting

- Extensions not available → check that `extensions.json` entries were installed (`pi list`).
- Extension load errors → logged from `src/pi.agent.ts` (`extensionsResult.errors`).
- Web search limited results → check `GEMINI_API_KEY` / `PERPLEXITY_API_KEY` env vars.
- Guardrails not intercepting → confirm `enabled: true` in `guardrails.json`.
- Memory not persisting → check `PI_MEMORY_DIR` is writable and consistent across sessions.

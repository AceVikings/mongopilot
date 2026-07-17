# Mongo Pilot

Mongo Pilot is an Electron desktop workspace for MongoDB with an embedded OpenCode copilot. This repository currently contains the first UI and architecture pass.

## Current Scope

- Save MongoDB connection strings encrypted through Electron `safeStorage`
- Connect with the official MongoDB Node.js driver
- List databases and collections
- Load collections automatically with bounded, paginated `find` queries
- Run bounded read-only Extended JSON aggregation pipelines with live results
- Infer nested field presence and exact BSON types from bounded collection samples
- List live collection index definitions, key directions, and index options
- Generate live collection reports from counts, schema findings, and index metadata
- Persist page-size and Extended JSON sort defaults per collection
- Let users attempt direct edits while independently enforcing read or read/write access for the agent
- Start a bundled OpenCode loopback server through `@opencode-ai/sdk/v2`
- Create OpenCode sessions and send workspace-aware prompts
- Expose authenticated MongoDB MCP tools to OpenCode based on the selected agent access mode
- Permit only read tools in agent read mode and both read and bounded mutation tools in agent read/write mode
- Check for releases, download updates, and restart into an installed update from inside the app

The first agent tool set includes database and collection discovery, bounded finds, bounded aggregations, counts, and single-document inserts, updates, and deletes. Bulk mutations and report-file exports are not implemented yet.

## Development

```bash
npm install
npm run dev
```

If the host environment sets `ELECTRON_RUN_AS_NODE=1`, launch with:

```bash
env -u ELECTRON_RUN_AS_NODE npm run dev
```

Build checks:

```bash
npm run typecheck
npm run lint
npm run build
```

Pushes to `main` create a uniquely versioned GitHub release with macOS, Windows, and Linux installers plus the manifests and blockmaps consumed by `electron-updater`.

## Security Boundaries

- The renderer has no Node.js integration and receives only explicit IPC methods.
- MongoDB parsing, sorting, counting, pagination, cursor execution, and serialization run in Electron's main process; the renderer receives only one bounded result page.
- Connection URIs are never returned to the renderer after saving.
- Explicit connection-string copy requests are handled in the main process and write directly to the operating system clipboard.
- Agent access modes only control OpenCode tools. Direct user actions are always attempted, with MongoDB roles remaining authoritative.
- OpenCode tools default to denied; web access requires approval.
- MongoDB MCP requests require an app-generated bearer token and a short-lived active connection grant.
- Agent permissions are enforced both in OpenCode tool exposure and inside each MongoDB operation.
- Decrypted MongoDB connection strings remain inside the Electron main process and are never sent to OpenCode or the MCP server.
- OpenCode agents are not sandboxes. Use OS/container isolation for untrusted workloads.
- The renderer can request update operations, but release discovery, download, and installation run in Electron's main process.

## Documentation Sources

- [OpenCode SDK](https://opencode.ai/docs/sdk/)
- [OpenCode server](https://opencode.ai/docs/server/)
- [OpenCode permissions](https://opencode.ai/docs/permissions/)
- [OpenCode security policy](https://github.com/anomalyco/opencode/blob/v1.18.2/SECURITY.md)
- [MongoDB Compass connections](https://www.mongodb.com/docs/compass/current/connect/connections/)
- [MongoDB connection strings](https://www.mongodb.com/docs/manual/reference/connection-string/)
- [Electron security](https://www.electronjs.org/docs/latest/tutorial/security)

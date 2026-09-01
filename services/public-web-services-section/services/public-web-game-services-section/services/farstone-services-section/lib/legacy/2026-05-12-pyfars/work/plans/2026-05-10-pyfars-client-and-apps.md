---
kind: plan
date: 2026-05-10
---

# PyFARS: finish client/, then rebuild apps as engine clients

The +wired commit landed `kernel/`, `sdk/`, `engine/`, a working `client/uds.py`, and stubbed-out `apps/web/` + `apps/mcp/`.
This plan finishes `client/` (which is mislabeled — only `uds.py` is actually a client of the engine) and then rebuilds `apps/` as actual clients of the engine's UDS surface.

## Premise

- `client/uds.py` (95 lines) — DONE.
  HTTP-over-UDS wire client.
- `client/session.py` (284 lines) — local JSON sidecar save/resume.
  Talks to `EventLog` directly, doesn't use UDS.
  Belongs in `sdk/`.
- `client/federation.py` (623 lines) — defines a whole `FederationSubstrate`, registers five operator kinds, implements CRDT merge math.
  Substrate algebra, not a client.
  May duplicate kernel / pypredcalc functionality — needs audit before splitting.

`apps/` are clients of the engine UDS:

- `apps/cli/run.py` — boots the engine.
  Not a client (entry-point).
- `apps/cli/query.py` — engine client via `client.uds`.
  DONE.
- `apps/mcp/` — FastMCP server proxying UDS.
  Mid-rewrite.
- `apps/web/` — FastAPI server proxying UDS.
  Mid-rewrite.
- `apps/auth/` — OAuth server used by web + mcp.
  Imports unaudited.
- `apps/ledger.py` (896 lines) — captain accounting.
  Probably has polity-specific hardcoded constants that should be parameters or substrate cells.

## Decisions (locked in conversation 2026-05-10)

1. **session.py → sdk/.** Strip `EventLog` coupling; optionally wire to `client.uds.post_witness` for session-lifecycle audit events.
2. **federation.py: audit before splitting.** May be doing bespoke work the kernel or pypredcalc already covers.
  If so, decruft.
  Otherwise split: math → kernel, envelope wire+operators → engine, peer transport (HTTP-over-network for inter-engine) → client.
3. **App order: mcp → web → auth.** MCP is the agent surface; external agents driving the polity is the prime use case.
  Web is a debugging view of the same cells.
  Auth gates both, but layers on top — don't block visible progress on it.
4. **ledger.py: audit, decruft, possibly move to polity.** Read it first to see what's actually in there before deciding.

## Phases

### Phase A: client/

A1. Move `client/session.py` → `sdk/session.py`. Drop the `EventLog`
    dataclass coupling; if session-lifecycle audit is wanted, post
    a witness via `client.uds.post_witness` (sdk imports client — OK
    if direction is sdk → client, which means client must NOT import
    sdk; verify cycle-free).

    Open: does `sdk → client` violate the layering? `client` is
    HTTP-wire; `sdk` is Pydantic ergonomics. Probably fine. If the
    cycle bites, leave session.py in `client/` and just trim the
    EventLog reference.

A2. Audit `client/federation.py`. Read end-to-end. Tag every place
    it reimplements something `kernel/` or `pypredcalc` already
    does. File a friction report if the duplication is bad. Output:
    a short doc that says either "delete and re-wire to kernel
    primitives" or "split into kernel-math + engine-wire + client-
    transport, here's the split."

A3. Apply A2's decision. Either delete-and-rewire or split-three-
    ways. Mid-flight outcome may be different from initial plan —
    that's why A2 is its own task.

### Phase B: apps/mcp (the agent surface)

B1. Read `apps/mcp/tools.py` end-to-end. List every `pyfars.api.*`
    call. For each, decide: (a) maps directly to `client.uds.*`,
    (b) needs a new engine route, (c) drop entirely (was pre-
    substrate cruft).

B2. Rewrite `apps/mcp/tools.py` so every tool is a thin wrapper
    around `client.uds.*`. Any tool needing a new engine route
    goes on the "engine routes to add" list, doesn't block the
    rest of the rewrite.

B3. Verify `apps/mcp/server.py` boots: import FastMCP, register
    tools, build the ASGI app. Smoke-test against a running engine
    on an example polity.

### Phase C: apps/web

C1. Read `apps/web/app.py` (949 lines) and list every dead import
    (deleted `pyfars.api`, `pyfars.cli`, deleted engine submodules).

C2. Rewrite `apps/web/app.py` as a thin FastAPI app whose routes
    proxy `client.uds.*`. Strip the verb/skill/harness discovery
    UI — those came from deleted `pyfars.cli`. The browser UI
    becomes "show cells / events / value for a subject."

C3.
Smoke-test web UI against the running engine.

### Phase D: apps/auth

D1. Read every file under `apps/auth/`. List imports and exposed
    surface (FastAPI routers, OAuth flows, MCP token gates).

D2. Verify it still composes with the rewritten apps/web (D as a
    router) and apps/mcp (D's `mcp_provider` as a bearer-token gate
    in front of the MCP ASGI app).

D3. If anything is broken by the kernel/sdk reshuffle, fix
    imports; otherwise leave as-is.

### Phase E: apps/ledger.py

E1. Read end-to-end. Catalogue: hardcoded paths, hardcoded slug
    constants, polity-specific math (chart-of-accounts shape,
    captain-private flows).

E2. Decide: extract hardcoded values to parameters / substrate
    cells and keep in pyfars, OR move the whole thing to 561's
    polity tree.

## Done means

- `pyfars run /polity` boots the engine
- `pyfars query <subject>` returns cells
- An external MCP client (e.g. Claude.ai) can list/show records through `apps/mcp`
- A browser can hit `apps/web` and see substrate cells
- `client/` contains only things that actually client an engine
- No file under `apps/` imports a deleted module

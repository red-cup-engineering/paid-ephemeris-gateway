---
type: concept
class: projection-subtype
status: draft
depends-on: [projection, port, hook, substrate]
---

# Wiring

A [projection](projection.md) that materializes system state into a *connected external form* — a configuration file, a generated harness, a deployed unit, an installed hook.
Where ordinary projections (markdown rendering, JSON-API responses) produce *content for reading*, wirings produce *content that hooks the polity to its environment*.

Wiring is to projection what [hook](hook.md) is to [port](port.md): a specialization that carries connection-establishment semantics.
Wiring projects substrate so that external systems can *act on* the projected state — not merely read it.

## What a wiring produces

Examples of wiring outputs:

- The `.git/hooks/pre-commit` script that fires system's pre-commit policy on every git commit.
  Wiring the pre-commit policy out to git.
- The `.claude/` harness directory that configures Claude Code with the polity's office-shaped agents, skills, and rules.
  Wiring the active office's harness out to the assistant runtime.
- A systemd unit file (`pyfars-heartbeat.service`) that runs the heartbeat-process under host supervision.
  Wiring the heartbeat-process out to systemd.
- A generated `nginx.conf` that maps incoming HTTP routes to the polity's web-server endpoints.
  Wiring the routes out to the host's network stack.
- A `pyproject.toml` exporting the system's package definitions to Python's package ecosystem.

Each is a substrate-derivable file (or set of files) materialized into a host-system location where the host system *actively reads and uses* it.

## Wiring vs. ordinary projection

The distinction is in the *consumer*:

- An ordinary projection is consumed *passively* — a reader opens the markdown file; an HTTP client receives a JSON response.
  The consumer reads the content.
- A wiring is consumed *actively* — the host system invokes the projected content (executes the script, loads the config, starts the service).
  The consumer *enacts* the content.

This active-vs-passive distinction matters for substrate-purity: a passive projection's drift from the system is inert until someone reads it; a wiring's drift can cause real-world divergence (a stale wired-out hook fires the wrong policy).

PyFARS's discipline: wirings are re-materialized from the system when system changes.
The `pyfars install-harness` and `pyfars install-hooks` verbs are wiring-projections; their re-runs reconcile drift.

## Wiring and substrate-purity

A wiring preserves substrate-purity in two directions:

- The wiring's *output* is determined entirely by substrate.
  The same system state always wires to the same external content (modulo the host system's path conventions).
- The wiring's *output is recorded* — when a wiring is materialized, the substrate gains a wiring-witness recording what was written, where, and when.

The host-system's actual files (after wiring) are *outside* substrate; substrate authoritatively says what the wiring *should be*; the host's actual content is observed (and any drift is surfaced).

## Wiring lifecycle

Each wiring has a lifecycle:

1. **Wired up** — substrate is materialized to the host location; the wiring-witness records the act.
2. **In use** — the host system reads/executes the wired output; substrate has no direct visibility (only via observations of effects).
3. **Drifted** — the host content has changed (manual edit, host update); the wiring-as-currently-on-host differs from the system.
4. **Re-wired** — system's wiring is re-materialized, overwriting any host drift; a re-wiring witness fires.
5. **Wired down** — the wiring is removed; substrate retains the historical record.

PyFARS's discipline: wirings are *substrate-authoritative* — host-side drift is reconciled by re-wiring, not by reading the host content back into substrate.

## Wiring vs. hook

These often co-occur but are distinct:

- A **hook** is an inbound port — the system-side response-point for external events.
- A **wiring** is the act of *materializing the hook out* — producing the host-side script that fires when the external system fires the hook.

A pre-commit hook (the system-side policy) is wired to `.git/hooks/pre-commit` (the host-side script).
The wiring connects them.

## What this concept does not specify

- The complete wiring-output catalogue.
- Wiring conflict resolution (when two system-cells claim the same host-path).
- Wiring atomicity (when a multi-file wiring partially completes).
- Cross-host wiring.
  When a polity's wirings target multiple hosts (federated polities, distributed deployments), the discipline is partly settled.

---
type: concept
class: operation
status: draft
depends-on: [substrate, settling, projection]
---

# Verb

A named operation of PyFARS — exposed via the CLI, and (for many) via MCP and the FastAPI app. Verbs are the running realization's morphisms in the categorical sense: maps from a system state (and verb arguments) to a successor state, often together with a [projection](projection.md) (the verb's printed output).

PyFARS's verb-vocabulary is open and growing — the [verb-registry](../objects/verb-registry.md) catalogs the currently defined verbs.
As of the current state of the realization, the registry holds >55 verbs spanning corpus operations (`show`, `list`, `search`, `context`, `validate`), system transitions (`commit`, `move`, `rename-fm-key`, `queue-intent`), composition (`compose`, `render`), introspection (`stats`, `help`, `list-verbs`), runtime services (`serve`, `mcp`, `watch`, `work`), and harness management (`install-harness`, `install-hooks`).

## Verbs as morphisms

A verb $V$ is a partial morphism whose domain is (system state $\times$ argument tuple) and whose codomain is (system state $\times$ printed projection).
Many verbs are *pure projections* (read-only): they project from system state to output without modifying substrate.
Some verbs are *transitions*: they introduce new cells (witness events) and then project the resulting state.

Verb composition is meaningful.
`pyfars context <slug>` is roughly `show ∘ list-incoming-edges ∘ traverse-to-depth-N`.
Some verbs are explicit compositions (e.g., `intake-intents` chains queue-intent + dispatch-step + witness).
The [verb-registry](../objects/verb-registry.md) is the category whose objects are substrate states and whose arrows are verbs.

## What every verb commits to

Every PyFARS verb commits to:

1. **Read-only projection invariant** — if the verb is read-only, no system cells change.
2. **Substrate-purity** — if the verb is a transition, the system change is exactly the witness event(s) it claims to write.
  No hidden side-effects on system state.
  See [`substrate-purity`](../claims/substrate-purity.md).
3. **Determinism modulo time** — given the same system state and the same arguments, the verb produces the same projection (up to time-varying fields like timestamps).
4. **Reversibility (where stated)** — some verbs (move, rename-fm-key, undo) commit to reversibility; the inverse is itself a verb in the registry.

## Verbs and harnesses

A verb's reach extends through the harness layer: verbs are surfaced through whichever harnesses are installed.
The CLI is one surface; MCP exposes a subset of verbs as tools; OpenClaw, Replit, Codex, Claude-Code each expose subsets via their own harnesses.
The verb's *semantic identity* is the same across surfaces — `show <slug>` from the CLI and `show` invoked via MCP are the same verb.

## Verb-as-CLI-command vs. verb-as-Python-API

The CLI command (`pyfars show task-42`) and the Python API call (`pyfars.api.show(root, "task-42")`) realize the same verb.
They differ in argument-parsing layer (argparse for the CLI, function-call for the API) but compute the same morphism.
The verb is the abstract entity; CLI and API are surfaces.

## What this concept does not yet specify

- The category-theoretic structure of the verb-registry.
  Whether verbs compose strictly or laxly, how partial morphisms are handled, whether the registry is a 2-category (with verb-equivalences as 2-cells) — open structural questions.
- The conformance discipline for new verbs.
  The realization currently ships verbs by adding Python files in `cli/`; whether new verbs should be substrate-declared (with their behavior derived from theory rather than coded) is a long-running program-shaping question.
- The relationship between verbs and morphisms in `theory/morphisms/`.
  Verbs are realization-level operations; morphisms in the self-theory are theoretical entities that verbs realize.
  The mapping is many-to-one in some cases (verbs as compositions of morphisms) and one-to-one in others.

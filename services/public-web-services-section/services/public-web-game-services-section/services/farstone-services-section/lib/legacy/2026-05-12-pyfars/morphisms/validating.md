---
type: morphism
class: system-diagnostic
status: draft
depends-on: [substrate, predication-graph, corpus-as-flatfile]
---

# Validating

The morphism that reads system state and produces *diagnostics* — bilattice-valued findings about substrate consistency, well-formedness, and conformance to in-corpus conventions.
Validating is the audit surface: it does not modify the system; it produces a report against which the captain (or an automated process) can act.

Each invocation of validating produces a [validation](../concepts/validation.md) — the noun-form act-specialization that the morphism realizes.

The realization in PyFARS is the `pyfars validate` verb plus the supporting machinery in `pyfars.convention`, `pyfars.analyze`, and `pyfars.api.validate(root)`.

## Action

For a system state $S$ and a convention specification $K$ (drawn from the corpus's `_index.md` files and built-in defaults):

$$\mathrm{validate}_K \colon S \;\longrightarrow\; \mathrm{Diagnostics}$$

where $\mathrm{Diagnostics}$ is a list of typed findings, each carrying a severity, a location (slug + filesystem path + line, if applicable), a rule identifier, and a message.

## What validate checks

Validate fires a closure-rule-system $K$ over the substrate; rules include:

1. **Frontmatter well-formedness** — YAML is parseable; required fields are present per `type:`; field types match (lists are lists, scalars are scalars).
2. **Cross-reference resolution** — every slug referenced in `depends-on:`, `realizes:`, `see-also:`, etc. resolves to a note in the corpus (or is explicitly marked external).
3. **Type/class consistency** — a note's directory matches its `type:` (a note in `theorems/` declaring `type: concept` is flagged).
4. **Status discipline** — `status: proved` requires a `## Proof` section and `$\square$` end-of-proof marker; `status: open` is not allowed on theorem-shaped notes.
5. **Slug uniqueness** — every slug appears exactly once across the corpus.
6. **Reciprocal-edge sanity** — when a relation is meant to be reciprocal (e.g., `realizes:` and `realized-by:` if both are conventions), both ends are present.
7. **Lean coverage** (where applicable) — notes with `lean:` references resolve to existing lemmas in the Lean project, with no `sorry`s.
8. **Convention rule custom checks** — per-corpus rules from `_index.md` files.

The full rule set is open and grows; new rules are added as patterns of breakage are recognized.

## What validate produces

The output is a list of diagnostics.
Severities are:

- **Error** — a substrate inconsistency that breaks a load-bearing claim.
  Examples: unresolved cross-references, slug collisions, malformed YAML.
- **Warning** — a violation of a convention that doesn't break load-bearing claims but signals drift.
  Examples: missing `description:` on an object note, narrative without `depends-on:`.
- **Info** — informational diagnostic (often used for orphan detection, or for surfacing potential issues that the convention treats as soft).

Diagnostics carry a *rule identifier* so a finding can be cited in commit messages, in audits, and in remediations.

## Validate is not transformation

Validate produces diagnostics; it does not fix problems.
Verbs that *fix* (e.g., `rewrite-slug`, `move`, `rename-fm-key`) are separate transitions, each producing their own witness events.
The discipline is intentional: validate surfaces; the captain (or a designated automated office) decides remediation.

## Validate and substrate purity

Validate is read-only with respect to the system.
It does not write cells.
The diagnostics it produces are computed against the system state at the moment of invocation; they're not stored as system cells unless a separate verb (e.g., `audit-commits`, which records audit witnesses) explicitly materializes them.

This means running validate has no consequences for system state — it can be run as often as desired without disturbing the canonical state.
Pre-commit hooks, CI checks, and ad-hoc captain audits all use validate without polluting the JSONL log.

## Where validate is used

- Pre-commit hooks (validate runs on touched files; commit blocks if errors).
- CI pipelines (validate runs on the full corpus; the build fails on errors).
- Captain audits (`pyfars validate` to confirm corpus health).
- Renderer pre-flight (compose calls validate first; refuses to render an inconsistent corpus).
- Harness installation (some harnesses validate their target subset before producing output).

## What this morphism does not yet specify

- The complete rule set.
  The realization adds rules as patterns of breakage are recognized; many rules live in code rather than in the corpus.
- The mapping from rules to system cells.
  Whether convention rules should themselves be system content (substrate-declared) rather than code-defined is an active program-shaping question.
- The escalation discipline for findings.
  When validate reports a warning that the captain's audit has decided is fine, the discipline for marking the warning as accepted-for-now (vs. fixing) is partly settled.

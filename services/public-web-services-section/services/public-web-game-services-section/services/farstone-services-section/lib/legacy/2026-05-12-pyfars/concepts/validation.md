---
type: concept
class: act-specialization
status: draft
depends-on: [act, witness, observation, certification]
---

# Validation

An [act](act.md) of checking system state against the active set of rules — frontmatter conventions, dependency-graph constraints, citation requirements, schema invariants — and witnessing the results as findings.
Validation is how PyFARS surfaces drift from its own discipline.

Validation pairs with [observation](observation.md) (which records what is) and [certification](certification.md) (which records what an agent attests).
Where observation is epistemic and certification is jural, validation is *evaluative* — it produces findings of the form "this system state holds-or-violates rule $\rho$."

## Validation vs. observation, certification

The triad:

- **Observation** — "I saw X."
  Records perception.
- **Certification** — "I attest X."
  Records authoritative truth-commitment.
- **Validation** — "X conforms (or doesn't) to rule $\rho$."
  Records rule-conformance findings.

A validator does not certify; it produces findings.
A certifier may certify-based-on validations (e.g., "this PR is approved [certification] because all pre-merge validations passed").

## What a validation has

A validation has:

1. **A target** — the substrate region being validated.
  May be a single file, a sub-domain, the full corpus.
2. **A rule-set** — the rules being checked.
  May be the full active rule-set or a subset.
3. **A finding-stream** — zero or more findings, each naming a violated rule and the cells that violate it.
4. **An overall status** — pass (no findings) or fail (findings present), in the simplest case.
  Bilattice-valued findings are admissible (a finding may be partial-evidence, both-evidence, etc.).
5. **A witness** — the JSONL log entry recording the validation event, the target, and the findings.

## Validation and bilattice findings

Per upstream [bilattice values](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/), a finding's truth-value isn't necessarily $\{\mathbf{t}, \mathbf{f}\}$ alone.
A rule-check may produce:

- $\mathbf{t}$ — clearly violates.
- $\mathbf{f}$ — clearly does not violate.
- $\bot$ — insufficient evidence to determine (rule's antecedent doesn't apply, target lacks the relevant cells).
- $\top$ — both violates and does not violate (the target carries contradictory evidence; rule itself is inconsistent over this target).

PyFARS's validation discipline: surface all four.
A rule that produces $\top$ over a target is itself a rule-of-interest — not just the target's failure, but the rule's structural problem.

## Validation and remediation

A validation produces findings; findings may produce remediation acts.
The discipline:

- Findings are surfaced in the log and rendered into validation-output projections (CLI output, audit reports, render-time annotations).
- Remediation is *separate work* — it requires authority to commit system changes that resolve the findings.
- A finding's existence does not imply automatic remediation.
  PyFARS's commitment: findings are read by humans (or higher-authority agents) who decide whether to remediate, defer, or contest the rule itself.

This separation prevents validators from acquiring undue authority.
The validator surfaces drift; remediators fix it; rule-authorities revise rules when findings reveal rule-problems.

## Validation and substrate-purity

Validations are substrate-faithful: they read substrate but do not modify it (other than the validation-witness itself).
Findings are derived from system-cells via rule-evaluation; running the same validation over the same substrate produces the same findings.

This makes validation auditable: "what findings did the validator surface at $\tau$?
What rule-set did it run?
What was the system-state-at-$\tau$?" — all reconstructible from the log.

## Validation and the validate verb

The PyFARS `validate` verb is the substrate-runtime invocation of validation.
It calls the active rule-set's checks against a target (or the full corpus by default), produces findings, and writes them to the log + stdout.

A skill named after `validate` (or `validating` per gerund-discipline) is a routine-validation-skill — instructed, parameterized, and replayable.

## What this concept does not specify

- The complete active rule-set.
  Rules are themselves system cells; the full rule-set evolves with the polity.
  Currently a hybrid of Python-coded and substrate-declared rules; full substrate-declaration is partly settled.
- The performance discipline.
  Full-corpus validation is expensive; incremental validation (re-validating only changed regions) is implemented but partly settled.
- Cross-instance validation.
  When polities federate, what counts as a finding may differ.
  Open.
- Severity levels.
  Currently flat (pass/fail); richer severity hierarchies are admissible but unimplemented.

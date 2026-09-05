---
title: "PyFARS Enterprise Charter"
type: charter
status: active
version: "0.2"
theory-basis: [enterprise, charter-as-closure-system, normative-operational-layering]
---


This charter constitutes PyFARS as an enterprise `(C, Γ, O)` per the PredWork `enterprise` definition.
It is the closure-rule system whose rules tier IS the enterprise's hard core C.
Amendment of the rules tier is amendment of the enterprise itself and requires novation: the steward proposes, the captain ratifies, a corpus witness attests.

---

## Rules Tier — Hard Core C

These five commitments are constitutive.
Abandoning any one of them would terminate PyFARS as this enterprise and constitute a new enterprise in its place.

### C1 — Predication Substrate

Storage primitive is the four-valued bilattice predication cell.
Reasoning primitive is the closure-rule system over the predication-graph store.
Every substrate operation respects the mathematical structure of predication.
Theoretical correctness precedes convenience.

### C2 — First-Class Provenance

Every state change carries a witness recording operator, inputs, outputs, and substrate state.
Provenance is substrate content, not an annotation layer.
There is no substrate operation that produces an effect without a corresponding witness cell.

### C3 — Agential Self-Generation

Every operative element — agent, skill, runbook, office, governance rule — is a substrate entity.
The platform's machinery is defined in the substrate it operates on.
Hardcoded configuration that cannot be derived from substrate records is structural debt, not a feature.

### C4 — Federation by Value-Domain Join

Two PyFARS instances federating compose through the substrate's value-domain join.
The algebra IS the federation protocol.
No separately-engineered synchronization layer is admissible as a permanent replacement for substrate-native federation.

### C5 — Practical Reasoning as Substrate Operator Schedule

The tick/dispatch/runbook-execution cycle IS the practical-reasoning loop.
LLM-mediated agent loops and classical-MAS loops are the same cycle in different registers.
The substrate's heartbeat is not a cron job — it is the enterprise's practical reasoning made concrete.

---

## Guidelines Tier — Current Integration Strategy

These are strong operating preferences that reflect the current phase of development.
Changing them is a governance decision requiring steward approval, but not novation.

### G1 — OpenClaw as Primary Interface

While usable via CLI and MCP, PyFARS is designed as the data and theory substrate for OpenClaw agents.
The OpenClaw harness is maintained as the primary integration point.
This is a current integration preference, not a constitutive commitment — switching harnesses in the future would not terminate the enterprise.

### G2 — Development Discipline

- One function per file: features added by adding modules, not growing existing functions.
- Constants live in one place (`convention.py`, `spec.py`).
- Mutating engine API endpoints carry their own authority and witness discipline per `governance/specifications/wiring-protocols.md`; substrate operations preserve substrate-purity (every mutation produces a witness).
- Diagnostics carry sufficient context for automated fixing.

### G3 — Substrate Operations as Clean Python APIs

All substrate operations are available as clean Python APIs independent of CLI or web surface.
Interface concerns are secondary to substrate functionality.

---

## Preferences Tier — Convenience and Style

These reflect the captain's working preferences.
Any agent with steward or records-officer authority may update them without governance review.

- CLI features that duplicate OpenClaw capabilities are to be avoided unless they serve debugging or substrate inspection purposes.
- The web interface is a first-class operator surface: it carries the live witness stream, dispatch state, predication-cell view, and intent submission for any running polity.
  It is not the only surface — local CLI over UDS and MCP for frontier-model agents are peers — but it is no longer demonstration-only.
  Updated 2026-05-09 closing arc D.
- Session and memory persistence across agent invocations is a positive good.

---

## Instructions Tier — Operating Procedures

- Validate touched files via the substrate validation suite (`closure/rule/compose_rules.run` + `closure/lint/compose_lint.run`); filter diagnostics to files actually changed.
- Commit messages cite work-record slugs (e.g. `task-15`) so the engine's commit-witness binding can find the originating record.
- Records under `triage/` stay under `triage/` until explicitly promoted.
  Do not bulk-lift.
- Audit outputs go in `audits/` subdirectories or `operations/engineering/triage/`, nowhere else.

---

## Generative Mechanism Γ

The enterprise's generative mechanism is the **theory-derivation loop** (`theory-derivation-loop`).
Every theorem added to predication-categories that bears on computation generates new derivation aims → engineering aims → implementation aims.
The aim-set never exhausts because the mathematical research program continuously generates new material.
This is a Scott-continuous regime Γ: each cycle's aim-set depends on the immediately prior theory state (Markov aggregation).

Detection of Γ degeneration (the loop stalling, the math-code gap widening) is the pyfars-theory-officer's primary accountability.
See `maintain-derivation-chain-integrity` duty.

---

## Operative Structure O

The enterprise is governed by three offices:

- **`pyfars-steward`** — enterprise-governing authority; guards C; presides over novation.
- **`pyfars-executive-officer`** — operational interface; translates command intent into dispatch; watches the active task frontier; routes all incoming messages.
- **`pyfars-theory-officer`** — governance layer over Γ; audits derivation chain soundness; reports degeneration signals to the steward.

Below these, functional offices run the day-to-day work:

- **`pyfars-records-officer`** — creates and maintains governance/ and work/ records.
- **`theory-derivation-officer`** — runs Phases 1–5 of the theory-derivation loop.
- **`pyfars-developer`** — implements PyFARS code from dev docs and FARS spec.

Authority chain: 561 polity → captain → pyfars-steward → pyfars-executive-officer → functional offices.

---

## Enterprise Identity

- **Founded**: as `version: 0.1` charter (informal project commitments); this version (0.2) constitutes it formally as an enterprise.
- **Hard core amendment**: requires novation per `enterprise` theory (three-party consent with witness record).
- **Termination**: dissolution of C — would require captain decision recorded as a novation that extinguishes this charter and constitutes a new one.
- **Degeneration**: detected by pyfars-theory-officer via `auditing-derivation-chain-governance` skill; reported to steward for corrective governance.

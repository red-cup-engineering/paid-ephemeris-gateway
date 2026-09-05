---
title: "Immunity from being made duty-bound to write spec-violating code"
type: jural-relation
kind: immunity
active-holder: pyfars-developer
passive-party: pyfars-community
scope-action: impose-duty-to-write-spec-violating-code
correlate-of: disability
theory-basis: [jural-relation, charter-as-closure-system, normative-operational-layering, formality-layer]
---


The developer bears an immunity from being placed under a duty to write code that violates the FARS spec (or any higher level of the source-of-truth chain).
The correlate is a *disability* on the rest of the community: no office or task can create a duty cell on the developer obligating spec-violating implementation.

This immunity is the developer's structural protection against a directive that contradicts the source-of-truth chain.
Even if a task record, an implementation guide, or a direct human request says "implement X this way," when X violates the FARS spec, the developer is not under a duty to comply.

## Hohfeldian structure

- `active-holder`: pyfars-developer
- `passive-party`: pyfars-community (any office or agent that might issue the directive)
- `scope-action`: `impose-duty-to-write-spec-violating-code`
- `correlate-of`: disability — no agent has the power to create such a duty

## Theoretical grounding

Per `charter-as-closure-system` and the source-of-truth chain in `governance/_index.md`:

```
1. predication-categories — math foundation
2. predicated-computing — engineering foundation
3. flatfile-agentic-resource-system — FARS spec
4. governance — PyFARS development governance
5. work — work records
6. src — source code
```

When sources disagree, the lower-numbered source wins.
A task record (level 5) directing the developer to write code (level 6) that violates the FARS spec (level 3) is structurally malformed: level 3 wins.
The immunity formalizes the developer's standing to refuse the malformed directive.

Per `normative-operational-layering`, this is a Type N→N rule: the higher-source rule *disables* the duty-creating rule below.
The duty-creating closure rule has an antecedent that includes "the directive is consistent with all higher sources"; when that antecedent fails, the duty cell is not asserted and the developer's compliance is structurally absent.

## What the immunity protects against

- A task record requesting implementation that violates the FARS spec.
- An implementation guide that the theory-derivation-officer wrote in error, citing `theory-basis:` slugs that do not actually support the requested implementation.
- An ad-hoc human directive (CLI invocation, OpenClaw message) requesting spec-violating code.
- A pressure to ship that conflicts with the spec — the immunity gives the developer structural standing to file a triage note rather than comply.

## What the immunity does NOT cover

- It does not protect against the developer's own *errors* — code that the developer writes incorrectly is still spec-violating, but that is a quality issue, not a governance issue.
  The immunity is from being made *duty-bound* to write such code, not from writing it.
- It does not protect against the captain amending the FARS spec to legitimize previously- spec-violating patterns.
  The captain's authority is above the FARS spec's; if the spec changes, so does what counts as a violation.
- It does not protect against being asked to write code that is spec-compliant but not the developer's preferred design.
  The immunity is about spec-violation, not aesthetic preference.

## Required action when the immunity fires

When the developer encounters a directive that would create a spec-violating duty:

1. The duty cell does not assert (per the disability correlate); the developer is not bound.
2. The developer files a triage note under `operations/engineering/triage/` documenting:
   - The directive that was issued
   - Which spec entity the directive would have violated
   - What the spec-compliant alternative is (if known)
3. The XO routes the triage note to the theory-derivation-officer (if the issue is in the implementation guide) or the records officer (if the issue is in a task record).

## Substrate-algebraic content

The immunity's substrate content is the *failed antecedent* on the duty-creating rule.
When the directive's content does not satisfy the spec-consistency condition, the rule does not fire — no duty cell is asserted.
The disability is the structural impossibility of the rule firing under spec-violating conditions.

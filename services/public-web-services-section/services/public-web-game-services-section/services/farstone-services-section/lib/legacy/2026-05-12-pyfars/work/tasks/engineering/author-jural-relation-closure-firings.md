---
title: "Author the Hohfeldian jural-relation closure firings"
type: task
area: engineering
status: open
horizon: doing
milestone: m5-agential-self-generation
goal: office-records-gate-authority
depends-on: [extend-dispatch-eligibility-to-read-office-jurisdiction]
requires-capabilities: [corpus-editing, theory-derivation]
theory-basis: [hohfeldian-jural-relations, charter-as-closure-system]
---


## Description

Author closure rules realizing the four Hohfeldian jural correlates as substrate firings: power↔liability, duty↔right, privilege↔no-right, immunity↔disability.
Each correlate is a substrate-resident closure rule whose firing emits the correlate cell when the original cell is asserted on an office or principal.

Office records carry `power:`, `duty:`, `right:`, `privilege:`, `immunity:` fields per the office-records-gate-authority goal.
The closure rules realize the correlate structure: when `(office, has-power, X) = t` is asserted, the rule fires `(party, has-liability, X) = t` for the party against whom the power is exercisable.
This is what makes the office's authority *relational* rather than merely declarative.

Per [`office-record`](../../../objects/office-record.md), authority is bilattice-valued; the correlate closures preserve that structure ($\bot$ on the original produces $\bot$ on the correlate; $\top$ propagates as anomaly).

## Acceptance

- [ ] `objects/jural-correlate-power-liability.md`, `objects/jural-correlate-duty-right.md`, `objects/jural-correlate-privilege-no-right.md`, `objects/jural-correlate-immunity-disability.md` each exist as closure-rule records.
- [ ] Each carries `regime: strict` and a body stating antecedent, consequent, and bilattice-value preservation.
- [ ] Each cites the upstream Hohfeldian-jural-relations theory in `depends-on:`.
- [ ] An instantiator in `runtime/eligibility_rules.py` registers the four rules under their slugs.
- [ ] A test in `tests/runtime/test_jural_correlates.py` asserts: setting `(office-A, has-power-over, office-B, action-K) = t` produces `(office-B, has-liability-from, office-A, action-K) = t` after one closure pass.

## Progress cells

*(empty — task not yet started)*

---
type: concept
class: workitem-subtype
status: draft
depends-on: [workitem, work-status, work-record]
---

# Inquiry

A [workitem](workitem.md) subtype: asks a question whose resolution requires investigation, classification, or research rather than scripted execution or deductive derivation.
Inquiries are the workitem kind that explores — they sit between *not yet knowing what to do* and *having theory or procedure that handles it*.

Inquiries are how the polity adopts new domains: a question is filed, an investigation produces findings, the findings either resolve the question (becoming theory or governance) or refine it into more specific sub-inquiries.

## What distinguishes an inquiry

An inquiry workitem has:

1. **Open-ended target** — the inquiry's goal is to *understand* or *classify*, not to produce a predetermined output.
  Unlike procedure (deterministic) or derivation (theory-asserted), the inquiry's resolution is discovered.
2. **Investigation-shaped execution** — the actor investigates: reads, surveys, samples, tests, classifies.
  Multiple paths admissible; the actor's judgment shapes which paths to pursue.
3. **Resolution may not be the asked question** — an inquiry may *refine* its question rather than *answer* it.
  "Should PyFARS use closure-rule-systems X or Y?" may resolve as "the question presupposes a false dichotomy; here's the actual decomposition."
4. **Outputs are typically findings or new questions, not deterministic deliverables** — the inquiry produces system cells naming what was investigated, what was found, and what next steps surfaced.

Inquiries are the work the captain typically initiates when something is unclear: triage classifications, research engagements, audits exploring whether a pattern recurs.

## Examples

- **Triage classification** — an arrived intent of unclear shape; the inquiry classifies it (work-type, kind, subtype) so it can be planned.
- **Audit research** — an audit that doesn't yet know what it's looking for; the inquiry surveys substrate and surfaces findings.
- **Theoretical investigation** — a question filed in `pyfars/theory/questions/` whose resolution requires reading upstream and considering options.
  The inquiry's resolution may be a derivation or a governance decision.
- **Diagnostic** — when a system behaves unexpectedly, an inquiry investigates causes.

## Why distinguish inquiry from procedure or derivation

A procedure has a recipe; an inquiry doesn't (or has only a meta-recipe like "investigate").
A derivation produces author-asserted theory; an inquiry may *not* produce theory (it may resolve into a governance decision or into a refined question).

In dispatch: inquiries require actors with judgment (typically agentic); they don't fit the orient/act/verify/witness recipe of procedures; they don't have the upstream-warrant discipline of derivations.

## OS analog

Inquiries don't have a clean OS analog.
The closest is a **debugging session** or an **exploratory investigation** — open-ended, judgment-driven, terminating when the investigator decides the inquiry has produced enough understanding.
Some inquiries terminate quickly; others span weeks.

## What this concept does not yet specify

- The discipline for deciding when an inquiry is settled vs. still open.
  The actor's judgment is load-bearing; the substrate-tracking is what cells the inquiry's witnesses produce.
- Inquiry-to-derivation conversion.
  When an inquiry's findings warrant authoring theory, the conversion to derivation is partly settled.
  The discipline for when this happens is policy.
- Multi-actor inquiry.
  When several actors investigate in parallel, the closure of their findings is the inquiry's resolution; the merge discipline is partly settled.

---
type: concept
class: dispatch-discipline
status: draft
depends-on: [substrate, dispatch, work-record, work-status, capability-table, settling]
---

# Scheduling policy

The closure-rule-system that determines, for a given system state, which work records get dispatched to which offices/agents.
Realizes the upstream notion of *dispatch discipline* in PyFARS-OS terms: the scheduling policy IS the closure-rule-system at the work-orchestration scope.
Different polities may run different scheduling policies; the polity declares its policy as system content.

## The OS analogy

PyFARS-as-OS treats scheduling policy as analogous to OS scheduler policies (round-robin, priority-based, multi-level feedback queue, completely-fair-scheduler, etc.).
Different policies are valid; choice is a per-polity governance decision shaped by the polity's needs.

| OS scheduling concept | PyFARS analog |
|---|---|
| Scheduler | The dispatch closure operator |
| Scheduling policy | This concept; the closure-rule-system at dispatch scope |
| Policy choice (FIFO, priority, etc.) | Polity-declared policy via system cells |
| Policy parameters (time slice, priority weights) | System cells that the policy reads |
| Scheduler invocation | One dispatch-decision (a single closure-step at heartbeat tick) |
| Run queue | The [work-queue](../objects/work-queue.md) — system-tracked set of `status: ready` work records |

## What a scheduling policy specifies

A scheduling policy answers, for any pair of (work-record, office):

1. **Eligibility**: under what conditions is this office eligible to be dispatched this work?
  (Reads `requires-skills:`, `requires-capabilities:`, `requires-jurisdiction:`, `requires-budget:`, etc., from the work-record; reads `provides-skill:`, `holds-power:`, `holds-jurisdiction:`, etc., from the office's governance entry.)
2. **Authority**: does the office's authority chain admit this dispatch?
  (Reads delegation cells.)
3. **Capacity**: does the office have headroom for additional work?
  (Reads existing `assigned-to:` cells against this office.)
4. **Priority order**: among multiple eligible offices for the same work-record, which is preferred?
  (Reads provider rankings, freshness scores, custom selectors.)
5. **Selection from the queue**: among multiple ready work records, which is dispatched next?
  (Reads work-record priority, age, preference cells.)

Each of these is a closure rule.
Together they form the dispatch-closure-rule-system.
PyFARS-the-package ships a default policy; polities can extend or replace.

## Why the policy lives in the system

The captain's articulated principle: governance frontmatter IS system cells.
Scheduling policy applied to that substrate produces dispatch decisions.
So the policy itself ought to be substrate-declarable — for the same reasons as any other policy:

- **Auditability**: a polity can read its own scheduling policy.
  "Why was this dispatched here?" is answerable from the system, not from Python source.
- **Per-polity variation**: polities serving different missions (development vs. ops vs. research) want different policies.
  Hardcoding one policy in pyfars-the-package limits the realization.
- **Live evolution**: a polity should be able to adjust its policy without redeploying pyfars.
  Policy change is a system transition (witnessed); the next heartbeat tick reads the new policy.
- **Theoretical hygiene**: per [`dispatch-derives-from-governance`](../claims/dispatch-derives-from-governance.md), the load-bearing locus of "what gets dispatched where" is governance cells, not code.

## What this concept commits to

1. **Policy is closure-rule-shaped.** Whatever specific scheduling discipline a polity adopts, it expresses as a closure-rule-system over system cells.
  There is no policy form that requires escape into procedural code.
2. **Policy is system-tracked.** The closure rules are system content (notes, cells), not just configuration files.
  They are auditable, versionable, replayable.
3. **Default policy is provided.** PyFARS-the-package ships a sensible default for polities that don't declare otherwise.
  The default is itself a substrate object so polities see what they're inheriting.
4. **Convergence is bounded.** The dispatch-closure operator at one tick converges in strict regime — bounded by the size of the work-queue and the size of the capability-table.
  A single tick produces a finite set of dispatch decisions; it does not run unbounded.

## What this concept does not yet specify

- The default policy's specific rules.
  The realization needs at least a sensible default; identifying what's default and what's polity-extensible is partly settled.
- The handling of policy conflicts.
  If two closure rules in the policy disagree (e.g., one prefers Cerebras endpoints, another prefers freshness-based), the bilattice machinery surfaces the conflict as $\top$.
  The adjudication discipline is open.
- Cross-polity policy composition.
  When a federation of polities shares a dispatch surface, how the policies compose is open.
- The relationship to *fairness* in classical scheduling.
  Whether PyFARS's policies should aim for fairness (every office gets dispatched eventually) or for efficiency (highest-priority eligible office first) or for some other property is a polity-level question.

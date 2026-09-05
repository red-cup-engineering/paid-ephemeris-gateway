---
title: "Powers"
type: index
---


Power, privilege, and immunity records — the active-side jural relations of the Hohfeldian eightfold.
Each record names the action it covers, the scope, the duties that attach (for powers), and the correlate position (liability for powers, no-right for privileges, disability for immunities).

This directory carries all four active-side jural-relation kinds:

- **Power** — admits the holder to change a normative position; correlate is liability.
- **Privilege** — admits the holder to act without duty; correlate is no-right.
- **Immunity** — protects the holder from having a duty imposed; correlate is disability.

Duties (the constraint side) live separately under [`../duties/`](../duties/).

All records use `type: jural-relation` with a `kind:` sub-classifier per the `governance-records-use-jural-relation-schema` decision.

## Powers by office

### Steward

| Slug | What |
|---|---|
| [`amend-hard-core`](amend-hard-core.md) | Propose an amendment to C1–C5; initiates novation. |
| [`create-office`](create-office.md) | Add a new office to the operative structure O. |
| [`dissolve-office`](dissolve-office.md) | Remove an office from O. |
| [`install-personnel`](install-personnel.md) | Induct a candidate into an office (settles both recognition and induction predicates). |
| [`revoke-installation`](revoke-installation.md) | End a candidate's incumbency. |
| [`ratify-governance-rule`](ratify-governance-rule.md) | Confirm a guidelines-tier or lower change without novation. |
| [`immunity-from-non-captain-c-amendment`](immunity-from-non-captain-c-amendment.md) | *Immunity* — only the captain can ratify amendments to C; offices below cannot. |

### Executive Officer

| Slug | What |
|---|---|
| [`queue-intent`](queue-intent.md) | Place an intent in the substrate's heartbeat queue. |
| [`dispatch-task-to-office`](dispatch-task-to-office.md) | Assign a ready task to an eligible office. |
| [`create-triage-note`](create-triage-note.md) | File a triage note for incoming items that need routing. |
| [`create-work-record`](create-work-record.md) | Create a work record (goal, task) in the work layer. |
| [`close-execution-loop`](close-execution-loop.md) | Close a dispatched task's execution loop with a completion or stall classification. |
| [`read-any-substrate-record`](read-any-substrate-record.md) | *Privilege* — read any substrate record without duty incurred. |

### Theory Officer

| Slug | What |
|---|---|
| [`audit-derivation-chain`](audit-derivation-chain.md) | Run a governance-layer coverage audit of the theory-derivation loop. |
| [`report-degeneration-signal`](report-degeneration-signal.md) | File a confirmed degeneration signal to the steward. |
| [`create-triage-note`](create-triage-note.md) | *Shared* — file a triage note (for degeneration-signal escalation). |
| [`read-any-theory-entity`](read-any-theory-entity.md) | *Privilege* — read any theory corpus entity without duty. |
| [`immunity-from-xo-audit-direction`](immunity-from-xo-audit-direction.md) | *Immunity* — XO cannot direct content or timing of audits; auditor-independence. |

### Roadmap-Enrichment Officer

| Slug | What |
|---|---|
| [`run-roadmap-enrichment-cycle`](run-roadmap-enrichment-cycle.md) | Invoke the five-stage cycle (question → research → claim → objects/morphisms → integration); produces a cycle record with stage witnesses. |
| [`read-any-substrate-record`](read-any-substrate-record.md) | *Shared privilege*. |
| [`read-any-theory-entity`](read-any-theory-entity.md) | *Shared privilege*. |

### Records Officer

| Slug | What |
|---|---|
| [`create-governance-record`](create-governance-record.md) | Create a new record in `governance/`. |
| [`modify-governance-record`](modify-governance-record.md) | Edit an existing `governance/` record. |
| [`create-work-record`](create-work-record.md) | *Shared* — create work records. |
| [`modify-work-record`](modify-work-record.md) | Edit existing work records. |
| [`create-milestone-record`](create-milestone-record.md) | Create milestone records. |
| [`create-goal-record`](create-goal-record.md) | Create goal records. |
| [`create-task-record`](create-task-record.md) | Create task records. |
| [`create-plan-record`](create-plan-record.md) | Create plan records sequencing a milestone's tasks via dependency-DAG. |
| [`promote-task-horizon`](promote-task-horizon.md) | Advance a task's `horizon:` cell along the cascade ladder. |

### Theory Derivation Officer

| Slug | What |
|---|---|
| [`write-predicated-computing-entity`](write-predicated-computing-entity.md) | Phase 2: write into `theories/.../predicated-computing/`. |
| [`write-aop-entity`](write-aop-entity.md) | Phase 3: write into `theories/.../agential-orchestration-platform/`. |
| [`write-fars-spec-entity`](write-fars-spec-entity.md) | Phase 4: write into `theories/.../flatfile-agentic-resource-system/`. |
| [`write-implementation-guide`](write-implementation-guide.md) | Phase 5: write into `work/implementation/`. |
| [`write-triage-note`](write-triage-note.md) | *Shared* — file triage notes for theory gaps and loop-start audits. |
| [`read-predication-categories-entity`](read-predication-categories-entity.md) | *Shared privilege* — read any predication-categories entity (also held by self-theory-author). |

### Self-Theory Author

| Slug | What |
|---|---|
| [`write-pyfars-self-theory-entity`](write-pyfars-self-theory-entity.md) | Create or modify entities under `pyfars/`. |
| [`write-triage-note`](write-triage-note.md) | *Shared* — file triage notes for cross-cutting findings surfaced during self-theory authoring. |
| [`read-predication-categories-entity`](read-predication-categories-entity.md) | *Shared privilege* — read any predication-categories entity. |
| [`read-predicated-computing-entity`](read-predicated-computing-entity.md) | *Privilege* — read any predicated-computing or sub-theory entity. |
| [`read-fars-spec-entity`](read-fars-spec-entity.md) | *Privilege* — read any FARS spec entity. |

### Developer

| Slug | What |
|---|---|
| [`write-pyfars-source`](write-pyfars-source.md) | Write or modify files under `src/`. |
| [`create-task-record`](create-task-record.md) | *Shared* — create engineering task records when decomposing implementation work. |
| [`read-implementation-guide`](read-implementation-guide.md) | *Privilege* — read implementation guides in `work/implementation/`. |
| [`read-substrate-records`](read-substrate-records.md) | *Privilege* — read any substrate record for implementation context. |
| [`immunity-from-spec-violating-duty`](immunity-from-spec-violating-duty.md) | *Immunity* — cannot be made duty-bound to write spec-violating code. |

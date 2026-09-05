# questions/

Open self-questions about PyFARS-as-realization.
Conjectures with no current attempt, and program-shaping questions about what to construct or theorize next.

A question lives here when it is a genuine open.
A claim that is precisely stated and believed-true but unproven goes in `claims/` with `status: draft`, not here.

## Frontmatter

```yaml
---
type: question
status: open | partial | abandoned
explores: [substrate, public-projection, view-composition, ...]   # objects/concepts the question is posed in terms of
---
```

`explores:` declares the entities the question is inquiring into.
It's the question-specific analogue of `depends-on:` — questions don't load-bear on the rest of the theory (nothing depends on a question), so they declare their relation outward via inquiry.
The validator treats `explores:` as an outgoing graph edge for orphan and reference checks.

`status: partial` means the question has been refined or some sub-case is settled, but the main question remains open.
When a question is fully answered the question note is *deleted* — the resolving claim (or the new object that obviates the question) is the live record.
When a question is abandoned (no longer worth pursuing), it is also deleted, optionally with a brief note in the abandoning commit.

## Two flavors of question

Both belong here; they differ in body shape.

**Realization questions.** "When PyFARS serves an HTTP response, in what sense is the response a projection of substrate state?"
Statement, what is known, what would settle it, where the answer would live (a claim in `claims/`, an object in `objects/`, …).

**Program-shaping questions.** "Should PyFARS expose write-endpoints in its FastAPI surface, or keep writes confined to MCP and CLI?"
Statement, why it matters for the realization, what kind of construction or commitment would count as an answer.
These are the questions that determine which objects and claims get authored next; they should be plentiful while a sub-domain is being grown.

A question may also be a **governance-grounding question** — a governance commitment depends on theoretical ground that hasn't been written yet.
These are realization questions in shape; they additionally name the governance commitment they're grounding.
When such a question resolves, the resolving claim here typically warrants a corresponding decision in [`../governance/decisions/`](../governance/decisions/).

## When questions become other things

When a program-shaping question has been answered well enough to start construction, the resulting object goes to `objects/` (or claim to `claims/`) and the question note is deleted.
When a realization question is settled, the proof goes to `claims/` and the question note is deleted.
The resolving artifact is the live record; a redirect-only question note creates confusion.

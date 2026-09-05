---
name: "Authoring a question"
description: "Produces a question record at `questions/<slug>.md` when an intake, observation, or research finding surfaces something the polity does not yet have a defended position on. Use when an incoming message is exploratory rather than task-shaped, or when a theory gap is found but cannot yet be stated as a claim."
---


A question record is the substrate unit of *not yet knowing*.
It names something the polity wants to understand — a user desire, a bug report, an architectural uncertainty, a theory gap — and gives it a slug so the roadmap-enrichment cycle can select it as a starting point.
Questions are not claims and not tasks; they are the input that the cycle turns into claims.

## Requirements

- Any office with `create-work-record` power, or the captain directly.
- Read access to existing `questions/` to check for duplicate coverage.
- A clear one-sentence formulation of what is being asked.

## Steps

1. **Formulate the question as a single sentence.** The question should be answerable by the cycle — it should be possible to imagine a claim that resolves it.
  "Can we support federation?" is answerable.
  "What should we do?" is not.

2. **Check for duplicates.** Read `questions/` and `questions/_themes.md`.
  If a question with substantially the same content exists, add the new context to it rather than opening a new record.

3. **Identify what the question explores.** Name the objects, morphisms, concepts, or claims the question is *about*.
  These become the `explores:` list.

4. **Author the record** at `questions/<slug>.md`:
   ```yaml
   ---
   type: question
   title: "<the question, as a sentence>"
   status: open
   explores: [<object/morphism/concept/claim-slugs the question concerns>]
   depends-on: []
   filed-by: <officer-slug or captain>
   filed-at: YYYY-MM-DD
   ---
   ```
Body: one to three paragraphs.
What prompted the question.
What a resolution would need to establish.
What prior context is relevant (prior art, adjacent questions, upstream theory that bears on it).

5. **If the question is urgent or blocks other work**, note it in the body and flag it to the XO for dispatch prioritization.

6. **Update `questions/_themes.md`** if the question belongs to an existing thematic axis, or add a new axis entry if it introduces a new theme.

## Outcomes

- A `questions/<slug>.md` record at `status: open`, ready for the roadmap-enrichment officer to select as a cycle starting point.
- The question is substrate-resident and citable — claims can later declare `derived-from-question: <slug>`.

## Discipline notes

- **Questions are not tasks.** A question whose resolution is already clear ("add X feature") should be a task or goal, not a question.
  Questions are for genuine epistemic uncertainty.
- **One question, one record.** A complex situation may decompose into several independent questions; file them separately so each can be cycled independently.
- **Questions from users are questions.** User desires and bug reports are the canonical source of questions in question-driven development.
  When a user says "can we fix it?", that is a question record, not a task record.
  The cycle turns it into a claim and then into tasks.

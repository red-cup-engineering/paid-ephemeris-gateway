---
name: "Authoring a tutorial"
description: "Produces a tutorial at `prose/tutorials/<slug>.md` that takes a reader from zero to working with a specific PyFARS feature. Use after code for that feature passes its tests. Tutorials are task-oriented and operational; they assume a reader who wants to do something, not understand something."
---


A tutorial teaches by doing.
It takes a reader through a concrete sequence of steps that accomplish a real task using PyFARS.
The reader should be able to follow the steps and arrive at a working result.
A tutorial is not an explanation (which answers "why") or a how-to guide (which solves a specific problem) — it is a guided exercise that builds competence.

Tutorials are post-code.
They require that the code they demonstrate passes its tests and is installed in the polity they target.

## Requirements

- The `self-theory-author` office held.
- Code that passes all tests for the feature the tutorial covers.
- A clear statement of what the reader will be able to do at the end.

## Steps

1. **State the goal.** In one sentence: "After this tutorial, you will be able to X."
  The X should be concrete and verifiable — the reader should be able to check that they've achieved it.

2. **Identify the reader.** What do they already know?
  What are they trying to accomplish?
  A tutorial aimed at a first-time pyfars user is different from one aimed at a polity operator.
  Name the assumed reader in the tutorial's preamble.

3. **List what the reader needs before starting** (prerequisites).
  Be specific: software versions, files that must exist, permissions required.
  Don't assume.

4. **Write the steps as commands the reader runs.** Each step should produce an observable outcome the reader can verify.
  Keep steps small — one action per step.
  If a step has multiple substeps, number them.

5. **Include the expected output** for each step where the output is non-obvious.
  The reader should be able to tell if something went wrong.

6. **End with a "you now have" summary** and pointers to what to do next (related tutorials, deeper explanations, how-to guides for common variations).

7. **Author the record** at `prose/tutorials/<slug>.md`:
   ```yaml
   ---
   title: "<goal as a gerund phrase: 'Installing PyFARS', 'Authoring your first claim'>"
   type: tutorial
   status: draft
   depends-on: [<spec-slugs, object-slugs, or other records the tutorial covers>]
   ---
   ```

8. **Test the tutorial yourself** by following every step from scratch in a clean environment.
  A tutorial that cannot be followed as written is not a tutorial — it is a sketch.

## Outcomes

- A `prose/tutorials/<slug>.md` record at `status: draft`, verified to work end-to-end.
- Indexed in `prose/tutorials/_index.md`.

## Discipline notes

- **Tutorials are operational, not theoretical.** The reader should not need to understand the theory to follow the tutorial.
  Cross-references to narratives and object records are fine; inline theory is not.
- **`draft` vs `current`.** Promote to `current` after successfully testing end-to-end.
  When the feature changes and the tutorial breaks, mark it `draft` again until updated.
- **Don't write tutorials before the code is tested.** A tutorial over broken code trains readers to hit bugs.
  Wait for tests to pass.
- **Short tutorials are better than long ones.** If covering everything takes more than 20 steps, split into two tutorials.
  The reader's time is scarce.

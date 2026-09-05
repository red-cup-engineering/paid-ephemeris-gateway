---
title: "PyFARS prose"
type: index
status: open
---

# PyFARS — prose

Long-form documentation organized along [Diátaxis](https://diataxis.fr/) lines.
Source code lives in [`../src/`](../src/); work-tracking in [`../work/`](../work/); governance (decisions, charter, conventions) in [`../theory/`](../theory/).

The four sections answer four different reader questions:

| Section | Reader's question | Voice |
|---|---|---|
| [`tutorials/`](tutorials/) | *I'm new — walk me through it.* | Step-by-step lesson, learning-oriented. |
| [`how-to/`](how-to/) | *I have a specific problem — give me the recipe.* | Goal-oriented procedure, no narrative. |
| [`reference/`](reference/) | *What is X?* | Information-oriented description. (Currently sparse; the `pyfars help` and `pyfars list-verbs` outputs serve as the verb reference.) |
| [`explanation/`](explanation/) | *Why is it this way?* | Understanding-oriented design discussion. |

Don't mix modes.
A tutorial is not a place to explain rationale; an explanation is not a place to give commands.

## Most-asked

- New to PyFARS?
  Start at [`tutorials/installing-pyfars.md`](tutorials/installing-pyfars.md).
- Install is broken?
  Read [`how-to/recovering-from-a-broken-install.md`](how-to/recovering-from-a-broken-install.md).
- Want to understand the bootstrap design?
  Read [`explanation/the-install-pipeline.md`](explanation/the-install-pipeline.md).

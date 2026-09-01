---
name: "Expanding self-theory for a sub-domain"
description: "Produces the dependency-ordered set of new concepts, objects, morphisms, and claims to author when a sub-domain of PyFARS comes into focus (the web app, the dispatch layer, the OAuth/principal layer, etc.) and existing self-theory does not yet have the vocabulary to talk about it. Use after the foundational spine exists and a specific sub-domain needs theoretical ground before practice can be derived."
---


## Requirements

- Read access to existing `pyfars/` content (so the expansion builds on what's already foundational).
- Read access to the upstream sub-theory most relevant to the sub-domain (e.g., `web-server-platform/` and `interactive-application-platform/` for the web slice; `agential-orchestration-platform/` for dispatch).
- A clear statement of the sub-domain — what surface of PyFARS is the expansion about (one to two sentences).
- A clear sense of why the expansion is needed *now* — typically because practice is about to be derived from the new self-theory slice and needs theoretical ground.

## Steps

1. **State the sub-domain in one to two sentences.** "The web app's public homepage and authenticated views."
  "The dispatch layer's heartbeat-driven settling."
  If the sub-domain takes a paragraph to state, it's probably more than one sub-domain — split.

2. **Walk the relevant upstream theory.** Read the sub-theory's `_index.md` and key entries; identify which upstream concepts/objects/morphisms/theorems will need PyFARS-side counterparts.
  Note: not every upstream entry needs a PyFARS-side lift — only those whose realization in PyFARS is non-trivial or whose PyFARS-specific commitments need to be stated.
  Leave generically-applicable upstream content uncited (the upstream is the warrant).

3. **Identify the practice the expansion will anchor.** What concrete piece of PyFARS practice (code, deployment, configuration) will derive from this expansion?
  Naming the practice early helps prioritize: theory entries that ground the practice are first-priority; theory entries that are interesting but not practice-anchoring can be deferred.

4. **List the new entries.** For each:
   - Name (slug) — lower-kebab-case.
   - Kind (concept / object / morphism / claim).
   - One-sentence purpose.
   - `depends-on:` set — both upstream warrants and other entries in this expansion.
   - Whether it is *practice-anchoring* (load-bearing for the derived practice) or *foundational support* (load-bearing for other expansion entries) or *deferrable* (not blocking; can wait).

5. **Order the entries by dependency.** Topological sort with depends-on as the edge.
  Practice-anchoring entries are the goal; foundational support entries are upstream of them in the order.
  Deferrable entries may or may not be in this expansion.

6. **Write the manifest** as a comment on the originating question, or as a temporary scratch record.
  If the sub-domain expansion was captain-prompted in conversation rather than originating from a filed question, file a question first to give the work a substrate referent — this preserves audit (the rationale for the slice survives in substrate) and gives subsequent skills (and future readers) a stable target.
  The manifest itself remains working memory; the actual entries are the substrate output.

7. **Author the entries** in dependency order, using:
   - `authoring-foundational-self-theory-concept` for new concepts.
   - `lifting-upstream-pattern-to-self-theory` for entries that lift an upstream pattern.
   - `authoring-realization-claim` for new claims.
   - Direct authoring for new objects and morphisms (the conventions are in `objects/_index.md` and `morphisms/_index.md`).

8. **Surface gaps as questions.** When authoring the expansion reveals that an upstream entity is missing, file a question in upstream theory (or a triage note); do not invent placeholders.
  Do not block the expansion on the gap if the practice-anchoring entries can still be authored.

## Outcomes

A coherent slice of `pyfars/` that:

1. Names the sub-domain in PyFARS-specific terms.
2. Provides the theoretical ground for one or more practice-anchoring entries.
3. Cites upstream warrants via `depends-on:` for every entry.
4. Identifies the practice that will be derived from the slice.
5. Surfaces any gaps in upstream theory as questions, without invented placeholders.

The expansion is a fiber-anchor for the practice that derives from it.
Once the practice is built, friction discovered during the build informs what other entries the expansion still needs (revising the manifest, adding entries, sometimes revising existing ones).

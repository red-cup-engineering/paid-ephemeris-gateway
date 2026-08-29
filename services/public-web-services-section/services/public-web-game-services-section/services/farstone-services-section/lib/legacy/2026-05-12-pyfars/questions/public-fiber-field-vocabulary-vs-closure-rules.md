---
type: question
status: open
explores: [public-fiber, public-projection, polity-homepage, predication-cell, closure-rule-system]
---

# What is the right specification for what gets read into the public fiber?

The [public-fiber](../objects/public-fiber.md) object says the fiber is the closure of public-licit cells under a public closure-rule-system.
The [polity-homepage](../objects/polity-homepage.md) practice anchor implementation (`pyfars.api.polity_facts`) reads specific frontmatter fields by name (`captain`, `ships`, `current-voyage`, `public-handle`, `public-domain`, `populace`, `offices`, `description`, `title`, `founded`) from specific note kinds (`polity`, `ship`, `personnel`).
The two specifications are not aligned: the theory says "closure under public-licit"; the practice says "these fields from these kinds."

This question asks how to bridge them.

## What is known

- The current implementation works at the practice level: it produces a homepage from corpus state.
  Reading specific fields from `kind: polity` and its referents is empirically what the homepage needs.
- The theory's "public-licit closure-rule-system" framing is correct in the abstract but not yet specified concretely.
  What closure rules generate the public fiber from public-licit-anchored cells?
  Which predicates are reserved as public-licit-bearing?
- The implementation is a deliberate *initial conflation* per `deriving-practice-anchor-from-self-theory`'s step 2 revised discipline.
  The conflation is acknowledged in the function's docstring; this question is the surfaced friction.

## What would settle it

A concrete public-licit closure-rule-system specification, plus the implementation that reads from it:

1. A reserved predicate `public-licit` whose value on a cell is bilattice-valued (typically `t` or `bot`).
2. A closure-rule-system `R^pub` whose closure rules express how public-licit consequences derive (e.g., "if a personnel record is public-licit and has a `public-handle`, the cell `(personnel, public-handle, X)` is public-licit").
3. A `pyfars.api.public_fiber(root)` function that computes the closure under `R^pub` and returns the public fiber.
4. Refactoring `polity_facts` to read from `public_fiber(root)` rather than walking notes by name.

Once those exist, the homepage's content is *derived* from the public-licit declarations rather than from a hardcoded field-list, and the captain controls "what's public" by witnessing public-licit cells, not by editing the polity_facts function.

## Resolutions partly settle this

A partial settlement is to declare a reserved predicate vocabulary (e.g., `public-licit`, `private`, `personnel-handle`, etc.) without yet implementing the full closure-rule-system.
The vocabulary alone makes the public/private boundary witnessable; the closure rules can be added incrementally.

Another partial settlement is to refactor `polity_facts` to read by *predicate convention* rather than by *field name* — i.e., walk all cells where the predicate is `public-licit: t` and assemble the public fiber from those.
This still doesn't compute closure but it makes the boundary explicit.

## Open dimensions

- Whether closure rules for the public fiber should themselves be substrate-declared (as cells with predicate `closure-rule-system: R^pub`, a la `enterprise-direction`) or hardcoded in PyFARS.
- The handling of polity-fact records that *aren't* public-licit.
  Currently the polity record is presumed public; under a strict public-licit discipline, even the polity record's name might not be exposed without explicit declaration.
  (Probably acceptable to special-case the polity-identity itself as always-public; this is a polity-level decision.)
- The interaction with the [polity-homepage's polity-context question](polity-context-for-web-app.md).

---
type: definition
class: system-sub-fiber
status: draft
realizes: [predication-fiber]
depends-on: [substrate, predication-cell, settling, predication-fiber]
---

# Public fiber

The publicly-readable sub-fiber of PyFARS's system fiber: the cells whose values are exposed to unauthenticated readers via PyFARS's public-projection morphisms (HTML homepage, public JSON endpoints, etc.).
Realizes the predication-categories notion of a [predication-fiber](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/) restricted to a designated sub-base.

## Data

A public fiber $F^{\mathrm{pub}}$ for a substrate $S$ is

$$F^{\mathrm{pub}} \;=\; \mathrm{Cl}_{R^{\mathrm{pub}}}\big(S^{\mathrm{pub-licit}}\big)$$

where:

- $S^{\mathrm{pub-licit}} \subseteq S$ is the set of system cells *declared public-licit* by the polity — explicitly marked as exposable to anonymous readers.
- $R^{\mathrm{pub}}$ is the *public closure-rule-system*: a closure-rule-system that takes public-licit cells and derives their consequence cells, restricted to the public-licit sub-base.
  Closure rules in $R^{\mathrm{pub}}$ may not derive public cells from non-public cells; this is the structural commitment that keeps the public fiber from leaking private information.
- $\mathrm{Cl}_{R^{\mathrm{pub}}}$ is the closure operator under that rule-system.

The public fiber is the cells whose values are publicly knowable: explicitly-public cells plus their public-derivable consequences.

## Notation

For a substrate $S$ at time $\tau$ and a polity-defined public-licit set $S^{\mathrm{pub-licit}}(\tau)$, the public fiber at time $\tau$ is denoted $F^{\mathrm{pub}}(\tau)$.
The default public-licit set is empty; a polity declares public cells explicitly.

## How public-licit is declared

Public-licit cells are themselves system cells: a cell $(c, \texttt{public-licit}, \mathbf{t}) \in S$ records that cell $c$ is public-licit.
The polity's governance — typically the captain or the steward — settles these `public-licit` cells via witnessed events.
There is no inheritance from directory paths or other implicit signals; public-licit-ness is an explicit predication-cell value.

This commitment matters: PyFARS does not assume any cell is public by default.
A polity that declares no `public-licit` cells has an empty public fiber and serves an empty (or fallback-only) homepage.

## What this object commits to

1. **Empty by default.** $F^{\mathrm{pub}}$ is empty when no cells are explicitly declared public-licit.
  There is no implicit public-fiber inferred from frontmatter or filesystem layout.
2. **Closure-restricted.** Consequences of public-licit cells under the public closure-rule-system are public.
  Consequences requiring non-public cells as inputs are *not* public, even if the consequence cell would be derivable in the full closure.
3. **Witnessed.** Each public-licit declaration is a system transition with a witness.
  The discipline preserves audit: every public cell can be traced to the act that made it public.
4. **Revocable.** A polity may un-declare a cell public-licit by witnessing a `public-licit` cell with value $\mathbf{f}$.
  The substrate then settles to a smaller public fiber.
  Past renderings are unaffected; future renderings reflect the new fiber.

## What this object does *not* commit to

- The specific cells in $S^{\mathrm{pub-licit}}$ for any polity.
  That is a governance decision per polity.
- The closure-rule-system $R^{\mathrm{pub}}$.
  PyFARS-the-package provides defaults; polities can extend or restrict.
- The handling of paraconsistent cells ($\top$) in the public fiber.
  A $\top$-cell that's public-licit surfaces a contradiction publicly; whether to suppress, surface, or quarantine is a per-polity choice.

## Boundary cases

- **A cell whose value is $\bot$ (unknown).** Including it in $F^{\mathrm{pub}}$ exposes the *fact* of unknownness.
  Some polities want this (transparency about what's not known); others don't (privacy of speculation).
  The captain's choice.
- **Cells about people.** Personnel records, user-accounts, etc. are obvious privacy concerns.
  The discipline says: nothing is public by default; declaring a personnel cell public-licit is an explicit choice.
- **Settlement timing.** A cell that becomes public-licit at time $\tau$ is in $F^{\mathrm{pub}}(\tau')$ for $\tau' \geq \tau$ but not for $\tau' < \tau$.
  Past renderings of the homepage at earlier times do not retroactively expose newly-public cells.

## Implementation pointers

The public-fiber is currently *not yet implemented* in PyFARS code.
The first implementation will require: - A `public-licit` predicate in the system's reserved-predicates list. - A closure-rule-system $R^{\mathrm{pub}}$ that's a sub-system of PyFARS's main closure rules, restricted to public-licit-anchored derivations. - A render path (`render-as-http-response`) that reads only $F^{\mathrm{pub}}$ when serving unauthenticated requests.

This is the first practice-anchor target.

## Open structural questions

- Whether the public-fiber is computed on-demand per request or maintained as a continuously-settled in-memory structure.
  Performance vs. freshness tradeoff.
- Whether multiple "tiers" of public-fiber exist (public to all, public to authenticated-but-unmapped, public to mapped-personnel) — i.e., the public-fiber as one element of a lattice of view fibers.
- The interaction with paraconsistent cells.
  A public $\top$-cell is both a transparency feature and a potential leak; the discipline is partly settled, partly open.

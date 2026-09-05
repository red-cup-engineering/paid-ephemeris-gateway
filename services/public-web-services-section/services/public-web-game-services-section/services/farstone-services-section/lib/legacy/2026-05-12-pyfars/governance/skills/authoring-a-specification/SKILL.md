---
name: "Authoring a specification"
description: "Takes objects, morphisms, concepts, and math examples (post stage-5 of the roadmap-enrichment cycle) and produces a normative specification in `governance/specifications/`. Use as stage 6 of the roadmap-enrichment cycle."
---


A specification is a normative document that defines what a conformant implementation of a set of pyfars objects, morphisms, and concepts must satisfy.
It uses RFC 2119 normative language (MUST, SHOULD, MAY, SHALL, SHALL NOT, SHOULD NOT).
It lives in `governance/specifications/<slug>.md` and is versioned `YYYY.
MM.
DD.noun`.

Specifications differ from objects/morphisms (which define what structures exist) and from implementation guides (which describe how to code them).
A specification defines *acceptance criteria*: given code that claims to implement these objects/morphisms, what must be true for the claim to hold?

## Requirements

- The [`pyfars-roadmap-enrichment-officer`](../offices/pyfars-roadmap-enrichment-officer.md) office held.
- Stage-4 outputs (objects, morphisms, concepts) and stage-5 outputs (math examples) for the scope being specified.
- Read access to `governance/specifications/` for consistency with existing specs.

## Steps

1. **Determine scope.** A specification covers the objects, morphisms, and concepts from one cycle (or a related set of prior cycles).
  Name what is in scope and what is explicitly out of scope before writing anything else.

2. **Select a slug and version.** Slug: kebab-case noun phrase, e.g., `predication-graph-walk`.
  Version: `YYYY.
  MM.
  DD+noun` (PEP-440 compatible — the `+noun` is the local version identifier), e.g., `2026.05.09+predication-graph-walk` — the noun matches the slug's compact form.

3. **Open the file** at `governance/specifications/<slug>.md` with frontmatter:
   ```yaml
   ---
   title: "<human-readable name>"
   type: specification
   status: draft
   version: "YYYY.MM.DD.noun"
   date: YYYY-MM-DD
   authors: [<officer-slug>, ...]
   derives-from: [<claim-slugs>, <object-slugs>, <morphism-slugs>, <concept-slugs>]
   supersedes: []
   ---
   ```

4. **Write the body** with these sections in order:

**§1 Abstract** — one paragraph: what this specification covers and why it exists.
Not normative.

**§2 Status** — state the current status (`draft`, `candidate`, `normative`, or `retired`) and what that means for implementors.
Draft: not yet stable; may change without notice.
Candidate: stable enough to implement against; changes require versioned supersession.
Normative: binding on all conformant implementations.

**§3 Conformance** — declare RFC 2119 normative language in use.
Define what a "conformant implementation" means for this spec's scope.

**§4 Terminology** — define each technical term used in requirements.
For terms that realize a pyfars concept, cite the concept slug inline: `realizes: <concept-slug>`.

**§5 Requirements** — the normative core.
Numbered requirements using MUST/SHOULD/MAY.
Each requirement must be independently testable (if not, split it), and must cite the object, morphism, or claim it derives from.

**§6 Acceptance criteria** — explicit, checkable conditions for well-formedness.
These are what `pyfars validate` or a test suite checks.
Derived from §5 but stated in terms of observable substrate state, not intent.

**§7 Non-normative examples** — pointers to math examples (stage-5 outputs) and, once authored, code examples.
Explicitly marked non-normative.

**§8 What this specification does not decide** — open questions, out-of-scope items, deferred decisions.
A spec silent on important edge cases is dangerous.
Name the silences.

**§9 References** — two subsections: *Normative* (records this spec depends on for correctness) and *Informative* (records that informed the spec but are not load-bearing).

5. **Review each requirement against the math examples.** Every normative requirement in §5 should be exercised by at least one stage-5 math example, or flagged in §8 as requiring a future example.

6. **Update the cycle record** with `authored-specifications: [<spec-slug>]` and status → `stage-6-specifications-authored`.

## Outcomes

- A `governance/specifications/<slug>.md` record at `status: draft`, with full §1–§9 structure.
- Every stage-4 object and morphism has at least one requirement in §5 that names it.
- The §6 acceptance criteria are the direct inputs to test authoring in the implementation chain.

## Discipline notes

- **Requirements must be testable.** "The graph MUST be well-formed" is a wish.
  "The graph MUST contain at least one predication cell with a non-nil entity field" is a requirement.
- **Don't spec what isn't yet claimed.** A specification derives from claims and objects; it is not a place to introduce new commitments.
  If writing §5 reveals a new commitment is needed, that's a new claim, and a new cycle.
- **MUST is a high bar.** Overuse of MUST produces a spec impossible to implement in stages.
  Use SHOULD for things conformant implementations ought to do but may defer.
  Reserve MUST for invariants that, if violated, break the object's theory-basis.

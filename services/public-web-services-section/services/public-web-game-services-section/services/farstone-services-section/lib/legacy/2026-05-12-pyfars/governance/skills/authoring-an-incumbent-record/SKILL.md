---
name: "Authoring an incumbent record"
description: "Creates an incumbent record in governance/incumbents/ that joins a specific occupant to a specific office at a specific moment, recording institution, induction, and joint-settlement state. Use when the captain installs personnel into an office or when documenting an active incumbency for the first time."
---


## Requirements

- The office record exists in [`governance/offices/`](../offices/) and its powers/duties/immunities are settled.
- An act of institution has occurred (captain's appointment, charter-grounded automatic appointment, etc.).
- The occupant is identifiable (a personnel record, an LLM model identifier, or a named external party).

## Steps

1. Read [`governance/incumbents/_index.md`](../incumbents/_index.md) for the frontmatter schema and the institution/induction distinction.
  Read an existing incumbent record (e.g., [`pyfars-executive-officer--claude-opus-4-7--2026-04`](../incumbents/pyfars-executive-officer--claude-opus-4-7--2026-04.md)) as exemplar.
2. **Identify the slug** as `<office-slug>--<occupant-slug>--<YYYY-MM>` (institution-month suffix disambiguates successive incumbencies).
3. Author frontmatter with `type: incumbent`, `office:`, `occupant:`, `instituted-at:` (ISO timestamp of appointment), `inducted-at:` (ISO timestamp of first dispatch under the office), `relieved-at: null` (until succession), `succeeds:` (prior incumbent slug, if applicable), `vacancy: false`.
4. Author body sections:
   - **Institution** — when and by whom the incumbency was conferred; cite the appointment-act
   - **Induction** — when the occupant first dispatched under the office (joint-settlement opening)
   - **Joint-settlement state** — the two predicates: `(<incumbency>, instituted-into, <office>) = T` and `(<incumbency>, inducted-into, <office>) = T`.
     Both at $\mathbf{t}$ → `status: full`.
   - **Powers and duties active** — list of jural-relations attached to the occupant via the office (link to power and duty records)
   - **Body politic / body natural** — note that the office persists across incumbencies; succession transfers powers without re-settling the office's structural cells.
5. Update prior incumbent record (if any) by setting its `relieved-at:` and `succeeded-by:` cells.

## Outcomes

A new file in [`governance/incumbents/`](../incumbents/) joining occupant to office; the office's powers and duties are now substrate-readable as attached to the occupant.
Audit can trace which agent held which authority at which time.

## Discipline notes

- **Status: vacant** is legitimate.
  An office with no current incumbent (between succession and induction) is `status: vacant`; any attempted exercise of office powers during vacancy is a substrate violation.
- **Don't conflate occupant, incumbency, and office.** The office is the stable governance entity; the incumbency is the join; the occupant is a natural agent.
  The same occupant may hold multiple offices simultaneously (each with its own incumbency record).
- **Per [`link-to-records-not-shortcodes`](../duties/link-to-records-not-shortcodes.md)**, all office and personnel references use markdown links to substrate cells.
- **Hard constraints become immunities.** When an incumbent is barred from acting in some scope (e.g., the XO cannot write under `src/`), that's an `immunity` of the *opposing* office and a `disability` for the incumbent.
  Note these in the body.

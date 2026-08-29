---
title: "How RimWorld informs FARS development"
specialization: research
subject: rimworld
subject-description: "Colony management sim by Ludeon Studios. Colonists with skills, moods, needs, work priorities. AI storyteller generates events. The gold standard for emergent narrative from systems."
library-analysis: library/theories/engineering/theories/tech/theories/computing/texts/rimworld-colony-management-for-agentic-systems.md
date-created: 2026-04-07
informs: [sunday-funday-sprint, operations-loop, cl-pipeline]

# What RimWorld is
architecture: "Colonists are entities with skills (0-20 per type), moods (from needs/thoughts), work priorities (1-4 per work type). Storyteller selects events based on colony wealth and threat level. Emergent narrative from systems interaction, not scripted plot."

# Principles extracted for FARS predication
principles:
  - id: mood-from-needs
    principle: "Colonist mood is computed from needs (hunger, rest, beauty, social) and thoughts (events that happened). Not set directly."
    rimworld-source: "Needs system + thought system → mood value"
    fars-application: "Office mood = closure distance from fixed point. Computed from predicates (assigned work matching specialty, discharge rate, error rate), not set manually."

  - id: work-priorities-are-dispatch
    principle: "Each colonist has priorities (1-4) per work type. The system assigns available work to the best-priority colonist who has the skill."
    rimworld-source: "Work tab — per-colonist, per-work-type priority"
    fars-application: "Office priority per work-type IS the dispatch matching function. respond(office, task) where the priority predicate influences the composition score."

  - id: storyteller-selects-events
    principle: "The AI storyteller picks events based on colony state — not random, not scripted. Rich colony gets raids. Struggling colony gets trade caravans."
    rimworld-source: "Storyteller system (Cassandra, Phoebe, Randy)"
    fars-application: "The /whats-next command IS the storyteller. It reads system state and recommends what to surface. The recommendation is computed from the graph, not random."

  - id: skills-improve-by-doing
    principle: "Colonists gain skill XP by performing that type of work. Skill decays if unused. Natural aptitude (passions) doubles learning rate."
    rimworld-source: "Skill system with XP, decay, passions (minor/major)"
    fars-application: "Office formality level improves by discharging duties of that type. Passion = bilattice affinity from the character sheet. Settlement = XP. Regression = work type not practiced."
---

How RimWorld — the colony management sim — informs FARS development.
RimWorld demonstrates that emergent behavior arises from simple per-entity systems (needs, mood, skills, priorities) interacting.
The mood-from-needs pattern is directly applicable: don't set mood, compute it from predicates.
The work priority system IS dispatch scoring.

See the [RimWorld analysis](../../../../../library/theories/engineering/theories/tech/theories/computing/texts/rimworld-colony-management-for-agentic-systems.md) for the full reading.

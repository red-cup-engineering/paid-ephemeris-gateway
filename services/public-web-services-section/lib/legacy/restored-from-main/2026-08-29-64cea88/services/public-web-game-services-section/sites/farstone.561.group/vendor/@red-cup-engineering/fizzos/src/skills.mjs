import { declareFunctional, tell, value } from "./world.mjs";

export const SKILL_CAP = 100;
const predicate = (skill) => `skill:${skill}`;

export function skillLevel(world, actor, skill) {
  return Number(value(world, actor, predicate(skill)) ?? 0);
}

export function skillTier(level) {
  if (level >= 90) return "master";
  if (level >= 70) return "expert";
  if (level >= 45) return "journeyman";
  if (level >= 20) return "apprentice";
  return "novice";
}

export function practice(world, actor, skill, effort = 1) {
  if (typeof effort !== "number" || !Number.isFinite(effort) || effort <= 0) throw new TypeError("practice effort must be positive and finite");
  const prior = skillLevel(world, actor, skill);
  const gained = effort * Math.max(0, 1 - prior / SKILL_CAP);
  const level = Math.min(SKILL_CAP, prior + gained);
  return Object.freeze({
    prior,
    gained,
    level,
    tier: skillTier(level),
    world: tell(declareFunctional(world, [predicate(skill)]), { subject: actor, predicate: predicate(skill), object: level }, { source: "fizzos.skills" }),
  });
}

export function effectiveSkill(world, actor, skill, synergies = {}) {
  const related = synergies[skill] ?? [];
  const bonus = related.reduce((sum, relatedSkill) => sum + skillLevel(world, actor, relatedSkill) * 0.2, 0);
  return Math.min(SKILL_CAP, skillLevel(world, actor, skill) + bonus);
}

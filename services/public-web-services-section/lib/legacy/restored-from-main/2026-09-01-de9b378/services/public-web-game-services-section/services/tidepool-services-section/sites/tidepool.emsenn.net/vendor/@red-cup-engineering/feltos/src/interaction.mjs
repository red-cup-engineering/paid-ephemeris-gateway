import { contentsOf, declareFunctional, move, placeOf, tell, value } from "./world.mjs";

export function attack(world, attacker, target) {
  if (placeOf(world, attacker) !== placeOf(world, target)) throw new Error("target is not present");
  const weapon = contentsOf(world, attacker).find((item) => value(world, item, "wielded") === true);
  const damage = Number(value(world, attacker, "attack") ?? 1) + Number(weapon === undefined ? 0 : value(world, weapon, "damage") ?? 0);
  const health = Math.max(0, Number(value(world, target, "health") ?? 1) - damage);
  world = tell(declareFunctional(world, ["health", "condition"]), [
    { subject: target, predicate: "health", object: health },
    { subject: target, predicate: "condition", object: health <= 0 ? "dead" : "alive" },
  ], { source: "feltos.combat" });
  return Object.freeze({ world, damage, killed: health <= 0, weapon: weapon ?? null });
}

export function search(world, actor, target) {
  if (placeOf(world, actor) !== placeOf(world, target)) throw new Error("target is not present");
  if (value(world, target, "hidden") !== true) return Object.freeze({ found: false, world });
  return Object.freeze({ found: true, world: tell(declareFunctional(world, ["revealed"]), { subject: target, predicate: "revealed", object: true }, { source: "feltos.search" }) });
}

export function canSee(world, actor, target) {
  return placeOf(world, actor) === placeOf(world, target) && (value(world, target, "hidden") !== true || value(world, target, "revealed") === true);
}

export function unlock(world, actor, door) {
  const key = value(world, door, "key");
  if (typeof key !== "string" || !contentsOf(world, actor).includes(key)) throw new Error("the required key is not carried");
  return tell(declareFunctional(world, ["door-state"]), { subject: door, predicate: "door-state", object: "unlocked" }, { source: "feltos.doors" });
}

export function traverseDoor(world, actor, door) {
  if (value(world, door, "door-state") === "locked") throw new Error("door is locked");
  const destination = value(world, door, "destination");
  if (typeof destination !== "string") throw new Error("door has no destination");
  return move(world, actor, destination, { source: "feltos.doors" });
}

export function teachLanguage(world, actor, language) {
  return tell(declareFunctional(world, [`language:${language}`]), { subject: actor, predicate: `language:${language}`, object: true }, { source: "feltos.languages" });
}

export function renderSpeech(world, speaker, listener, language, text) {
  if (value(world, listener, `language:${language}`) === true || speaker === listener) return text;
  return text.replace(/[A-Za-z]/gu, (character) => "•");
}

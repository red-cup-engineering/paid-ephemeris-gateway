import { contentsOf, declareFunctional, move, placeOf, settledWorld, tell, value } from "./world.mjs";

export function proposeLaw(world, polity, law, proposer) {
  return tell(declareFunctional(world, [`proposal:${law}`]), [
    { subject: polity, predicate: `proposal:${law}`, object: true },
    { subject: polity, predicate: `support:${law}`, object: proposer },
  ], { source: "fizzos.governance" });
}

export function supportLaw(world, polity, law, actor) {
  if (value(world, polity, `proposal:${law}`) !== true) throw new Error(`law is not proposed: ${law}`);
  return tell(world, { subject: polity, predicate: `support:${law}`, object: actor }, { source: "fizzos.governance" });
}

export function enactLaw(world, polity, law, members) {
  const supporters = new Set(settledWorld(world).filter(({ subject, predicate, evidence }) => subject === polity && predicate === `support:${law}` && evidence.positiveEvidence).map(({ object }) => object));
  const quorum = Math.max(1, Math.ceil(members.length / 2));
  if (supporters.size < quorum) return Object.freeze({ enacted: false, supporters: supporters.size, quorum, world });
  world = tell(declareFunctional(world, [`law:${law}`]), { subject: polity, predicate: `law:${law}`, object: true }, { source: "fizzos.governance" });
  return Object.freeze({ enacted: true, supporters: supporters.size, quorum, world });
}

export function defineThought(source) {
  if (typeof source?.id !== "string" || !Number.isSafeInteger(source.duration) || source.duration < 1) throw new TypeError("thought requires id and positive duration");
  return Object.freeze({ kind: "fizzos.thought.v1", id: source.id, duration: source.duration, requires: source.requires ?? null, effects: Object.freeze({ ...(source.effects ?? {}) }) });
}

export function beginThought(world, actor, thought) {
  if (value(world, actor, "active-thought") !== null) throw new Error("only one thought may be internalized at once");
  if (thought.requires !== null && value(world, actor, `experience:${thought.requires}`) !== true) throw new Error(`thought is unavailable without experience: ${thought.requires}`);
  return tell(declareFunctional(world, ["active-thought", "thought-progress"]), [
    { subject: actor, predicate: "active-thought", object: thought.id },
    { subject: actor, predicate: "thought-progress", object: 0 },
  ], { source: "fizzos.thoughts" });
}

export function internalizeThought(world, actor, thought) {
  if (value(world, actor, "active-thought") !== thought.id) return Object.freeze({ fixed: false, world });
  const progress = Number(value(world, actor, "thought-progress") ?? 0) + 1;
  if (progress < thought.duration) return Object.freeze({ fixed: false, world: tell(world, { subject: actor, predicate: "thought-progress", object: progress }, { source: "fizzos.thoughts" }) });
  const claims = [
    { subject: actor, predicate: "active-thought", object: null, evidence: "false" },
    { subject: actor, predicate: "thought-progress", object: 0 },
    { subject: actor, predicate: `thought:${thought.id}`, object: true },
  ];
  for (const [predicate, delta] of Object.entries(thought.effects)) claims.push({ subject: actor, predicate, object: Number(value(world, actor, predicate) ?? 0) + delta });
  return Object.freeze({ fixed: true, world: tell(declareFunctional(world, Object.keys(thought.effects)), claims, { source: "fizzos.thoughts" }) });
}

export function campaignStage(world, actor, stages) {
  let reached = 0;
  for (const [index, stage] of stages.entries()) {
    if (stage.requirements.every(({ predicate, atLeast }) => Number(value(world, actor, predicate) ?? 0) >= atLeast)) reached = index + 1;
    else break;
  }
  return reached;
}

export function awardCampaign(world, actor, stages) {
  const reached = campaignStage(world, actor, stages);
  const prior = Number(value(world, actor, "campaign-stage") ?? 0);
  let reward = 0;
  for (let index = prior; index < reached; index += 1) reward += stages[index].reward ?? 0;
  world = tell(declareFunctional(world, ["campaign-stage", "coin"]), [
    { subject: actor, predicate: "campaign-stage", object: reached },
    { subject: actor, predicate: "coin", object: Number(value(world, actor, "coin") ?? 0) + reward },
  ], { source: "fizzos.campaign" });
  return Object.freeze({ reached, reward, complete: reached === stages.length, world });
}

export function createShip(world, { id, owner, room, name = id }) {
  world = tell(declareFunctional(world, ["owner", "located-in"]), [
    { subject: id, predicate: "kind", object: "ship" },
    { subject: id, predicate: "name", object: name },
    { subject: id, predicate: "owner", object: owner },
    { subject: id, predicate: "located-in", object: room },
  ], { source: "fizzos.ships" });
  return world;
}

export function boardShip(world, actor, ship) { return move(world, actor, ship, { source: "fizzos.ships.board" }); }

export function sailShip(world, actor, ship, destination) {
  if (placeOf(world, actor) !== ship) throw new Error("actor is not aboard ship");
  if (value(world, ship, "owner") !== actor) throw new Error("actor lacks command rights");
  return move(world, ship, destination, { source: "fizzos.ships.sail" });
}

export function crewOf(world, ship) { return contentsOf(world, ship); }

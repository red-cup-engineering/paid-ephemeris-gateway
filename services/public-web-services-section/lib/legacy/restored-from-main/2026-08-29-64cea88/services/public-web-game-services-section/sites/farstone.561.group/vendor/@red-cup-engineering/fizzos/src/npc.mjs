import { contentsOf, declareFunctional, move, placeOf, tell, value } from "./world.mjs";

const needPredicate = (need) => `need:${need}`;

export function need(world, actor, name) {
  return Number(value(world, actor, needPredicate(name)) ?? 0);
}

export function driftNeeds(world, actor, rates = { hunger: 1, fatigue: 0.5 }) {
  const claims = Object.entries(rates).map(([name, rate]) => ({
    subject: actor,
    predicate: needPredicate(name),
    object: Math.max(0, Math.min(100, need(world, actor, name) + rate)),
  }));
  return tell(declareFunctional(world, claims.map(({ predicate }) => predicate)), claims, { source: "fizzos.npc.needs" });
}

export function moodOf(world, actor) {
  const hunger = need(world, actor, "hunger");
  const fatigue = need(world, actor, "fatigue");
  return hunger >= 80 ? "desperate" : fatigue >= 70 ? "weary" : hunger >= 40 ? "restless" : "content";
}

export function chooseNpcAction(world, actor, { rivals = [] } = {}) {
  const room = placeOf(world, actor);
  const food = room === null ? undefined : contentsOf(world, room).find((item) => value(world, item, "food") === true);
  if (need(world, actor, "hunger") >= 60 && food !== undefined) return Object.freeze({ kind: "eat", target: food, utility: 100 });
  if (need(world, actor, "hunger") >= 60) return Object.freeze({ kind: "seek-food", utility: 60 });
  const rival = rivals.find((candidate) => placeOf(world, candidate) === room);
  if (rival !== undefined && Number(value(world, actor, `grievance:${rival}`) ?? 0) >= 50) return Object.freeze({ kind: "attack", target: rival, utility: 50 });
  return Object.freeze({ kind: "idle", utility: 0 });
}

export function enactNpcAction(world, actor, action) {
  if (action.kind === "eat") {
    world = move(world, action.target, "fizzos:void", { source: "fizzos.npc.eat" });
    return tell(declareFunctional(world, [needPredicate("hunger")]), { subject: actor, predicate: needPredicate("hunger"), object: Math.max(0, need(world, actor, "hunger") - 60) }, { source: "fizzos.npc.eat" });
  }
  return world;
}

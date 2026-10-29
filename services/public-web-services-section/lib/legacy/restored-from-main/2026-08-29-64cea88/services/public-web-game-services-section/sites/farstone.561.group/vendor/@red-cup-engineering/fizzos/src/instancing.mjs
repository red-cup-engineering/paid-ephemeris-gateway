import { declareFunctional, move, settledWorld, tell, value } from "./world.mjs";

export function instantiate(world, { templateRooms, owner, instance }) {
  if (!Array.isArray(templateRooms) || templateRooms.length === 0) throw new TypeError("instance requires template rooms");
  const namespace = `instance:${instance}:${owner}`;
  const mapping = Object.fromEntries(templateRooms.map((room) => [room, `${namespace}:${room}`]));
  const claims = [];
  for (const room of templateRooms) {
    for (const cell of settledWorld(world).filter(({ subject, evidence }) => subject === room && evidence.positiveEvidence)) {
      const object = typeof cell.object === "string" && mapping[cell.object] !== undefined ? mapping[cell.object] : cell.object;
      claims.push({ subject: mapping[room], predicate: cell.predicate, object });
    }
    claims.push({ subject: mapping[room], predicate: "instance-owner", object: owner });
  }
  for (const cell of settledWorld(world).filter(({ predicate, object, evidence }) => predicate === "located-in" && templateRooms.includes(object) && evidence.positiveEvidence)) {
    const clone = `${namespace}:${cell.subject}`;
    for (const source of settledWorld(world).filter(({ subject, evidence }) => subject === cell.subject && evidence.positiveEvidence)) {
      claims.push({ subject: clone, predicate: source.predicate, object: source.predicate === "located-in" ? mapping[source.object] : source.object });
    }
    claims.push({ subject: clone, predicate: "instance-owner", object: owner });
  }
  world = tell(declareFunctional(world, ["instance-owner"]), claims, { source: "fizzos.instancing" });
  return Object.freeze({ world, namespace, mapping: Object.freeze(mapping), entry: mapping[templateRooms[0]] });
}

export function destroyInstance(world, namespace) {
  const subjects = [...new Set(settledWorld(world).filter(({ subject }) => subject.startsWith(`${namespace}:`)).map(({ subject }) => subject))];
  for (const subject of subjects) world = move(world, subject, "fizzos:void", { source: "fizzos.instancing.destroy" });
  return world;
}

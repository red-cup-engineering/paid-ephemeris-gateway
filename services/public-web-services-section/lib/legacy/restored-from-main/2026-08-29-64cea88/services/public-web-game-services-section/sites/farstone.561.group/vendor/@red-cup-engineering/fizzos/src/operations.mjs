import { declareFunctional, move, placeOf, tell, value } from "./world.mjs";

function requireCreator(world, actor) {
  if (value(world, actor, "creator") !== true) throw new Error("creator capability required");
}

export function grantCreator(world, actor) {
  return tell(declareFunctional(world, ["creator"]), { subject: actor, predicate: "creator", object: true }, { source: "fizzos.bootstrap" });
}

export function createRoom(world, actor, { id, name, description }) {
  requireCreator(world, actor);
  return tell(world, [
    { subject: id, predicate: "kind", object: "room" },
    { subject: id, predicate: "name", object: name },
    { subject: id, predicate: "description", object: description },
  ], { source: `fizzos.creator:${actor}` });
}

export function createThing(world, actor, { id, name, description, location = placeOf(world, actor) }) {
  requireCreator(world, actor);
  return tell(world, [
    { subject: id, predicate: "kind", object: "thing" },
    { subject: id, predicate: "name", object: name },
    { subject: id, predicate: "description", object: description },
    { subject: id, predicate: "located-in", object: location },
  ], { source: `fizzos.creator:${actor}` });
}

export function mute(world, actor, target, muted = true) {
  requireCreator(world, actor);
  return tell(declareFunctional(world, ["muted"]), { subject: target, predicate: "muted", object: muted }, { source: "fizzos.moderation" });
}

export function teleport(world, actor, target, destination) {
  requireCreator(world, actor);
  return move(world, target, destination, { source: "fizzos.moderation" });
}

export function setAlias(world, actor, alias, expansion) {
  return tell(declareFunctional(world, [`alias:${alias}`]), { subject: actor, predicate: `alias:${alias}`, object: expansion }, { source: "fizzos.alias" });
}

export function expandAlias(world, actor, command) {
  const [verb, ...rest] = command.trim().split(/\s+/u);
  const expansion = value(world, actor, `alias:${verb}`);
  return typeof expansion === "string" ? `${expansion}${rest.length > 0 ? ` ${rest.join(" ")}` : ""}` : command;
}

export function chooseProfession(world, actor, profession) {
  return tell(declareFunctional(world, ["profession"]), { subject: actor, predicate: "profession", object: profession }, { source: "fizzos.profession" });
}

export function sendMail(world, from, to, subject, body) {
  const id = `mail:${world.sequence + 1}`;
  return tell(world, [
    { subject: id, predicate: "kind", object: "mail" },
    { subject: id, predicate: "mail-from", object: from },
    { subject: id, predicate: "mail-to", object: to },
    { subject: id, predicate: "name", object: subject },
    { subject: id, predicate: "mail-body", object: body },
  ], { source: "fizzos.mail" });
}

export function mailbox(world, actor) {
  const ids = new Set(world.assertions.filter(({ predicate, object }) => predicate === "mail-to" && object === actor).map(({ subject }) => subject));
  return Object.freeze([...ids].sort().map((id) => Object.freeze({ id, from: value(world, id, "mail-from"), subject: value(world, id, "name"), body: value(world, id, "mail-body") })));
}

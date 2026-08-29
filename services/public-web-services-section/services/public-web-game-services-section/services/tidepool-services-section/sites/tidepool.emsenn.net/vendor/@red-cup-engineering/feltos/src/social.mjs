import { declareFunctional, settledWorld, tell, value } from "./world.mjs";

const partyPredicate = "party";
const guildPredicate = "guild";

export function foundParty(world, leader) {
  const id = `party:${leader}`;
  world = tell(declareFunctional(world, [partyPredicate]), [
    { subject: id, predicate: "kind", object: "party" },
    { subject: id, predicate: "leader", object: leader },
    { subject: leader, predicate: partyPredicate, object: id },
  ], { source: "feltos.social.party" });
  return Object.freeze({ id, world });
}

export function joinParty(world, actor, party) {
  if (value(world, party, "kind") !== "party") throw new Error(`unknown party: ${party}`);
  return tell(declareFunctional(world, [partyPredicate]), { subject: actor, predicate: partyPredicate, object: party }, { source: "feltos.social.party" });
}

export function partyMembers(world, party) {
  return Object.freeze(settledWorld(world).filter(({ predicate, object, evidence }) => predicate === partyPredicate && object === party && evidence.positiveEvidence).map(({ subject }) => subject).sort());
}

export function foundGuild(world, founder, name) {
  if (typeof name !== "string" || name.trim().length === 0) throw new TypeError("guild name must be non-empty text");
  const id = `guild:${founder}`;
  world = tell(declareFunctional(world, [guildPredicate]), [
    { subject: id, predicate: "kind", object: "guild" },
    { subject: id, predicate: "leader", object: founder },
    { subject: id, predicate: "name", object: name.trim() },
    { subject: founder, predicate: guildPredicate, object: id },
  ], { source: "feltos.social.guild" });
  return Object.freeze({ id, world });
}

export function joinGuild(world, actor, guild) {
  if (value(world, guild, "kind") !== "guild") throw new Error(`unknown guild: ${guild}`);
  return tell(declareFunctional(world, [guildPredicate]), { subject: actor, predicate: guildPredicate, object: guild }, { source: "feltos.social.guild" });
}

export function guildMembers(world, guild) {
  return Object.freeze(settledWorld(world).filter(({ predicate, object, evidence }) => predicate === guildPredicate && object === guild && evidence.positiveEvidence).map(({ subject }) => subject).sort());
}

export function awardExperience(world, actor, amount) {
  if (!Number.isFinite(amount) || amount < 0) throw new TypeError("experience must be nonnegative and finite");
  const xp = Number(value(world, actor, "xp") ?? 0) + amount;
  return tell(declareFunctional(world, ["xp"]), { subject: actor, predicate: "xp", object: xp }, { source: "feltos.social.xp" });
}

export function titleFor(world, actor) {
  const xp = Number(value(world, actor, "xp") ?? 0);
  if (xp >= 1000) return "legend";
  if (xp >= 500) return "veteran";
  if (xp >= 100) return "adventurer";
  return "newcomer";
}

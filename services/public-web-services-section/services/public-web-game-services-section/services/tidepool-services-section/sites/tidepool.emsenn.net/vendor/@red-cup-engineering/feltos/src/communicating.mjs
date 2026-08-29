import { fourName, fourNamed, joinKnowledge } from "./four.mjs";

export function meme({ id, topic, content, charge = "neither", mode = "assertion" }) {
  if (![id, topic].every((entry) => typeof entry === "string" && entry.length > 0)) throw new TypeError("meme requires id and topic");
  fourNamed(charge);
  return Object.freeze({ kind: "feltos.meme.v1", id, topic, content, charge, mode });
}

export function composeMemes(left, right) {
  if (left.topic !== right.topic) throw new Error("memes occupy different topics");
  return meme({
    id: `${left.id}+${right.id}`,
    topic: left.topic,
    content: Object.freeze([left.content, right.content]),
    charge: fourName(joinKnowledge(fourNamed(left.charge), fourNamed(right.charge))),
    mode: left.mode === right.mode ? left.mode : "metalingual",
  });
}

export function assertMeme(ground, source) {
  return Object.freeze({ ...ground, [source.id]: Object.freeze({ ...source, mode: "common-ground" }) });
}

export function challengeMeme(ground, id) {
  const next = { ...ground };
  delete next[id];
  return Object.freeze(next);
}

export function commonGround(members) {
  if (members.length === 0) return Object.freeze({});
  const ids = members.map((section) => new Set(Object.keys(section)));
  const common = [...ids[0]].filter((id) => ids.every((set) => set.has(id))).sort();
  return Object.freeze(Object.fromEntries(common.map((id) => [id, members.map((section) => section[id]).reduce(composeMemes)])));
}

export function discourseCohesion(memes) {
  const topics = new Map();
  for (const entry of memes) topics.set(entry.topic, (topics.get(entry.topic) ?? 0) + 1);
  return Object.freeze({
    memes: memes.length,
    topics: topics.size,
    repeatedTopics: [...topics.values()].filter((count) => count > 1).length,
    cohesion: memes.length === 0 ? 0 : (memes.length - topics.size) / memes.length,
  });
}

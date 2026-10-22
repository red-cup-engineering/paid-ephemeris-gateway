export function soulEmote({ actor, target = null, actorText, roomText, targetText = roomText }) {
  if (![actor, actorText, roomText].every((entry) => typeof entry === "string" && entry.length > 0)) throw new TypeError("soul emote requires actor and text");
  return Object.freeze({ kind: "fizzos.soul-emote.v1", actor, target, actorText, roomText, targetText });
}

export function renderSoul(emote, viewer) {
  if (viewer === emote.actor) return emote.actorText;
  if (emote.target !== null && viewer === emote.target) return emote.targetText;
  return emote.roomText;
}

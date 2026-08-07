/**
 * meme-morphisms — communicating as the meme endomorphism monoid.
 *
 * Every morphism is Meme → Meme. Two groups: meme-direct (domain = memeCarrier,
 * input is the meme itself) and carrier-wrapping (domain = input carrier
 * { meme, ...options }).
 */
import {
  communicateAction,
  negateAction,
  conflateAction,
  semioseAction,
  illocuteAction,
  quoteAction,
  referAction,
  presupposeAction,
  composeAction,
  modalizeAction,
  translateAction,
} from "@emsenn/communicating";
import { meme, cell, token, mark, charge, chargeValue } from "@emsenn/relating";

// ── build a meme ─────────────────────────────────────────────────────────────────
const c = cell(token(mark("Alice")), mark("predicate:says"), token(mark("hello")));
const m = meme(c, charge(chargeValue("potential"), [[mark("w")], []]));

console.log("meme kind:", m.kind); // "predication.fiber.meme"

// ── meme-direct morphisms (pass the meme as the sole input) ──────────────────────
const transmitted = communicateAction.run(m, {});  // identity: faithful transmission
const negated     = negateAction.run(m, {});       // swap truth/falsity sides
const conflated   = conflateAction.run(m, {});     // bilattice consistency complement
const interpretant = semioseAction.run(m, {});     // advance to the interpretant

console.log("transmitted charge:", transmitted.charge.value);  // "potential"
console.log("negated charge:", negated.charge.value);          // swapped

// ── carrier-wrapping morphisms (pass { meme, ...options }) ───────────────────────
const asserted  = illocuteAction.run({ meme: m, force: "assertive" }, {});
const quoted    = quoteAction.run({ meme: m, position: "subject" }, {});
const referred  = referAction.run({ meme: m, entity: "alice", position: "subject" }, {});
const presupposed = presupposeAction.run({ meme: m, trigger: "factive" }, {});
const composed  = composeAction.run({ meme: m, with: transmitted }, {});
const modalized = modalizeAction.run({ meme: m, mode: "evidential", witness: "evidential" }, {});
const translated = translateAction.run({ meme: m, target: "french-discourse" }, {});

console.log("illocution force:", asserted.kind);
console.log("composed kind:", composed.kind);    // still a meme
console.log("modalized kind:", modalized.kind);  // still a meme

// all morphisms produce memes (the monoid is closed)
for (const [name, result] of [
  ["communicate", transmitted], ["negate", negated], ["conflate", conflated],
  ["semiose", interpretant], ["illocute", asserted], ["quote", quoted],
  ["refer", referred], ["presuppose", presupposed], ["compose", composed],
  ["modalize", modalized], ["translate", translated],
]) {
  console.assert(result.kind === "predication.fiber.meme", `${name} must produce a meme`);
}
console.log("all 11 morphisms produce memes ✓");

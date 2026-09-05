// codex — the Four Ways: Aletheon's in-world culture reads the world in the four lights of the
// bilattice, and the game teaches the actual math by letting you WITNESS each one in play. Each
// entry pairs the in-world reading (lore) with the plain mathematical fact (lesson) — so a player
// learns voidmath's four values, the knowledge order, and contradiction-as-a-value by living them.
// Shared so the server can speak of a Way by its glyph and the client can render the full teaching.

export const WAYS = {
  "⊥": {
    glyph: "⊥", name: "the Unseen", way: "the Way of the Open Hand",
    keeper: "Veilwarden",
    lore: "What you have not yet met. Not false — simply unsettled, held open. The far rings are ⊥ until you walk them.",
    lesson: "⊥ (bottom) — NO evidence either way. The honest starting state of every cell before you witness it. Knowledge only grows from here.",
  },
  t: {
    glyph: "t", name: "the Standing", way: "the Way of the Lit Lamp",
    keeper: "Lampkeeper",
    lore: "What is, and is affirmed. A living creature, a place you have seen, a thing you have made hold.",
    lesson: "t (true) — POSITIVE evidence only. Something is affirmed and not denied. To make a thing t is to settle it into being.",
  },
  f: {
    glyph: "f", name: "the Fallen", way: "the Way of the Closed Gate",
    keeper: "Gatekeeper",
    lore: "What has been struck down past bearing. Negative evidence is not a missing plus — it is its own assertion, the converse said aloud.",
    lesson: "f (false) — NEGATIVE evidence only. In combat, each blow is one unit of it; when it overwhelms the positive face, the cell settles to f. Death is a predication, not a deletion.",
  },
  "⊤": {
    glyph: "⊤", name: "the Held", way: "the Way of the Two-Faced Coin",
    keeper: "Reconciler",
    lore: "What is at once alive and slain. The realm does not pick a side or break — it HOLDS the contradiction, and lets it walk as a Corrupted Anomaly.",
    lesson: "⊤ (top) — BOTH faces asserted at once. Not an error: a first-class value. Re-assert life onto a slain cell and the knowledge-join gives ⊤. This is why the world runs on a bilattice and not a boolean.",
  },
};

export const WAY_ORDER = ["⊥", "t", "f", "⊤"];
export const wayOf = (glyph) => WAYS[glyph] || null;

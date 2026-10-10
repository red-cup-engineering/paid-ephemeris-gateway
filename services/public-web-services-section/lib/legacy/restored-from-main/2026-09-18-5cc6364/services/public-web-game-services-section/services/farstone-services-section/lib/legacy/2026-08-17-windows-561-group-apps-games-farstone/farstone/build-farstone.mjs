// build-farstone — seed the Farstone world by DOING. This is the canonical source of the
// example: it builds the world with the package's own operations (doing / declareConverse), so
// dual-filing, reification, and the converse declaration are all exercised exactly as play
// would exercise them. Run it to (re)generate the committed seed logs:
//
//   node examples/farstone/build-farstone.mjs            # write into examples/farstone/
//   node examples/farstone/build-farstone.mjs <targetdir># write a fresh copy elsewhere
//
// Farstone is a small New-England harbor island: Mt Farstone over a single watershed, the Farr
// River down to Farston Harbor, a tidal marsh, the ferry to the mainland. Grounded, municipal,
// salt-worn (permits, budgets, water-quality disputes) — the content is ported from the prior
// Farstone in the tab archive; the vibe is the point, not the specifics. Tick 0 (seed) only —
// the autonomous tide/ferry/fog/permit motion is what `ticking` adds when the world runs.

import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { rm } from "node:fs/promises";
import doing, { declareConverse } from "#doing";

const HERE = dirname(fileURLToPath(import.meta.url));

export default async function buildFarstone(root = HERE) {
  let seq = 0;
  const t = () => `seed:${String(++seq).padStart(6, "0")}`;
  // The seed is the AMBIENT ground of the world — not any one observer's private cut — so it
  // carries no agent. Every actor (player or npc) can therefore perceive the shared world; only
  // an actor's OWN later doings are attributed to it (and thus private until perceived).
  const say = (subject, predicate, object) => doing({ root, subject, predicate, object, t: t() });

  // The dimension — one world-plane carrying the clock the self-running world advances.
  await say("farstone", "kind", "dimension");
  await say("farstone", "naming", "Farstone");
  await say("farstone", "describing", "A small granite island off a cool maritime coast: one mountain, one river, one harbor town, a tidal marsh, and a weather-held ferry to the mainland.");
  await say("farstone", "weather", "clear");

  // Places. naming/describing/exit-<dir> are predications, never has-x fields.
  const place = async (id, kind, name, desc, exits) => {
    await say(id, "kind", kind);
    await say(id, "naming", name);
    await say(id, "describing", desc);
    for (const [dir, dest] of Object.entries(exits)) await say(id, `exit-${dir}`, dest);
    await say("farstone", "contains", id); // the dimension contains its areas (relational, dual-filed)
  };

  await place("mt-farstone", "area", "Mt Farstone",
    "The island's central peak, 620m, granite outcrops above the treeline and mixed conifer-broadleaf forest below. Its catchment feeds the Farr River and every spring on the island.",
    { down: "the-ridge", north: "north-shore", south: "farr-river" });
  await place("the-ridge", "area", "The Ridge",
    "Residential lots stair-stepping up Mt Farstone's southwest shoulder from the upper end of downtown. The Mt Farstone trailhead is at the top of Ridge Road.",
    { up: "mt-farstone", down: "downtown-farston" });
  await place("downtown-farston", "area", "Downtown Farston",
    "The central business district along Main Street: city hall in a converted Victorian, the records office, the volunteer fire station, the post office, the library, and the general store.",
    { up: "the-ridge", south: "harbor-district", west: "farr-valley", east: "marsh-end" });
  await place("harbor-district", "area", "The Harbor District",
    "The working waterfront on the south side of town: ferry terminal, fish-pier, the harbormaster's office, boatyards, a chandlery, and harbor-side cafés. The Farr River meets the sea at its western edge.",
    { north: "downtown-farston", south: "farston-harbor", west: "farr-river" });
  await place("farston-harbor", "area", "Farston Harbor",
    "The south-coast embayment, protected by a granite breakwater, deep enough at most tides for the mainland ferry and the fishing fleet.",
    { north: "harbor-district", south: "south-point-light" });
  await place("south-point-light", "area", "South Point Light",
    "The automated lighthouse (1872) on the harbor approach, its lamp long since unmanned but its lantern room still sound.",
    { north: "farston-harbor" });
  await place("farr-river", "area", "The Farr River",
    "The island's only meaningful watercourse, off Mt Farstone's southern flank past the municipal well-field, through the valley, to the harbor.",
    { up: "mt-farstone", east: "harbor-district", west: "farr-valley" });
  await place("farr-valley", "area", "Farr Valley",
    "The agricultural river valley: hay and row crops, two orchards, four working dairies, scattered farmsteads.",
    { east: "downtown-farston", north: "farr-river" });
  await place("north-shore", "area", "North Shore",
    "The rural strip along the north coast, scattered homes on long lots, conifer-broadleaf forest and intermittent streams between them.",
    { south: "mt-farstone", east: "the-marsh" });
  await place("the-marsh", "area", "The Marsh",
    "The salt marsh in the island's northeast corner, ~3km² of tidal grass and brackish flats, home to a soft-shell clam bed and a state-listed common-tern colony.",
    { south: "marsh-end", west: "north-shore" });
  await place("marsh-end", "area", "Marsh-End",
    "The northeast neighborhood where the town grid loosens into rural lots before the marshland.",
    { west: "downtown-farston", north: "the-marsh" });

  // Items. located-in is relational (dual-filed at the place) and functional (one place at a time).
  const item = async (id, name, desc, where) => {
    await say(id, "kind", "item");
    await say(id, "naming", name);
    await say(id, "describing", desc);
    await say(id, "located-in", where);
  };
  await item("a-brass-bell", "a brass harbor bell", "A harbor bell gone green with verdigris, rung for fog and for ceremony.", "harbor-district");
  await item("a-clam-rake", "a clam rake", "A short-tined clam rake, its handle silvered by salt.", "the-marsh");
  await item("a-storm-lantern", "a storm lantern", "A storm lantern with a cracked but serviceable lens.", "south-point-light");
  await item("a-coil-of-net", "a coil of fishing net", "A coil of fishing net, faintly reeking of the last catch.", "farston-harbor");
  await item("a-trail-map", "a weathered trail map", "A hand-corrected map of the informal routes up Mt Farstone.", "the-ridge");

  // The harbormaster — an npc whose moves the TICK fires. perceives sets its Umwelt: it senses
  // names, descriptions, the bell, and the tide. respond(npc, situation) is what ticking runs.
  await say("takeshi-aoki", "kind", "npc");
  await say("takeshi-aoki", "mover", "tick");
  await say("takeshi-aoki", "naming", "Takeshi Aoki, the harbormaster");
  await say("takeshi-aoki", "describing", "Thirty years on the water; lives aboard his sloop in the warm half of the year, a rented flat above the harbor café in winter.");
  await say("takeshi-aoki", "located-in", "harbor-district");
  for (const p of ["naming", "describing", "ringing", "phase", "status"]) await say("takeshi-aoki", "perceives", p);
  // His behavior is DATA, not engine code: when he perceives the bell ringing for fog, he tends
  // it. The tick engine is generic; this rule is what makes the harbormaster the harbormaster.
  await say("takeshi-aoki", "intends", {
    when: { predicate: "ringing", object: "for-fog" },
    do: { predicate: "tending", object: "the-fog-bell" },
  });

  // Permit #23 — the standing matter that goes contradictory under its own clock. It is within
  // its decision window (a positive assertion), and `overdue` is declared its converse; when the
  // tick ages it past 30 the world files `overdue` and the cell settles to ⊤ — a real situation.
  await say("permit-23", "kind", "item");
  await say("permit-23", "naming", "Building Permit #23");
  await say("permit-23", "describing", "One of fourteen applications before Building & Safety; the charter requires a decision inside thirty days.");
  await say("permit-23", "located-in", "downtown-farston");
  await say("permit-23", "within-window", "building-permit");
  await declareConverse(root, "permit-23", "within-window", "overdue", t());

  // A player — bound to a session, not the tick. Inert in this seed (session input is a gap),
  // present so the world has someone to perceive it.
  await say("you", "kind", "player");
  await say("you", "mover", "session");
  await say("you", "naming", "you");
  await say("you", "located-in", "harbor-district");
  for (const p of ["naming", "describing", "ringing", "phase", "status"]) await say("you", "perceives", p);

  return { root, rows: seq };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const target = process.argv[2] || HERE;
  if (process.argv[2]) await rm(target, { recursive: true, force: true });
  const { rows } = await buildFarstone(target);
  console.log(`✓ built Farstone seed: ${rows} intra-actions under ${target}`);
}

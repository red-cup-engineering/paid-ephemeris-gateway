// build-farstone — posits the Farstone island world onto the on-disk trace (doing/changing).
// Farstone is TAB's dev testground (the pyfars island-polity testbed, rebuilt as a MUD world):
// 11 places from its lore with map-consistent bidirectional exits, plus a few items. NOT canon
// Teraum/Okagana — a sandbox to develop NPCs/combat against. Re-running is settle-idempotent
// (naming/exit re-posits settle to the same value; located-in latest-t wins).
//
// buildFarstone(root) → [room slugs]. CLI: `node build-farstone.mjs <root>`.

import doing from '#doing';
import changing from '#changing';
import { now } from '#clock';

const ROOMS = {
  'mt-farstone': "Mt Farstone — the island's central peak, 620m, granite outcrops above the treeline and mixed conifer-broadleaf forest below. Its catchment feeds the Farr River and every spring on the island.",
  'the-ridge': 'The Ridge — residential lots stair-stepping up Mt Farstone\'s southwest shoulder from the upper end of downtown. The Mt Farstone trailhead is at the top of Ridge Road.',
  'downtown-farston': 'Downtown Farston — the central business district along Main Street: city hall in a converted Victorian, the records office, the volunteer fire station, the post office, the library, and the general store.',
  'harbor-district': "The Harbor District — the working waterfront on the south side of town: ferry terminal, fish-pier, the harbormaster's office, boatyards, a chandlery, and harbor-side cafés. The Farr River meets the sea at its western edge.",
  'farston-harbor': 'Farston Harbor — the south-coast embayment, protected by a granite breakwater, deep enough at most tides for the mainland ferry and the fishing fleet.',
  'south-point-light': "South Point Light — the lighthouse at the island's southern tip, established 1872, automated since 1987, marking the approach to Farston Harbor and the Farr River bar.",
  'farr-valley': "Farr Valley — the agricultural river valley running from Mt Farstone's southern flanks down to the upper edge of town: hay, row crops, two orchards, four working dairies.",
  'farr-river': "The Farr River — the island's only meaningful watercourse, descending from Mt Farstone's flanks past the municipal well-field, through Farr Valley, and into Farston Harbor.",
  'the-marsh': "The Marsh — the salt marsh in the island's northeast corner, ~3km² of tidal grass and brackish flats, home to a soft-shell clam bed and a state-listed common-tern colony.",
  'marsh-end': "Marsh-End — the town's northeast neighborhood, where Main Street's grid loosens into rural lots before giving way to the marsh.",
  'north-shore': "North Shore — the rural strip along the island's north coast: scattered homes on long lots, separated by stands of conifer-broadleaf forest and intermittent streams.",
};

// Directed exits (each listed once per room; reverses included). Map-consistent (north-up).
const EXITS = [
  ['mt-farstone', 'down', 'the-ridge'], ['mt-farstone', 'north', 'north-shore'], ['mt-farstone', 'south', 'farr-river'],
  ['the-ridge', 'up', 'mt-farstone'], ['the-ridge', 'down', 'downtown-farston'],
  ['downtown-farston', 'up', 'the-ridge'], ['downtown-farston', 'south', 'harbor-district'], ['downtown-farston', 'west', 'farr-valley'], ['downtown-farston', 'east', 'marsh-end'],
  ['harbor-district', 'north', 'downtown-farston'], ['harbor-district', 'south', 'farston-harbor'], ['harbor-district', 'west', 'farr-river'],
  ['farston-harbor', 'north', 'harbor-district'], ['farston-harbor', 'south', 'south-point-light'],
  ['south-point-light', 'north', 'farston-harbor'],
  ['farr-valley', 'east', 'downtown-farston'], ['farr-valley', 'north', 'farr-river'],
  ['farr-river', 'north', 'mt-farstone'], ['farr-river', 'south', 'farr-valley'], ['farr-river', 'east', 'harbor-district'],
  ['the-marsh', 'south', 'marsh-end'], ['the-marsh', 'west', 'north-shore'],
  ['marsh-end', 'west', 'downtown-farston'], ['marsh-end', 'north', 'the-marsh'],
  ['north-shore', 'east', 'the-marsh'], ['north-shore', 'south', 'mt-farstone'],
];

const ITEMS = [
  ['a-trail-map', 'a weathered trail map', 'A hand-corrected map of the informal route up Mt Farstone.', 'the-ridge'],
  ['a-brass-bell', 'a brass harbor bell', 'A harbor bell gone green with verdigris, rung for fog and for ceremony.', 'harbor-district'],
  ['a-clam-rake', 'a clam rake', 'A short-tined clam rake, its handle silvered by salt.', 'the-marsh'],
  ['a-storm-lantern', 'a storm lantern', 'A storm lantern with a cracked but serviceable lens.', 'south-point-light'],
  ['a-coil-of-net', 'a coil of net', 'A coil of fishing net, faintly reeking of the last catch.', 'farston-harbor'],
];

export async function buildFarstone(root) {
  const t = now; // shared wall-time clock — build rows sort before any later runtime rows
  for (const slug of Object.keys(ROOMS)) {
    const [name, ...rest] = ROOMS[slug].split(' — ');
    await doing({ root, subject: slug, predicate: 'naming', object: name, t: t() });
    await doing({ root, subject: slug, predicate: 'describing', object: rest.join(' — '), t: t() });
  }
  for (const [from, dir, to] of EXITS) await doing({ root, subject: from, predicate: 'exit-' + dir, object: to, t: t() });
  for (const [slug, name, desc, loc] of ITEMS) {
    await doing({ root, subject: slug, predicate: 'naming', object: name, t: t() });
    await doing({ root, subject: slug, predicate: 'describing', object: desc, t: t() });
    await changing({ root, subject: slug, predicate: 'located-in', object: loc, t: t() });
  }
  return Object.keys(ROOMS);
}

export const FARSTONE_ROOMS = Object.keys(ROOMS);
export const FARSTONE_START = 'downtown-farston';

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = process.argv[2];
  if (!root) { console.error('usage: node build-farstone.mjs <world-root>'); process.exit(1); }
  buildFarstone(root).then((rs) => console.log(`built Farstone: ${rs.length} rooms into ${root}`));
}

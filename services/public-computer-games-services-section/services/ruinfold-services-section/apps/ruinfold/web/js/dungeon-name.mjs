// dungeon-name.mjs — a cosmetic flavor name for a daily, derived deterministically from its seed
// via the SAME mulberry32 the generator itself uses (#engine/prng.mts) — never Math.random(). The
// seed number is the only real "identity" anywhere else in the system; this is presentation only.

import { mulberry32, pick } from "#engine/prng.mts";

const ADJ = [
  "Ashfallen", "Hollow", "Rust-Bitten", "Gravebound", "Wraithlit", "Cindermarked",
  "Bone-Cold", "Moonshadowed", "Rootbroken", "Voidkissed", "Thornsworn", "Emberlost",
];
const NOUN = [
  "Keep", "Undercroft", "Barrow", "Hollow", "Warren", "Sepulcher",
  "Fold", "Descent", "Cairn", "Deep", "Reach", "Maw",
];

// dungeonName — `seed` is the same 32-bit number #engine/daily.mts's dailySeed() produces. XOR'd
// against a fixed constant so this name-stream never overlaps the generator's own placement rolls
// even though both start from the identical seed value.
export function dungeonName(seed) {
  const rng = mulberry32((seed ^ 0x9e3779b9) >>> 0);
  return `The ${pick(rng, ADJ)} ${pick(rng, NOUN)}`;
}

// parseHexSeed — "0x3f0a91c4" (server's hexSeed() shape) -> the 32-bit number.
export function parseHexSeed(hex) {
  return Number(hex) >>> 0;
}

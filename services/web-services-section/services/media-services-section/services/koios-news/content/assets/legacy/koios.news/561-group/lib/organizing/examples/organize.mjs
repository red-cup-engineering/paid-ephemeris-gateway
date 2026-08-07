/**
 * organize — the social-scale governing of a plurality of agents.
 *
 * organize() glues a plurality of agents (given as three Gen-2 boundary faces) into
 * one organization (the global section). The gluing act is adjudication: the
 * Mayer–Vietoris decomposition over the social cover. H¹ = 0 means coordination-free;
 * H¹ > 0 means consensus is required but disagreement is held, not exploded.
 */
import {
  organize,
  adjudicate,
  community,
  institute,
  federate,
  relate,
  socialBecoming,
  face,
  project,
} from "@emsenn/organizing";
import { agent } from "@emsenn/animating";

// ── the boundary: three Gen-2 face projections ────────────────────────────────────
const BOUNDARY = {
  socializing: "alice|trusts-bob\nbob|trusts-carol",
  computing:   "alice|computes-tax\nbob|computes-tax",
  gaming:      "alice|plays-carol",
};

// ── organize: glue into one organization ─────────────────────────────────────────
const org = organize(BOUNDARY, { identity: "the-guild" });
console.log("org kind:", org.kind);           // "organizing.organization"
console.log("org identity:", org.identity);   // "the-guild"
console.log("settled below:", org.settledBelow); // true
console.log("open above:", org.openAbove);    // true

// the three Gen-2 social faces
console.log("faces:", org.faces.map(f => f.faculty));
// → ["socializing", "computing", "gaming"]
console.log("directions:", org.faces.map(f => f.direction));
// → ["across", "inside", "outside"]

// cohomology: disagreement is tolerated, federation-only is the genuine obstruction
console.log("glued:", org.glued);             // true when cohomologyRank = 0
console.log("coordination:", org.coordination); // "coordination-free" or "consensus-required"
console.log("cohomology rank:", org.adjudication.cohomologyRank);

// ── adjudicate: the Mayer–Vietoris decomposition alone ───────────────────────────
const adj = adjudicate(BOUNDARY);
console.log("contested:", adj.contested);    // disagreement-pairs (tolerated)
console.log("open:", adj.open);              // open/partial facts
console.log("monotone:", adj.monotone);      // accumulation is monotone
console.log("federationOnly:", adj.federationOnly); // the genuine obstruction

// ── community: the shared field (stage-3 social-working reading) ──────────────────
// community() takes the same boundary as organize() — a { socializing, computing, gaming } object
const com = community(BOUNDARY);
console.log("community kind:", com.kind);    // "organizing.community"
console.log("community members:", com.members);

// institute: the settled governing order over the same boundary
const inst = institute(BOUNDARY);
console.log("institution kind:", inst.kind); // "organizing.institution"

// ── the Lakota social becoming ─────────────────────────────────────────────────────
const becoming = socialBecoming(BOUNDARY, { identity: "the-guild" });
console.log("becoming stage:", becoming.stage); // the first Lakota stage

// ── federate: compose two constituency boundaries into a federation ───────────────
const BOUNDARY2 = { socializing: "diana|trusts-eve\neve|trusts-diana" };
const federation = federate([BOUNDARY, BOUNDARY2]);
console.log("federation kind:", federation.kind);      // "organizing.federation"
console.log("federation constituents:", federation.constituents); // 2
console.log("federation glued:", federation.glued);

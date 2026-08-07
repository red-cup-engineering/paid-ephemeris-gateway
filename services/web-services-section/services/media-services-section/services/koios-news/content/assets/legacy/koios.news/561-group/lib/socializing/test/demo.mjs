// Demo: drive socializing through the package's OWN induced bin DISPATCH path —
// the exact stdin/stdout transport the manifold mounts. The Social Field carrier
// rides stdin as JSON (the eavt/json document the transport is built for); verbs and
// their scalar options ride argv. We admit agents, thread the field through the
// dispatcher, then converge:
//   compatible (both-positive) pair  → H¹ = 0 (consensus, glued common ground)
//   4-cycle of opposed agents        → H¹ ≠ 0 (held disagreement, not exploded)
import { valueOf } from "@emsenn/relating";
import { inducedBins } from "../dist/index.mjs";

const pooledName = (comp) => (comp ? valueOf(comp.pooled).name : "(none)");

// One bin invocation through the package's induced dispatcher.
function bin(stdin, verb, opts = {}) {
  const argv = [verb];
  for (const [k, v] of Object.entries(opts)) argv.push(`--${k}`, String(v));
  const res = inducedBins.dispatch(argv, stdin, { program: "socialize" });
  if (res.code !== 0) throw new Error(`bin ${verb} failed (code ${res.code}): ${res.stderr}`);
  return res.stdout;
}

// A meme over a trivial cell. `positive` ⇒ potential (truth witnessed); otherwise
// active (uptake witnessed). Plain JSON: the carrier rides stdin as a remote caller
// would send it.
function memeJson(label, positive) {
  const tok = (v) => ({ kind: "utterance.token", hand: "left", mark: { kind: "utterance.mark", value: v } });
  const side = (n) => ({ kind: "bilattice-charge.side", name: n });
  return {
    kind: "predication.fiber.meme",
    cell: { subject: tok(label), predicate: { kind: "utterance.mark", value: `predicate:${label}` }, object: tok("topic") },
    charge: positive
      ? { kind: "bilattice-charge.carrier", value: [side("present"), side("absent")], evidence: [[{ kind: "utterance.mark", value: `${label}-w` }], []] }
      : { kind: "bilattice-charge.carrier", value: [side("absent"), side("present")], evidence: [[], [{ kind: "utterance.mark", value: `${label}-w` }]] },
  };
}

const member = (agentId, memes) => ({ kind: "socializing.member", agent: { kind: "animating.agent", identity: agentId }, memes });
// a translation morphism source→target in the observer category O (the social base).
const edge = (source, target) => ({
  kind: "socializing.translation", source, target,
  channel: { kind: "communicating.messaging.channel", medium: "society",
    from: { kind: "communicating.speaking.signifying.semiosphere", name: "s" },
    to: { kind: "communicating.speaking.signifying.semiosphere", name: "s" }, capacity: null },
});
const field = (members, translations) => JSON.stringify({
  kind: "socializing.social-field", members,
  base: { kind: "socializing.social-base", translations },
  section: { kind: "socializing.common-ground", glued: true, obstruction: 0, coordinationFree: true, components: [] },
});

console.log("== induced bin transport surface (what the manifold mounts) ==");
console.log("package:", inducedBins.discovery.package, " protocol:", inducedBins.discovery.protocol);
console.log("bins:   ", inducedBins.discovery.bins.map((b) => b.name).join(", "));
console.log();

// --- CONSENSUS: alice & bob each hold a compatible (positive) meme ---
{
  let f = field([member("alice", [memeJson("sky-is-blue", true)]), member("bob", [memeJson("sky-is-blue", true)])], [edge(0, 1)]);
  f = bin(f, "converge"); // edges read from the field's own base
  const s = JSON.parse(f).section;
  const comp = s.components.find((c) => c.members.length === 2);
  console.log("== CONSENSUS: alice & bob hold a compatible meme ==");
  console.log(`  glued=${s.glued}  obstruction(H¹)=${s.obstruction}  coordinationFree=${s.coordinationFree}  pooled=${pooledName(comp)}`);
  console.log(`  => ${s.glued && s.obstruction === 0 ? "PASS: glued common ground, H¹ = 0" : "FAIL"}`);
}
console.log();

// --- HELD DISAGREEMENT: a 4-cycle, agents 0,2 positive vs 1,3 negative ---
{
  const members = [0, 1, 2, 3].map((i) => member(`agent-${i}`, [memeJson(`m${i}`, i % 2 === 0)]));
  // drive admit first to PROVE admit grows the field through the dispatcher, then
  // converge over the explicit 4-cycle by threading a freshly-shaped field on stdin.
  let grown = field([], []);
  grown = bin(grown, "admit", { agent: "probe|exists" });
  console.log("== admit through the dispatcher grows the field ==");
  console.log(`  members after one admit: ${JSON.parse(grown).members.length}  (was 0)`);

  let f = field(members, [edge(0, 1), edge(1, 2), edge(2, 3), edge(3, 0)]);
  f = bin(f, "converge");
  const s = JSON.parse(f).section;
  const held = s.components.find((c) => c.members.length > 1);
  console.log("== HELD DISAGREEMENT: a 4-cycle of opposed agents ==");
  console.log(`  glued=${s.glued}  obstruction(H¹)=${s.obstruction}  coordinationFree=${s.coordinationFree}  pooled=${pooledName(held)}`);
  console.log(`  => ${!s.glued && s.obstruction > 0 ? "PASS: not glued, H¹ != 0 (held, not exploded)" : "FAIL"}`);
}

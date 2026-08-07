/**
 * agent-computation — computing as Eff = Kl(!) over enriched agents.
 *
 * Every computing operation takes a full @emsenn/animating agent, not bare data.
 * compute(agent) → FOUR: verified / refuted / undecidable / contradictory.
 * The corpus's "computation = settling" is literal: an agent IS a settled computation.
 */
import { compute, compose, relay, bang, transport, joinKnowledge, admitAgent, four, VERIFIED, REFUTED, UNDECIDABLE, CONTRADICTORY } from "@emsenn/computing";
import { agent } from "@emsenn/animating";

// ── enriched agents: goal-bearing individuals ─────────────────────────────────────
const trueAgent = agent("the-sky|is-blue", {
  identity: "observer",
  goal: { predicate: "is-blue", charge: "potential" },
});
const falseAgent = agent("the-sky|is-blue", {
  identity: "observer",
  goal: { predicate: "is-green", charge: "potential" },
});

// ── compute: settle an agent's truth as FOUR ─────────────────────────────────────
const cTrue  = compute(trueAgent);
const cFalse = compute(falseAgent);
console.log("verified:", cTrue.standing.value);    // "verified"
console.log("refuted:", cFalse.standing.value);    // "refuted"
console.log("agent embedded:", cTrue.agent.kind);  // "animating.agent"

// ── FOUR: the 2×2 truth × decidability grid ──────────────────────────────────────
console.log("four(true, false):", four(true, false));   // VERIFIED = "t"
console.log("four(false, true):", four(false, true));   // REFUTED  = "f"
console.log("four(false, false):", four(false, false)); // UNDECIDABLE = "⊥"
console.log("four(true, true):", four(true, true));     // CONTRADICTORY = "⊤"

// ── joinKnowledge: the ≤_k comonad join (knowing's ≤_k over FOUR) ───────────────
console.log("⊥ ⊔_k t = t:", joinKnowledge(UNDECIDABLE, VERIFIED) === VERIFIED);
console.log("t ⊔_k f = ⊤:", joinKnowledge(VERIFIED, REFUTED) === CONTRADICTORY);
console.log("t ⊔_k t = t:", joinKnowledge(VERIFIED, VERIFIED) === VERIFIED);

// ── compose: Kleisli relay of two agents ─────────────────────────────────────────
const composed = compose(trueAgent, falseAgent);
console.log("composed kind:", composed.kind);     // "animating.agent"
console.log("composed identity:", composed.identity); // "observer∘observer"

// ── relay: multi-agent settling (the off-diagonal lift) ──────────────────────────
const r = relay(trueAgent, [trueAgent, falseAgent]);
console.log("relay members:", r.members);             // 3
console.log("lead standing:", r.standing.value);      // "verified"
console.log("aggregate:", r.aggregate.value);         // "contradictory" (told both)

// ── faculty edges: bang (!) and transport ────────────────────────────────────────
const banged    = bang(trueAgent);
console.log("banged connective:", banged.connective); // "ofCourse" (playing !A)

const admission = transport(trueAgent);
console.log("transport action:", admission.action);   // "communicating.admit"

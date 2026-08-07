/**
 * @emsenn/playing — the *-autonomous interaction faculty (single-agent ludics).
 *
 * playing is the OUTSIDE boundary sibling of communicating (the meme monoid) and
 * knowing (the meme comonad): the meme's *-AUTONOMOUS duality and the CUT. Its own
 * carrier is the `Design` (a strategy = a partial charge-valuation over a locus tree
 * of memes); its characteristic morphism is the binary `interact` (the cut:
 * `Design ⊗ Design^⊥ → Interaction`). On top of the cut it carries the full
 * *-autonomous category of behaviours (the MALL connectives, the exponentials,
 * incarnation, cut-elimination, Fax), the logic layer (CLL propositions, the
 * fragment lattice, focusing with shifts, sessions, the embeddings), and the
 * topology roundout (chronicles, internal completeness, locativity, the locative
 * primitives). See dev/docs/notes/2026-06-21-playing-as-star-autonomous-interaction.md.
 *
 * The single-agent ludics core is also exposed as the subpath `@emsenn/playing/ludics`
 * (see `ludics.mts`); `@emsenn/gaming-experimental` — the scale-2 lift of playing
 * along the agent-sheaf — owns the multi-agent CGS layer (arenas-with-symmetry,
 * concurrent strategies, the nominal/FSym symmetry, the social play readings, the
 * running multiplayer game) and reuses this ludics core rather than duplicating it.
 * See dev/docs/notes/2026-06-21-gaming-as-multi-agent-playing.md.
 *
 * The package root is the action surface: `actions` is the cocone `induceBins` reads
 * to project every transport (CLI/MCP/OpenAPI/web), and one `dispatch` witnesses
 * every play as EAVT in playing's own ledger.
 */

export * from "./structuring/index.mjs";
export * from "./encoding/index.mjs";
export * from "./carriers/index.mjs";
export * from "./expressing.mjs";
export { starAutonomousActions } from "./star-autonomous.mjs";
export { proofActions } from "./proof.mjs";
export { topologyExtraActions } from "./topology-extra.mjs";
export * as wasi from "./wasi.mjs";
export * as macaroons from "./macaroons.mjs";
export * as webauthn from "./webauthn.mjs";
export {
  grant as grantWasiCapability,
  preopen as preopenWasiCapability,
  attenuate as attenuateWasiCapability,
  invoke as invokeWasiCapability,
  canInvoke as canInvokeWasiCapability,
  cut as cutWasiInvocation,
  isAttenuation as isWasiAttenuation,
  type WasiRights,
  type GrantOptions as WasiGrantOptions,
  type PreopenOptions as WasiPreopenOptions,
  type AttenuateOptions as WasiAttenuateOptions,
} from "./wasi.mjs";
export {
  macaroonFromCapability,
  caveat as macaroonCaveat,
  thirdPartyCaveat as macaroonThirdPartyCaveat,
  attenuate as attenuateMacaroonCapability,
  discharge as dischargeMacaroonCaveat,
  verifyMacaroon,
  canInvokeMacaroon,
  invoke as invokeMacaroonCapability,
  macaroonGrantNarrows,
  attenuationMonotone as macaroonAttenuationMonotone,
  type MacaroonVerificationContext,
  type MacaroonVerification,
  type MacaroonAttenuationMonotoneJudgment,
} from "./macaroons.mjs";
export {
  webauthnGrant,
  register as registerWebAuthnCredential,
  challenge as challengeWebAuthnCredential,
  verify as verifyWebAuthnAssertion,
  canAssert as canAssertWebAuthnCredential,
  assertCredential as assertWebAuthnCredential,
  invoke as invokeWebAuthnCredential,
  cut as cutWebAuthnCeremony,
  ceremony as webAuthnCeremony,
  type RegisterOptions as WebAuthnRegisterOptions,
  type ChallengeOptions as WebAuthnChallengeOptions,
  type AssertionContext as WebAuthnAssertionContext,
  type AssertionVerdict as WebAuthnAssertionVerdict,
} from "./webauthn.mjs";
export {
  compositionActions,
  composeAction,
  copycatAction,
  identityLawAction,
} from "./composition-actions.mjs";

export {
  actions,
  designAction,
  dualizeAction,
  interactAction,
} from "./actions.mjs";

export {
  playingFace,
  type PlayingFace,
  type EvidenceAxis,
  type EvidenceBelnap,
} from "./face.mjs";

// AFFECT & GENRE wing (frontier first cut) — Tomkins' affect system read off a chronicle's stimulation
// gradient, and genre = behaviour × affect-arc with Berlant's impasse. See the affect/dramaturgy note.
export { playAffect, type PlayAffect, type AffectName } from "./affect.mjs";
export { genre, type Genre, type AffectArc } from "./genre.mjs";
export { caillois, type Caillois, type CailloisCategory } from "./caillois.mjs";

// DRAMATURGY wing — front/back stage = Girard incarnation; the paradox of the actor as an orthogonality
// theorem; the spectator = the behaviour's orthogonal B^⊥ (emancipation vs spectacle); dissensus.
export {
  stage,
  paradoxOfTheActor,
  spectator,
  dissensus,
  type Stage,
  type ParadoxOfTheActor,
  type Spectator,
  type Dissensus,
} from "./dramaturgy.mjs";

// PERSONA / MASK wing — mask = delocation (Deleuze masks-of-masks); performativity = the
// union-of-chronicles reconstruction (Butler: no doer behind the deed); persona/shadow (Jung);
// role distance / identification vs demonstration (Goffman; Stanislavski ↔ Brecht).
export {
  mask,
  sameActor,
  performativity,
  personaShadow,
  roleDistance,
  type Performativity,
  type PersonaShadow,
  type RoleDistance,
} from "./persona.mjs";

// SKILL / DISCIPLINE wing — the corpus's own agentics on the ludic substrate. A discipline = a behaviour
// (the practice's magic circle); a skill = a typed reusable design with a skillful-work closure-position,
// mastered when material + admitted, composing via the cut.
export { discipline, admits, designKey, type Discipline } from "./discipline.mjs";
export {
  skill,
  mastery,
  composes,
  nucleus,
  phase,
  SKILLFUL_WORK,
  type Skill,
  type ClosurePosition,
  type Mastery,
} from "./skill.mjs";

// CHARACTER-AGENT capstone — the substrate character (personas + skills + disciplines + plays), against
// the governed-state-machine model: its self is the performed union of its plays, its maturity is
// quiescence. gaming's `Mask` is the morphism-shape face; the character is the GLUING of masks (a sheaf,
// not a fibration — no essence beneath), with identity drift as the obstruction. See `identity`.
export {
  characterAgent,
  practiced,
  repertoire,
  performedSelf,
  identity,
  type CharacterAgent,
  type CharacterParts,
  type Repertoire,
  type PerformedSelf,
  type Identity,
} from "./character-agent.mjs";

// SESSION CHARACTER wing — a per-session character is reconstructed from its event chronicle, not stored
// as a degenerate actor record. Animating's interior is injected or folded through an injected perceive
// leg so playing stays acyclic while still making the character-agent reading available.
export {
  sessionEventWitnessSchema,
  sessionEventWitnessCarrier,
  sessionMaskSchema,
  sessionMaskCarrier,
  sessionSituationSchema,
  sessionSituationCarrier,
  sessionCharacterReadingSchema,
  sessionCharacterReadingCarrier,
  sessionMasks,
  foldSessionInterior,
  sessionCharacterReading,
  type SessionEventWitness,
  type SessionEventWitnessCarrier,
  type SessionMask,
  type SessionMaskCarrier,
  type SessionSituationReading,
  type SessionSituationCarrier,
  type SessionPerceive,
  type PerceiveFoldOptions,
  type SessionCharacterOptions,
  type SessionCharacterReading,
  type SessionCharacterReadingCarrier,
} from "./session-character.mjs";

// Macaroons / biscuit wing — caveat-attenuated capability tokens as the
// OUT-face portable-token projection. A caveat is `attenuate`/dualize, a
// caveat chain is monotone authority-narrowing, verification is `canInvoke`
// after every caveat predicate/discharge has held. This models the HMAC chain
// structurally; no production cryptography is run in playing.
export {
  macaroonFromCapability as macaroon,
  caveat,
  thirdPartyCaveat,
  attenuate as attenuateMacaroon,
  discharge as dischargeMacaroon,
  invoke as invokeMacaroon,
  canInvoke as canInvokeMacaroonToken,
} from "./macaroons.mjs";

// WebAuthn / passkeys / FIDO2 wing — proof-of-possession as a one-shot
// `invoke` whose authority is the held credential. animating owns the coherent
// identity facet; playing owns registration-as-grant and the challenge/assertion
// ceremony as the OUT-face cut. The crypto and authenticator are modeled
// structurally here, not executed.
export {
  webauthnGrant as passkeyLocus,
  register as registerPasskey,
  challenge as challengePasskey,
  assertCredential as assertPasskey,
  canAssert as canAssertPasskey,
  cut as cutPasskeyCeremony,
} from "./webauthn.mjs";

// WASI wing — the WebAssembly System Interface as the OUT face's sandboxed
// capability-execution projection: a WASI handle = a locus you may play; a syscall =
// the cut; attenuation = dualize (monotone narrowing). The functorial view of
// animating's ActivityPub object-capability, re-indexed onto a WASI right + path
// scope. Models the interface, pulls no Wasm runtime. See the wasi-as-playing note.
export {
  WASI_RIGHTS,
  wasiLocus,
  wasiHandleSchema,
  wasiHandleCarrier,
  preopen,
  grant as grantWasi,
  scopeNarrows,
  attenuate as attenuateWasi,
  invoke as invokeWasi,
  canInvoke as canInvokeWasi,
  interact as interactWasi,
  type WasiRight,
  type WasiHandle,
  type WasiInvocation,
  type WasiInteraction,
} from "./wasi.mjs";

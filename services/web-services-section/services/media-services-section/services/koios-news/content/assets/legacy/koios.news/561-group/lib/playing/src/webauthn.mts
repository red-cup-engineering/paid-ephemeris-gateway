/**
 * webauthn — passkeys/FIDO2 as playing's OUT-face proof-of-possession ceremony.
 *
 * This models the WebAuthn ceremony structurally. It does not call a browser,
 * platform authenticator, CTAP device, or cryptographic verifier. animating owns
 * the identity facet (`animating.webauthn-credential`); playing consumes that
 * facet as a credential locus, registers it as a held CapabilityView, and cuts a
 * fresh challenge against the holder's affordances.
 */
import {
  capabilityViewCarrier,
  webauthnAssertionCarrier,
  webauthnChallengeCarrier,
  webauthnCutCarrier,
  webauthnIdentityFacetCarrier,
  webauthnRegistrationCarrier,
  type CapabilityView,
  type WebAuthnAssertion,
  type WebAuthnChallenge,
  type WebAuthnCut,
  type WebAuthnIdentityFacet,
  type WebAuthnRegistration,
} from "./carriers/index.mjs";
import { canInvoke as canInvokeCapability } from "./wasi.mjs";
import { designFromActs } from "./structuring/concurrent-game/with-symmetry/ludicizing/design.mjs";
import { locus, locusKey } from "./structuring/concurrent-game/with-symmetry/ludicizing/locus.mjs";
import { convergenceJudgment } from "./structuring/concurrent-game/with-symmetry/ludicizing/settling/orthogonality.mjs";

export interface RegisterOptions {
  readonly id?: string;
  readonly holder?: string;
}

export interface ChallengeOptions {
  readonly id?: string;
  readonly nonce?: string;
}

export interface AssertionContext {
  readonly affordances: readonly string[];
  readonly usedChallenges?: readonly string[];
}

export interface AssertionVerdict {
  readonly held: boolean;
  readonly fresh: boolean;
  readonly matched: boolean;
  readonly verified: boolean;
  readonly reason?: WebAuthnCut["reason"];
}

let WEBAUTHN_SEQ = 0;

function freshId(prefix: string): string {
  WEBAUTHN_SEQ += 1;
  return `urn:${prefix}:${WEBAUTHN_SEQ}`;
}

function credentialHolder(credential: WebAuthnIdentityFacet): string {
  const hash = credential.id.indexOf("#");
  return hash < 0 ? credential.id : credential.id.slice(0, hash);
}

export function webauthnGrant(credential: WebAuthnIdentityFacet): string {
  return `webauthn:${credential.rpId}:${credential.id}`;
}

function structuralDigest(label: string, ...parts: readonly string[]): string {
  return `${label}(${parts.join(" | ")})`;
}

function cutWitness(challenge: WebAuthnChallenge, assertion: WebAuthnAssertion, reason?: WebAuthnCut["reason"]): WebAuthnCut {
  const root = locus([]);
  const converged = assertion.verified;
  const challengeDesign = designFromActs(new Map([[locusKey(root), "proponent"]]));
  const credentialDesign = designFromActs(new Map([[locusKey(converged ? root : locus([1])), "opponent"]]));
  const judgment = convergenceJudgment(challengeDesign, credentialDesign);
  const cutConverged = judgment.kind === "game.convergence:witness";
  const cut: WebAuthnCut = {
    kind: "playing.webauthn.cut",
    challenge,
    assertion,
    converged: cutConverged,
    daimonLoci: cutConverged ? judgment.daimonLoci.map((xi) => [...xi.address]) : [],
    ...(cutConverged ? {} : { reason: reason ?? "no-daimon" }),
  };
  return webauthnCutCarrier.assert(cut, "webauthn cut") as WebAuthnCut;
}

/**
 * register — WebAuthn registration as `grant`. The identity facet is already
 * owned by animating; this function only turns it into the held OUT-face locus
 * that the assertion ceremony may exercise.
 */
export function register(credentialView: WebAuthnIdentityFacet, options: RegisterOptions = {}): WebAuthnRegistration {
  const credential = webauthnIdentityFacetCarrier.assert(credentialView, "webauthn identity facet") as WebAuthnIdentityFacet;
  const capability: CapabilityView = capabilityViewCarrier.assert({
    id: options.id ?? freshId("webauthn-cap"),
    grants: webauthnGrant(credential),
    holder: options.holder ?? credentialHolder(credential),
  }, "webauthn registration grant");
  return webauthnRegistrationCarrier.assert({
    kind: "playing.webauthn.registration",
    credential,
    capability,
    registered: true,
  }, "webauthn registration") as WebAuthnRegistration;
}

/**
 * challenge — issue a one-shot challenge naming the exact registered credential
 * locus. Freshness is checked by the caller's used-challenge ledger.
 */
export function challenge(registration: WebAuthnRegistration, options: ChallengeOptions = {}): WebAuthnChallenge {
  return webauthnChallengeCarrier.assert({
    kind: "playing.webauthn.challenge",
    id: options.id ?? freshId("webauthn-challenge"),
    rpId: registration.credential.rpId,
    credential: registration.credential.id,
    grants: registration.capability.grants,
    nonce: options.nonce ?? freshId("webauthn-nonce"),
  }, "webauthn challenge") as WebAuthnChallenge;
}

export function verify(registration: WebAuthnRegistration, issued: WebAuthnChallenge, context: AssertionContext): AssertionVerdict {
  const held = canInvokeCapability(context.affordances, registration.capability);
  const fresh = !(context.usedChallenges ?? []).includes(issued.id);
  const matched = issued.rpId === registration.credential.rpId
    && issued.credential === registration.credential.id
    && issued.grants === registration.capability.grants;
  const verified = held && fresh && matched;
  return {
    held,
    fresh,
    matched,
    verified,
    ...(verified ? {} : { reason: !matched ? "mismatch" : !fresh ? "replay" : "not-held" }),
  };
}

/** canAssert — soundness gate: assertable iff the credential locus is held. */
export function canAssert(registration: WebAuthnRegistration, context: Pick<AssertionContext, "affordances">): boolean {
  return canInvokeCapability(context.affordances, registration.capability);
}

/**
 * assertCredential — produce the structural WebAuthn assertion. This is the
 * proof-of-possession move: one fresh challenge, one held credential locus, one
 * invocation. The signature string is a ceremony witness, not real crypto.
 */
export function assertCredential(
  registration: WebAuthnRegistration,
  issued: WebAuthnChallenge,
  context: AssertionContext,
): WebAuthnAssertion {
  const verdict = verify(registration, issued, context);
  const clientDataHash = structuralDigest("clientDataHash", issued.id, issued.nonce, issued.rpId, issued.grants);
  const authenticatorData = structuralDigest("authenticatorData", registration.credential.id, registration.credential.keyId);
  const signature = structuralDigest(
    "signature-model",
    registration.credential.publicKey,
    clientDataHash,
    authenticatorData,
  );
  return webauthnAssertionCarrier.assert({
    kind: "playing.webauthn.assertion",
    credential: registration.credential.id,
    challenge: issued.id,
    grants: registration.capability.grants,
    holder: registration.capability.holder,
    clientDataHash,
    authenticatorData,
    signature,
    verified: verdict.verified,
    exercisable: verdict.verified,
  }, "webauthn assertion") as WebAuthnAssertion;
}

/**
 * cut — the challenge-to-assertion round as playing's *-autonomous interaction:
 * convergence iff the challenge is fresh, names the registration, and `canInvoke`
 * says the credential authority is held.
 */
export function cut(registration: WebAuthnRegistration, issued: WebAuthnChallenge, context: AssertionContext): WebAuthnCut {
  const verdict = verify(registration, issued, context);
  return cutWitness(issued, assertCredential(registration, issued, context), verdict.reason);
}

export const invoke = assertCredential;
export const canInvoke = canAssert;
export const ceremony = cut;

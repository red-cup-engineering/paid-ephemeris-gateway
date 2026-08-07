/**
 * carriers - playing's JSON-Schema-declared carrier objects.
 *
 * Each exported carrier is one schema literal: `FromSchema` supplies the static
 * type, `carrierFrom` registers the runtime validator, and the bare `$id` remains
 * the action composition address.
 */
import { carrierFrom, type FromSchema } from "@emsenn/relating";

export const ChargeValueNameSchema = {
  enum: ["absurd", "potential", "active", "stable"],
} as const;

export const LocusSchema = {
  type: "array",
  items: { type: "integer", minimum: 0 },
} as const;

export const DesignEntrySchema = {
  type: "object",
  required: ["charge", "locus"],
  additionalProperties: false,
  properties: {
    charge: ChargeValueNameSchema,
    locus: LocusSchema,
  },
} as const;

export const DesignSchema = {
  $id: "playing/design",
  title: "Design",
  description: "Playing's own carrier: a partial charge-valuation over a locus tree.",
  type: "object",
  required: ["entries"],
  additionalProperties: false,
  properties: {
    entries: { type: "array", items: DesignEntrySchema },
  },
} as const;

export const designCarrier = carrierFrom(DesignSchema);
export type DesignCarrier = FromSchema<typeof DesignSchema>;

const looseCarrier = <const Id extends string, const Kind extends string>(
  id: Id,
  kind: Kind,
  title: string,
  description: string,
) => carrierFrom({
  $id: id,
  title,
  description,
  type: "object",
  required: ["kind"],
  additionalProperties: true,
  properties: {
    kind: { const: kind },
  },
} as const);

export const interactionCarrier = looseCarrier("playing/interaction", "playing.interaction", "Interaction", "The normal form report of cutting two designs.");
export const orthogonalityCarrier = looseCarrier("playing/orthogonality", "playing.orthogonality", "Orthogonality", "A convergence verdict for two designs.");
export const behaviourCarrier = looseCarrier("playing/behaviour", "playing.behaviour", "Behaviour", "A bi-orthogonal closure or closure judgment over designs.");
export const incarnationCarrier = looseCarrier("playing/incarnation", "playing.incarnation", "Incarnation", "The material core of a behaviour.");
export const normalizationCarrier = looseCarrier("playing/normalization", "playing.normalization", "Normalization", "A cut-normalization verdict.");
export const identityCarrier = looseCarrier("playing/identity", "playing.identity", "Identity", "A Fax/copycat identity witness.");
export const statementCarrier = looseCarrier("playing/statement", "playing.statement", "Statement", "A theorem-shaped playing statement.");
export const fragmentCarrier = looseCarrier("playing/fragment", "playing.fragment", "Fragment", "The linear-logic fragment lattice.");
export const focusingCarrier = looseCarrier("playing/focusing", "playing.focusing", "Focusing", "A focusing polarity reading.");
export const embeddingCarrier = looseCarrier("playing/embedding", "playing.embedding", "Embedding", "A CGS embedding catalog entry.");
export const capabilityViewSchema = {
  $id: "playing/capability-view",
  title: "CapabilityView",
  description:
    "The structural view of an existing object-capability: id + grants + holder (+ optional parent). Downstream OCap carriers project here without giving playing a second authority ontology.",
  type: "object",
  required: ["id", "grants", "holder"],
  additionalProperties: false,
  properties: {
    id: { type: "string", minLength: 1 },
    grants: { type: "string", minLength: 1 },
    holder: { type: "string", minLength: 1 },
    parent: { type: "string", minLength: 1 },
  },
} as const;
export type CapabilityView = FromSchema<typeof capabilityViewSchema>;
export const capabilityViewCarrier = carrierFrom(capabilityViewSchema);

export const macaroonCaveatSchema = {
  $id: "playing/macaroons/caveat",
  title: "MacaroonCaveat",
  description:
    "A macaroon/biscuit caveat as playing attenuation: appending it narrows the carried capability grant monotonically. Third-party caveats require a delegated discharge.",
  type: "object",
  required: ["kind", "id", "mode", "predicate", "grants"],
  additionalProperties: false,
  properties: {
    kind: { const: "playing.macaroons.caveat" },
    id: { type: "string", minLength: 1 },
    mode: { enum: ["first-party", "third-party"] },
    predicate: { type: "string", minLength: 1 },
    grants: { type: "string", minLength: 1 },
    location: { type: "string", minLength: 1 },
    discharger: { type: "string", minLength: 1 },
  },
} as const;
export type MacaroonCaveat = FromSchema<typeof macaroonCaveatSchema>;
export const macaroonCaveatCarrier = carrierFrom(macaroonCaveatSchema);

export const macaroonTokenSchema = {
  $id: "playing/macaroons/token",
  title: "MacaroonToken",
  description:
    "A caveat-attenuated capability token. The signature is a structural HMAC-chain model, not executable cryptography; authority is the carried CapabilityView.",
  type: "object",
  required: ["kind", "id", "capability", "caveats", "signature"],
  additionalProperties: false,
  properties: {
    kind: { const: "playing.macaroons.token" },
    id: { type: "string", minLength: 1 },
    capability: { $ref: "playing/capability-view" },
    caveats: { type: "array", items: { $ref: "playing/macaroons/caveat" } },
    signature: { type: "string", minLength: 1 },
    parent: { type: "string", minLength: 1 },
  },
} as const;
export type MacaroonToken = FromSchema<typeof macaroonTokenSchema> & {
  readonly capability: CapabilityView;
  readonly caveats: readonly MacaroonCaveat[];
};
export const macaroonTokenCarrier = carrierFrom(macaroonTokenSchema);

export const macaroonDischargeSchema = {
  $id: "playing/macaroons/discharge",
  title: "MacaroonDischarge",
  description:
    "A third-party caveat discharge: delegated name-passing authority for the caveat's narrowed grant.",
  type: "object",
  required: ["kind", "id", "caveat", "by", "capability", "signature"],
  additionalProperties: false,
  properties: {
    kind: { const: "playing.macaroons.discharge" },
    id: { type: "string", minLength: 1 },
    caveat: { type: "string", minLength: 1 },
    by: { type: "string", minLength: 1 },
    capability: { $ref: "playing/capability-view" },
    signature: { type: "string", minLength: 1 },
  },
} as const;
export type MacaroonDischarge = FromSchema<typeof macaroonDischargeSchema> & {
  readonly capability: CapabilityView;
};
export const macaroonDischargeCarrier = carrierFrom(macaroonDischargeSchema);

export const macaroonInvocationSchema = {
  $id: "playing/macaroons/invocation",
  title: "MacaroonInvocation",
  description:
    "An invocation attempt through a macaroon token, admitted only when verification and canInvoke agree.",
  type: "object",
  required: ["kind", "token", "grants", "holder", "verified", "exercisable"],
  additionalProperties: false,
  properties: {
    kind: { const: "playing.macaroons.invocation" },
    token: { type: "string", minLength: 1 },
    grants: { type: "string", minLength: 1 },
    holder: { type: "string", minLength: 1 },
    verified: { type: "boolean" },
    exercisable: { type: "boolean" },
  },
} as const;
export type MacaroonInvocation = FromSchema<typeof macaroonInvocationSchema>;
export const macaroonInvocationCarrier = carrierFrom(macaroonInvocationSchema);

export const webauthnIdentityFacetSchema = {
  $id: "playing/webauthn/identity-facet",
  title: "WebAuthnIdentityFacet",
  description:
    "Playing's structural view of animating's WebAuthn/passkey identity facet. The authoritative identity carrier lives in animating/writing/identity; playing consumes this shape to run the OUT-face ceremony/assertion.",
  type: "object",
  required: ["kind", "id", "rpId", "publicKey", "keyId"],
  additionalProperties: false,
  properties: {
    kind: { const: "animating.webauthn-credential" },
    id: { type: "string", minLength: 1 },
    rpId: { type: "string" },
    publicKey: { type: "string" },
    keyId: { type: "string", minLength: 1 },
  },
} as const;
export type WebAuthnIdentityFacet = FromSchema<typeof webauthnIdentityFacetSchema>;
export const webauthnIdentityFacetCarrier = carrierFrom(webauthnIdentityFacetSchema);

export const webauthnRegistrationSchema = {
  $id: "playing/webauthn/registration",
  title: "WebAuthnRegistration",
  description:
    "Registration as grant: an animating WebAuthn identity facet admitted as a held playing CapabilityView.",
  type: "object",
  required: ["kind", "credential", "capability", "registered"],
  additionalProperties: false,
  properties: {
    kind: { const: "playing.webauthn.registration" },
    credential: { $ref: "playing/webauthn/identity-facet" },
    capability: { $ref: "playing/capability-view" },
    registered: { type: "boolean" },
  },
} as const;
export type WebAuthnRegistration = FromSchema<typeof webauthnRegistrationSchema> & {
  readonly credential: WebAuthnIdentityFacet;
  readonly capability: CapabilityView;
};
export const webauthnRegistrationCarrier = carrierFrom(webauthnRegistrationSchema);

export const webauthnChallengeSchema = {
  $id: "playing/webauthn/challenge",
  title: "WebAuthnChallenge",
  description:
    "A one-shot WebAuthn challenge naming the registered credential locus that must be held for assertion.",
  type: "object",
  required: ["kind", "id", "rpId", "credential", "grants", "nonce"],
  additionalProperties: false,
  properties: {
    kind: { const: "playing.webauthn.challenge" },
    id: { type: "string", minLength: 1 },
    rpId: { type: "string" },
    credential: { type: "string", minLength: 1 },
    grants: { type: "string", minLength: 1 },
    nonce: { type: "string", minLength: 1 },
  },
} as const;
export type WebAuthnChallenge = FromSchema<typeof webauthnChallengeSchema>;
export const webauthnChallengeCarrier = carrierFrom(webauthnChallengeSchema);

export const webauthnAssertionSchema = {
  $id: "playing/webauthn/assertion",
  title: "WebAuthnAssertion",
  description:
    "A structural WebAuthn assertion: challenge-bound proof-of-possession for a held credential locus. Signatures are modeled structurally, not executed cryptographically.",
  type: "object",
  required: ["kind", "credential", "challenge", "grants", "holder", "clientDataHash", "authenticatorData", "signature", "verified", "exercisable"],
  additionalProperties: false,
  properties: {
    kind: { const: "playing.webauthn.assertion" },
    credential: { type: "string", minLength: 1 },
    challenge: { type: "string", minLength: 1 },
    grants: { type: "string", minLength: 1 },
    holder: { type: "string", minLength: 1 },
    clientDataHash: { type: "string", minLength: 1 },
    authenticatorData: { type: "string", minLength: 1 },
    signature: { type: "string", minLength: 1 },
    verified: { type: "boolean" },
    exercisable: { type: "boolean" },
  },
} as const;
export type WebAuthnAssertion = FromSchema<typeof webauthnAssertionSchema>;
export const webauthnAssertionCarrier = carrierFrom(webauthnAssertionSchema);

export const webauthnCutSchema = {
  $id: "playing/webauthn/cut",
  title: "WebAuthnCut",
  description:
    "The *-autonomous cut witness for a WebAuthn challenge-to-assertion round: convergence iff the credential authority is held and the challenge is fresh.",
  type: "object",
  required: ["kind", "challenge", "assertion", "converged", "daimonLoci"],
  additionalProperties: false,
  properties: {
    kind: { const: "playing.webauthn.cut" },
    challenge: { $ref: "playing/webauthn/challenge" },
    assertion: { $ref: "playing/webauthn/assertion" },
    converged: { type: "boolean" },
    reason: { enum: ["not-held", "replay", "mismatch", "no-daimon"] },
    daimonLoci: { type: "array", items: LocusSchema },
  },
} as const;
export type WebAuthnCut = FromSchema<typeof webauthnCutSchema> & {
  readonly challenge: WebAuthnChallenge;
  readonly assertion: WebAuthnAssertion;
};
export const webauthnCutCarrier = carrierFrom(webauthnCutSchema);

export const wasiRightSchema = {
  type: "string",
  minLength: 1,
} as const;

export const wasiPreopenSchema = {
  $id: "playing/wasi/preopen",
  title: "WasiPreopen",
  description:
    "A WASI preopened handle as the playing/OUT-face view of a Capability: handle + path + rights, with the capability grant as the playable locus.",
  type: "object",
  required: ["kind", "handle", "path", "rights", "capability"],
  additionalProperties: false,
  properties: {
    kind: { const: "playing.wasi.preopen" },
    handle: { type: "integer", minimum: 0 },
    path: { type: "string" },
    rights: { type: "array", items: wasiRightSchema },
    capability: { $ref: "playing/capability-view" },
  },
} as const;
export type WasiPreopen = FromSchema<typeof wasiPreopenSchema>;
export const wasiPreopenCarrier = carrierFrom(wasiPreopenSchema);

export const wasiInvocationSchema = {
  $id: "playing/wasi/invocation",
  title: "WasiInvocation",
  description:
    "A WASI capability invocation: one operation attempted through one preopened handle. Handling the invocation is the playing cut.",
  type: "object",
  required: ["kind", "handle", "operation", "grants", "holder"],
  additionalProperties: false,
  properties: {
    kind: { const: "playing.wasi.invocation" },
    handle: { type: "integer", minimum: 0 },
    operation: { type: "string", minLength: 1 },
    grants: { type: "string", minLength: 1 },
    holder: { type: "string", minLength: 1 },
    capability: { type: "string", minLength: 1 },
  },
} as const;
export type WasiInvocation = FromSchema<typeof wasiInvocationSchema>;
export const wasiInvocationCarrier = carrierFrom(wasiInvocationSchema);

export const wasiCutSchema = {
  $id: "playing/wasi/cut",
  title: "WasiCut",
  description:
    "The cut witness for a WASI invocation: convergence iff the capability grant is among the holder's affordances.",
  type: "object",
  required: ["kind", "invocation", "converged", "daimonLoci"],
  additionalProperties: false,
  properties: {
    kind: { const: "playing.wasi.cut" },
    invocation: { $ref: "playing/wasi/invocation" },
    converged: { type: "boolean" },
    reason: { enum: ["no-meeting", "no-daimon"] },
    daimonLoci: { type: "array", items: LocusSchema },
  },
} as const;
export type WasiCut = FromSchema<typeof wasiCutSchema>;
export const wasiCutCarrier = carrierFrom(wasiCutSchema);

export const propositionCarrier = looseCarrier("playing/proposition", "playing.proposition", "Proposition", "A CLL proposition reading.");
export const fragmentMembershipCarrier = looseCarrier("playing/fragment-membership", "playing.fragment-membership", "FragmentMembership", "A fragment-membership judgment.");
export const formulaCarrier = looseCarrier("playing/formula", "playing.formula", "Formula", "A formula/behaviour denotation reading.");
export const sessionCarrier = looseCarrier("playing/session", "playing.session", "Session", "A session-type correspondence reading.");
export const sessionCompatCarrier = looseCarrier("playing/session-compat", "playing.session-compat", "SessionCompatibility", "A session endpoint compatibility judgment.");
export const chroniclesCarrier = looseCarrier("playing/chronicles", "playing.chronicles", "Chronicles", "The chronicle branches of a design.");
export const viewCarrier = looseCarrier("playing/view", "playing.view", "View", "A Hyland-Ong/Faggian-Hyland player view of a chronicle.");
export const innocenceCarrier = looseCarrier("playing/innocence", "playing.innocence", "Innocence", "A finite view-dependence judgment for a ludic design.");
export const coherenceCarrier = looseCarrier("playing/coherence", "playing.coherence", "Coherence", "A design-coherence judgment.");
export const internalCompletenessCarrier = looseCarrier("playing/internal-completeness", "playing.internal-completeness", "InternalCompleteness", "A presentation-independence judgment.");
export const locativityCarrier = looseCarrier("playing/locativity", "playing.locativity", "Locativity", "A delocation-invariance judgment.");
export const chronicleConvergenceCarrier = looseCarrier("playing/chronicle-convergence", "playing.chronicle-convergence", "ChronicleConvergence", "A chronicle-level convergence judgment.");
export const designLeqCarrier = looseCarrier("playing/design-leq", "playing.design-leq", "DesignLeq", "A design knowledge-order judgment.");
export const compositionCarrier = looseCarrier("playing/composition", "playing.composition", "Composition", "A categorical cut composition report.");
export const copycatCarrier = looseCarrier("playing/copycat", "playing.copycat", "Copycat", "A Fax copycat identity design report.");
export const identityLawCarrier = looseCarrier("playing/identity-law", "playing.identity-law", "IdentityLaw", "A categorical identity/associativity law verdict.");

export const designRef = { $ref: "playing/design" } as const;
export const designArraySchema = { type: "array", items: designRef } as const;
export const jsonObjectSchema = { type: "object", additionalProperties: true } as const;
export const jsonArraySchema = { type: "array", items: {} } as const;

export function requestSchema<const Id extends string, const Shape extends Record<string, unknown>>(
  id: Id,
  shape: Shape,
  required: readonly (keyof Shape & string)[],
  title: string,
) {
  return {
    $id: id,
    title,
    type: "object",
    properties: shape,
    required: [...required],
    additionalProperties: true,
  } as const;
}

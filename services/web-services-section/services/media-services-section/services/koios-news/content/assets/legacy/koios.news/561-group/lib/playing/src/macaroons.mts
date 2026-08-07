/**
 * macaroons — caveat-attenuated capability tokens on playing's OUT face.
 *
 * This models macaroon/biscuit law, not production cryptography. The HMAC
 * signature chain is represented structurally so the carrier records how each
 * caveat is bound to the previous token; no hashing or crypto dependency is
 * introduced here. Real signing belongs at a wire package boundary.
 */
import {
  capabilityViewCarrier,
  macaroonCaveatCarrier,
  macaroonDischargeCarrier,
  macaroonInvocationCarrier,
  macaroonTokenCarrier,
  type CapabilityView,
  type MacaroonCaveat,
  type MacaroonDischarge,
  type MacaroonInvocation,
  type MacaroonToken,
} from "./carriers/index.mjs";
import {
  canInvoke as canInvokeCapability,
  scopeNarrows,
} from "./wasi.mjs";

export interface MacaroonOptions {
  readonly id?: string;
  readonly signature?: string;
}

export interface CaveatOptions {
  readonly id?: string;
  readonly mode?: MacaroonCaveat["mode"];
  readonly location?: string;
  readonly discharger?: string;
}

export interface DischargeOptions {
  readonly id?: string;
  readonly signature?: string;
}

export interface MacaroonVerificationContext {
  readonly affordances: readonly string[];
  readonly predicates?: readonly string[];
  readonly discharges?: readonly MacaroonDischarge[];
}

export interface MacaroonVerification {
  readonly valid: boolean;
  readonly token: MacaroonToken;
  readonly failures: readonly string[];
  readonly checked: readonly MacaroonCaveat[];
}

let MACAROON_SEQ = 0;

function freshId(prefix: string): string {
  MACAROON_SEQ += 1;
  return `urn:${prefix}:${MACAROON_SEQ}`;
}

function structuralSignature(parent: string, ...parts: readonly string[]): string {
  return `hmac-model(${[parent, ...parts].join(" -> ")})`;
}

function capabilityFrom(parent: CapabilityView, grants: string, parentId: string): CapabilityView {
  return capabilityViewCarrier.assert({
    id: freshId("cap:macaroon"),
    grants,
    holder: parent.holder,
    parent: parentId,
  }, "macaroon attenuated capability");
}

const caveatsOf = (token: MacaroonToken): readonly MacaroonCaveat[] =>
  token.caveats as readonly MacaroonCaveat[];

export function macaroonGrantNarrows(parent: string, child: string): boolean {
  if (parent === child || parent === "*") return true;
  if (parent.endsWith("*") && child.startsWith(parent.slice(0, -1))) return true;
  return scopeNarrows(parent, child);
}

export interface MacaroonAttenuationMonotoneWitness {
  readonly kind: "playing.macaroons.attenuation-monotone:witness";
  readonly parentGrant: string;
  readonly childGrant: string;
  readonly checked: readonly MacaroonCaveat[];
}

export interface MacaroonAttenuationMonotoneObstruction {
  readonly kind: "playing.macaroons.attenuation-monotone:obstruction";
  readonly parentGrant: string;
  readonly childGrant: string;
  readonly reason: string;
  readonly caveat?: MacaroonCaveat;
}

export type MacaroonAttenuationMonotoneJudgment =
  | MacaroonAttenuationMonotoneWitness
  | MacaroonAttenuationMonotoneObstruction;

/**
 * attenuationMonotone — executable law witness for the macaroon/biscuit rule:
 * every appended caveat must move down the authority preorder, and the carried
 * capability must equal the final caveat grant. This is a value-level proof, not
 * a cryptographic verification step.
 */
export function attenuationMonotone(
  parent: MacaroonToken,
  child: MacaroonToken,
): MacaroonAttenuationMonotoneJudgment {
  if (child.parent !== parent.id) {
    return {
      kind: "playing.macaroons.attenuation-monotone:obstruction",
      parentGrant: parent.capability.grants,
      childGrant: child.capability.grants,
      reason: "child token does not name the parent token",
    };
  }
  if (!macaroonGrantNarrows(parent.capability.grants, child.capability.grants)) {
    return {
      kind: "playing.macaroons.attenuation-monotone:obstruction",
      parentGrant: parent.capability.grants,
      childGrant: child.capability.grants,
      reason: "child capability grant widens the parent grant",
    };
  }

  let previousGrant = parent.capability.grants;
  const appended = caveatsOf(child).slice(caveatsOf(parent).length);
  for (const next of appended) {
    if (!macaroonGrantNarrows(previousGrant, next.grants)) {
      return {
        kind: "playing.macaroons.attenuation-monotone:obstruction",
        parentGrant: parent.capability.grants,
        childGrant: child.capability.grants,
        reason: "caveat widens the previous grant",
        caveat: next,
      };
    }
    previousGrant = next.grants;
  }

  if (child.caveats.length > 0 && child.capability.grants !== previousGrant) {
    return {
      kind: "playing.macaroons.attenuation-monotone:obstruction",
      parentGrant: parent.capability.grants,
      childGrant: child.capability.grants,
      reason: "child capability grant does not equal the final caveat grant",
    };
  }

  return {
    kind: "playing.macaroons.attenuation-monotone:witness",
    parentGrant: parent.capability.grants,
    childGrant: child.capability.grants,
    checked: appended,
  };
}

/** macaroonFromCapability — view an existing CapabilityView as a portable token. */
export function macaroonFromCapability(capability: CapabilityView, options: MacaroonOptions = {}): MacaroonToken {
  const token: MacaroonToken = {
    kind: "playing.macaroons.token",
    id: options.id ?? freshId("macaroon"),
    capability,
    caveats: [],
    signature: options.signature ?? structuralSignature("root", capability.id, capability.grants),
  };
  return macaroonTokenCarrier.assert(token, "macaroon token") as MacaroonToken;
}

/** caveat — declare one first- or third-party authority-narrowing predicate. */
export function caveat(predicate: string, grants: string, options: CaveatOptions = {}): MacaroonCaveat {
  const entry: MacaroonCaveat = {
    kind: "playing.macaroons.caveat",
    id: options.id ?? freshId("macaroon-caveat"),
    mode: options.mode ?? "first-party",
    predicate,
    grants,
    ...(options.location === undefined ? {} : { location: options.location }),
    ...(options.discharger === undefined ? {} : { discharger: options.discharger }),
  };
  return macaroonCaveatCarrier.assert(entry, "macaroon caveat");
}

export function thirdPartyCaveat(
  predicate: string,
  grants: string,
  discharger: string,
  location: string,
  options: Omit<CaveatOptions, "mode" | "location" | "discharger"> = {},
): MacaroonCaveat {
  return caveat(predicate, grants, {
    ...options,
    mode: "third-party",
    location,
    discharger,
  });
}

/**
 * attenuate — append one caveat. This is the macaroon restriction step: the
 * caveat grant must be <= the current grant, and the resulting token carries
 * the caveat-narrowed CapabilityView with parent provenance.
 */
export function attenuate(token: MacaroonToken, next: MacaroonCaveat, options: MacaroonOptions = {}): MacaroonToken {
  if (!macaroonGrantNarrows(token.capability.grants, next.grants)) {
    throw new TypeError(`macaroon attenuate: ${next.grants} widens ${token.capability.grants}`);
  }
  const narrowed = capabilityFrom(token.capability, next.grants, token.capability.id);
  const child: MacaroonToken = {
    kind: "playing.macaroons.token",
    id: options.id ?? freshId("macaroon"),
    parent: token.id,
    capability: narrowed,
    caveats: [...token.caveats, next],
    signature: options.signature ?? structuralSignature(token.signature, next.id, next.predicate, next.grants),
  };
  return macaroonTokenCarrier.assert(child, "attenuated macaroon") as MacaroonToken;
}

/**
 * discharge — satisfy a third-party caveat by name-passing a delegated
 * capability view from the caveat's discharger. It must name the caveat's
 * narrowed grant and holder.
 */
export function discharge(caveatToDischarge: MacaroonCaveat, capability: CapabilityView, options: DischargeOptions = {}): MacaroonDischarge {
  if (caveatToDischarge.mode !== "third-party") {
    throw new TypeError("macaroon discharge: only third-party caveats require discharge");
  }
  if (capability.grants !== caveatToDischarge.grants) {
    throw new TypeError("macaroon discharge: delegated grant must match caveat grant");
  }
  if (caveatToDischarge.discharger !== undefined && capability.holder !== caveatToDischarge.discharger) {
    throw new TypeError("macaroon discharge: capability holder must be the caveat discharger");
  }
  const proof: MacaroonDischarge = {
    kind: "playing.macaroons.discharge",
    id: options.id ?? freshId("macaroon-discharge"),
    caveat: caveatToDischarge.id,
    by: capability.holder,
    capability,
    signature: options.signature ?? structuralSignature("discharge", caveatToDischarge.id, capability.id),
  };
  return macaroonDischargeCarrier.assert(proof, "macaroon discharge") as MacaroonDischarge;
}

function firstPartySatisfied(next: MacaroonCaveat, predicates: readonly string[]): boolean {
  return predicates.includes(next.predicate);
}

function thirdPartySatisfied(next: MacaroonCaveat, context: MacaroonVerificationContext): boolean {
  const discharge = context.discharges?.find((entry) => entry.caveat === next.id);
  if (discharge === undefined) return false;
  if (discharge.capability.grants !== next.grants) return false;
  if (next.discharger !== undefined && discharge.by !== next.discharger) return false;
  return canInvokeCapability(context.affordances, discharge.capability);
}

/** verifyMacaroon — walk the caveat chain and the final canInvoke gate. */
export function verifyMacaroon(token: MacaroonToken, context: MacaroonVerificationContext): MacaroonVerification {
  const failures: string[] = [];
  let previousGrant: string | undefined;

  for (const next of token.caveats) {
    if (previousGrant !== undefined && !macaroonGrantNarrows(previousGrant, next.grants)) {
      failures.push(`${next.id}: caveat widens previous grant`);
    }
    previousGrant = next.grants;
    if (next.mode === "first-party") {
      if (!firstPartySatisfied(next, context.predicates ?? [])) failures.push(`${next.id}: caveat predicate unsatisfied`);
    } else if (!thirdPartySatisfied(next, context)) {
      failures.push(`${next.id}: third-party caveat lacks delegated discharge`);
    }
  }

  if (token.caveats.length > 0) {
    const last = token.caveats[token.caveats.length - 1];
    if (last !== undefined && token.capability.grants !== last.grants) {
      failures.push(`${token.id}: token grant does not equal final caveat grant`);
    }
  }

  if (!canInvokeCapability(context.affordances, token.capability)) {
    failures.push(`${token.id}: capability grant is not held`);
  }

  return {
    valid: failures.length === 0,
    token,
    checked: token.caveats,
    failures,
  };
}

export function canInvokeMacaroon(token: MacaroonToken, context: MacaroonVerificationContext): boolean {
  return verifyMacaroon(token, context).valid;
}

export function invoke(token: MacaroonToken, context: MacaroonVerificationContext): MacaroonInvocation {
  const verified = verifyMacaroon(token, context).valid;
  return macaroonInvocationCarrier.assert({
    kind: "playing.macaroons.invocation",
    token: token.id,
    grants: token.capability.grants,
    holder: token.capability.holder,
    verified,
    exercisable: verified,
  }, "macaroon invocation");
}

export const canInvoke = canInvokeMacaroon;

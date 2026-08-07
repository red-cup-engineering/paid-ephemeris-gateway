/**
 * wasi — WebAssembly System Interface as playing's OUT-face sandbox.
 *
 * This module models WASI's capability security, not a WebAssembly runtime. A
 * preopened handle is the WASI view of an existing object-capability: its grant is
 * the playable locus, an invocation is the cut against the holder's affordances,
 * and attenuation narrows authority monotonically while preserving provenance.
 */
import {
  capabilityViewCarrier,
  wasiCutCarrier,
  wasiInvocationCarrier,
  wasiPreopenCarrier,
  type CapabilityView,
  type WasiCut as WasiCutCarrierShape,
  type WasiInvocation as WasiInvocationCarrierShape,
  type WasiPreopen as WasiPreopenCarrierShape,
} from "./carriers/index.mjs";
import { designFromActs } from "./structuring/concurrent-game/with-symmetry/ludicizing/design.mjs";
import { locus, locusKey } from "./structuring/concurrent-game/with-symmetry/ludicizing/locus.mjs";
import { convergenceJudgment } from "./structuring/concurrent-game/with-symmetry/ludicizing/settling/orthogonality.mjs";

export const WASI_RIGHTS = Object.freeze([
  "fd-read",
  "fd-write",
  "path-open",
  "path-create-directory",
  "path-filestat-get",
  "path-filestat-set-times",
  "path-remove-directory",
  "path-unlink-file",
  "clock-time-get",
  "random-get",
] as const);

export type WasiRight = typeof WASI_RIGHTS[number] | (string & {});
export type WasiRights = readonly WasiRight[];
export type WasiInvocation = WasiInvocationCarrierShape;
export type WasiHandle = Omit<WasiPreopenCarrierShape, "capability" | "rights"> & {
  readonly capability: CapabilityView;
  readonly rights: readonly WasiRight[];
};
export type WasiPreopen = WasiHandle;
export type WasiInteraction = Omit<WasiCutCarrierShape, "invocation"> & {
  readonly invocation: WasiInvocation;
};
export type WasiCut = WasiInteraction;

export { wasiPreopenSchema as wasiHandleSchema, wasiPreopenCarrier as wasiHandleCarrier } from "./carriers/index.mjs";

export interface GrantOptions {
  readonly id?: string;
  readonly parent?: string;
}

export interface PreopenOptions {
  readonly handle?: number;
  readonly path?: string;
  readonly rights?: WasiRights;
}

export interface AttenuateOptions extends GrantOptions {
  readonly rights?: WasiRights;
  readonly path?: string;
}

let MINT = 0;

function freshCapabilityId(holder: string, grants: string): string {
  MINT += 1;
  return `urn:wasi-cap:${encodeURIComponent(holder)}:${encodeURIComponent(grants)}:${MINT}`;
}

function defaultPath(grants: string): string {
  const [path = grants] = grants.split("|", 1);
  return path;
}

function uniqueRights(rights: WasiRights): string[] {
  return [...new Set(rights)].sort();
}

function rightsSubset(child: WasiRights, parent: WasiRights): boolean {
  const allowed = new Set(parent);
  return child.every((right) => allowed.has(right));
}

function sameOrNarrowerGrant(parent: string, child: string): boolean {
  if (parent === child) return true;
  if (parent.endsWith("|*")) {
    const base = parent.slice(0, -2);
    return child === base || child.startsWith(`${base}/`) || child.startsWith(`${base}:`);
  }
  if (parent.endsWith("/*")) {
    const base = parent.slice(0, -2);
    return child === base || child.startsWith(`${base}/`);
  }
  return child.startsWith(`${parent}/`) || child.startsWith(`${parent}:`);
}

export const scopeNarrows = sameOrNarrowerGrant;

export function wasiLocus(target: CapabilityView | WasiPreopen): string {
  return capabilityOf(target).grants;
}

function capabilityOf(target: CapabilityView | WasiPreopen): CapabilityView {
  return "capability" in target ? target.capability : target;
}

function handleOf(target: CapabilityView | WasiPreopen): number {
  return "handle" in target ? target.handle : 0;
}

function cutWitness(invocation: WasiInvocation, exercisable: boolean): WasiCut {
  const root = locus([]);
  const invocationDesign = designFromActs(new Map([[locusKey(root), "proponent"]]));
  const affordanceDesign = designFromActs(new Map([[locusKey(exercisable ? root : locus([1])), "opponent"]]));
  const judgment = convergenceJudgment(invocationDesign, affordanceDesign);
  const converged = judgment.kind === "game.convergence:witness";
  const cut: WasiCut = {
    kind: "playing.wasi.cut",
    invocation,
    converged,
    daimonLoci: converged ? judgment.daimonLoci.map((xi) => [...xi.address]) : [],
    ...(converged ? {} : { reason: judgment.reason }),
  };
  return wasiCutCarrier.assert(cut, "wasi cut") as WasiCut;
}

/**
 * grant — issue a capability-like root authority. This is intentionally the same
 * structural authority shape as WMAP/OCap: `grants` is the move/locus, not an ACL.
 */
export function grant(holder: string, grants: string, options: GrantOptions = {}): CapabilityView {
  return capabilityViewCarrier.assert({
    id: options.id ?? freshCapabilityId(holder, grants),
    grants,
    holder,
    ...(options.parent === undefined ? {} : { parent: options.parent }),
  }, "wasi capability grant");
}

/** preopen — project a capability into a WASI preopened handle. */
export function preopen(capability: CapabilityView, options: PreopenOptions = {}): WasiPreopen {
  const preopened: WasiPreopen = {
    kind: "playing.wasi.preopen",
    handle: options.handle ?? 3,
    path: options.path ?? defaultPath(capability.grants),
    rights: uniqueRights(options.rights ?? ["fd-read"]),
    capability,
  };
  return wasiPreopenCarrier.assert(preopened, "wasi preopen") as WasiPreopen;
}

/**
 * attenuate — derive a narrower capability with provenance. It refuses widening:
 * the child grant must sit inside the parent grant and child rights must be a
 * subset of the parent rights.
 */
export function attenuate(parent: WasiPreopen, grants: string, options: AttenuateOptions = {}): WasiPreopen {
  const rights = uniqueRights(options.rights ?? parent.rights);
  if (!sameOrNarrowerGrant(parent.capability.grants, grants)) {
    throw new TypeError(`wasi attenuate: ${grants} widens ${parent.capability.grants}`);
  }
  if (!rightsSubset(rights, parent.rights)) {
    throw new TypeError("wasi attenuate: child rights widen parent rights");
  }
  const grantOptions: GrantOptions = options.id === undefined
    ? { parent: parent.capability.id }
    : { id: options.id, parent: parent.capability.id };
  return preopen(grant(parent.capability.holder, grants, grantOptions), {
    handle: parent.handle,
    path: options.path ?? defaultPath(grants),
    rights,
  });
}

/** canInvoke — soundness gate: exercisable iff the granted move is held. */
export function canInvoke(affordances: readonly string[], target: CapabilityView | WasiPreopen): boolean {
  return affordances.includes(capabilityOf(target).grants);
}

/** invoke — form the WASI invocation carrier for one operation on one handle. */
export function invoke(target: CapabilityView | WasiPreopen, operation = "call"): WasiInvocation {
  const capability = capabilityOf(target);
  return wasiInvocationCarrier.assert({
    kind: "playing.wasi.invocation",
    handle: handleOf(target),
    operation,
    grants: capability.grants,
    holder: capability.holder,
    capability: capability.id,
  }, "wasi invocation") as WasiInvocation;
}

/**
 * cut — run the invocation as playing's interaction: convergence is exactly
 * `canInvoke`, witnessed by cutting a proponent invocation design against the
 * holder's opponent affordance design.
 */
export function cut(affordances: readonly string[], target: CapabilityView | WasiPreopen, operation = "call"): WasiCut {
  const invocation = invoke(target, operation);
  return cutWitness(invocation, canInvoke(affordances, target));
}

export const interact = cut;

/** Whether `child` is a monotone attenuation of `parent`, including provenance. */
export function isAttenuation(parent: WasiPreopen, child: WasiPreopen): boolean {
  return child.capability.parent === parent.capability.id
    && sameOrNarrowerGrant(parent.capability.grants, child.capability.grants)
    && rightsSubset(child.rights, parent.rights);
}

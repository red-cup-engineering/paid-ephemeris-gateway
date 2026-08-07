/**
 * analysis/differential — measuring a subject against a CONTROL object.
 *
 * A control is a catalog of norms: claims that a reference object — a "good"
 * exemplar, a normal form — satisfies. Measuring a subject against the control
 * reads, per norm, a bilattice CHARGE (not pass/fail): potential = the norm
 * holds, active = a divergence is detected, stable = a divergence held under a
 * declared allowance (contested), absurd = no evidence either way.
 *
 * The control is DESCRIPTIVE, not coercive. It is the object we measure
 * divergence *from* — "here is the control for a good X" — not a truth we
 * enforce. Conformance-checking (e.g. of a package ecosystem against a control
 * for a good ecosystem) is one use case; the concept is differential: the
 * reading is the difference between subject and control, valued in charges.
 *
 * Generalized over an opaque `scope` (the use case supplies its own — package
 * layers, document kinds, etc.); the charge vocabulary is relating's own.
 */
import type { ChargeValueName } from "../../../../carriers.mjs";

/**
 * The weight of a norm: error, warning, or info - carried onto every finding
 * read against that norm.
 */
export type Severity = "error" | "warning" | "info";

/** One claim the control asserts a good subject satisfies, within some scopes. */
export type Norm = Readonly<{
  id: string;
  /** the way the norm is measured (a method/probe identifier). */
  way: string;
  severity: Severity;
  /** the scopes this norm applies to (opaque tags the use case defines). */
  scopes: readonly string[];
  claim: string;
}>;

/** A control object: the reference catalog of norms. */
export type Control = Readonly<{ norms: readonly Norm[] }>;

/** A per-norm differential reading of a subject against the control. */
export type Finding = Readonly<{
  norm: string;
  charge: ChargeValueName;
  severity: Severity;
  message: string;
  evidence: readonly string[];
}>;

/** Assemble a control object from its norms. */
export function control(norms: readonly Norm[]): Control {
  return Object.freeze({ norms: Object.freeze([...norms]) });
}

/** The norms of a control that apply within a scope. */
export function normsFor(control: Control, scope: string): readonly Norm[] {
  return control.norms.filter((n) => n.scopes.includes(scope));
}

/** Read a subject against one norm: a charged finding, not a pass/fail. */
export function finding(
  norm: Norm,
  charge: ChargeValueName,
  message: string,
  evidence: readonly string[] = [],
): Finding {
  return Object.freeze({
    norm: norm.id,
    charge,
    severity: norm.severity,
    message,
    evidence: Object.freeze([...evidence]),
  });
}

/**
 * analysis/differential — measuring a subject against a CONTROL object.
 *
 * A control is a catalog of norms a reference object satisfies; measuring a
 * subject against it reads, per norm, a bilattice CHARGE (not pass/fail):
 * potential = the norm holds, active = a divergence, stable = a divergence held
 * under a declared allowance (contested), absurd = no evidence. The control is
 * descriptive, not coercive — the reading is the *difference* from the control,
 * valued in charges. Generalized over an opaque scope.
 */
import type { ChargeValueName } from "../../bilattice-charge.mjs";

/** The weight of a norm. */
export type Severity = "error" | "warning" | "info";

/** One claim the control asserts a good subject satisfies, within some scopes. */
export type Norm = Readonly<{
  id: string;
  way: string;
  severity: Severity;
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

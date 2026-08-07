import type { ChargeValueName } from "@emsenn/relating";
import { assertAssertion, assertionId, reify } from "./assertions.mjs";
import type { AdmissionRefusal, Provenance, RecognitionInput, Assertion, World, WorldInput } from "./types.mjs";
import { asWorld, inertKeyFor, unionInto } from "./world.mjs";

/**
 * Adds assertions to a subject's log in the world, deduplicating by assertion
 * id: returns the resulting world with counts of added and skipped assertions.
 * When opts.recognize is supplied, delegates to admit to gate assertions by
 * provenance recognition.
 */
export function admitLog(
  world: WorldInput,
  subject: string,
  assertions: Iterable<Assertion>,
  opts: { recognize?: RecognitionInput; onReject?: "quarantine" | "refuse" } = {},
): Readonly<{ world: World; added: number; skipped: number; inert?: number; refused?: readonly AdmissionRefusal[] }> {
  if (!subject) throw new TypeError("admitLog: subject must be a non-empty string");
  if (opts.recognize !== undefined) return admit(world, subject, assertions, opts.recognize, opts);

  const out = asWorld(world);
  const existing = out.get(subject) ?? [];
  const have = new Set(existing.map(assertionId));
  const merged = [...existing];
  let added = 0;
  let skipped = 0;
  for (const assertion of assertions) {
    assertAssertion(assertion);
    const id = assertionId(assertion);
    if (have.has(id)) { skipped += 1; continue; }
    have.add(id);
    merged.push(assertion);
    added += 1;
  }
  out.set(subject, merged);
  return Object.freeze({ world: out, added, skipped });
}

/**
 * Reads an assertion's provenance: returns the source and how it was found -
 * from the source field, the signature's by field, or the witnessed t.by field
 * - or null when no readable provenance is present.
 */
export function provenanceOf(assertion: Assertion): Provenance | null {
  if (typeof assertion.source === "string" && assertion.source) return Object.freeze({ source: assertion.source, kind: "source" });
  if (assertion.signature && typeof assertion.signature.by === "string" && assertion.signature.by) {
    return Object.freeze({ source: assertion.signature.by, kind: "signature" });
  }
  const t = assertion.t;
  if (t && typeof t === "object" && typeof (t as { by?: unknown }).by === "string" && (t as { by?: string }).by) {
    return Object.freeze({ source: (t as { by: string }).by, kind: "witnessed-t" });
  }
  return null;
}

// A recognizer is a read of the observer's own knowledge about a source's
// recognition cell, never an admission verb. Absence of recognition reads
// absurd (no evidence); an observer who holds contrary claims about a source
// may return the derived active or stable reading explicitly.
/**
 * Builds a recognizer function from a recognition input: maps a source name to
 * its charge value, coercing functions, sets, arrays, maps, and records into a
 * source -> ChargeValueName read. Unknown sources read absurd; a null input
 * reads every source as potential.
 */
export function recognizerFrom(input: RecognitionInput): (source: string) => ChargeValueName {
  if (input == null) return () => "potential";
  if (typeof input === "function") return (source) => coerceCharge(input(source));
  if (input instanceof Set) return (source) => input.has(source) ? "potential" : "absurd";
  if (Array.isArray(input)) {
    const set = new Set(input);
    return (source) => set.has(source) ? "potential" : "absurd";
  }
  if (input instanceof Map) return (source) => input.has(source) ? coerceCharge(input.get(source)) : "absurd";
  if (typeof input === "object") {
    return (source) => Object.prototype.hasOwnProperty.call(input, source)
      ? coerceCharge((input as Record<string, unknown>)[source])
      : "absurd";
  }
  return () => "absurd";
}

/**
 * Admits assertions into a subject's log gated by source recognition:
 * assertions whose provenance reads potential or stable are added, the rest are
 * quarantined under the subject's inert key or, when onReject is "refuse",
 * recorded as AdmissionRefusal claims. Returns the resulting world with added,
 * skipped, inert, and refused counts.
 */
export function admit(
  world: WorldInput,
  subject: string,
  assertions: Iterable<Assertion>,
  recognize: RecognitionInput,
  opts: { onReject?: "quarantine" | "refuse" } = {},
): Readonly<{ world: World; added: number; skipped: number; inert: number; refused: readonly AdmissionRefusal[] }> {
  const recognizes = recognizerFrom(recognize);
  const out = asWorld(world);
  const admitted: Assertion[] = [];
  const quarantined: Assertion[] = [];
  const refused: AdmissionRefusal[] = [];

  for (const assertion of assertions) {
    assertAssertion(assertion);
    const provenance = provenanceOf(assertion);
    const standing = provenance ? recognizes(provenance.source) : "absurd";
    const recognized = provenance && (standing === "potential" || standing === "stable");
    if (recognized) {
      admitted.push(assertion);
    } else if (opts.onReject === "refuse") {
      // The refusal is the gate's own claim of the contrary predicate — an
      // assertion in its own right about the reified assertion — never a
      // denial of the refused assertion.
      const assertionKey = assertionId(assertion);
      const source = provenance?.source ?? null;
      refused.push(Object.freeze({
        claim: Object.freeze({ e: reify(assertion), a: "refused-admission", v: source ?? "unprovenanced" }),
        assertion: assertionKey,
        source,
        standing,
        reason: provenance
          ? `source '${provenance.source}' is not recognized (${standing}); the gate claims refused-admission.`
          : "assertion carries no readable provenance; the gate claims refused-admission.",
      }));
    } else {
      quarantined.push(assertion);
    }
  }

  const admittedResult = unionInto(out, subject, admitted);
  const inertResult = unionInto(admittedResult.world, inertKeyFor(subject), quarantined);
  return Object.freeze({
    world: inertResult.world,
    added: admittedResult.added,
    skipped: admittedResult.skipped + inertResult.skipped,
    inert: inertResult.added,
    refused: Object.freeze(refused),
  });
}

function coerceCharge(value: unknown): ChargeValueName {
  if (value === true) return "potential";
  if (value === false) return "absurd";
  if (value === "potential" || value === "active" || value === "absurd" || value === "stable") return value;
  if (value && typeof value === "object") {
    const object = value as { value?: unknown; settled?: unknown };
    if (object.value !== undefined) return coerceCharge(object.value);
    if (object.settled !== undefined) return object.settled ? "potential" : "absurd";
  }
  return "absurd";
}

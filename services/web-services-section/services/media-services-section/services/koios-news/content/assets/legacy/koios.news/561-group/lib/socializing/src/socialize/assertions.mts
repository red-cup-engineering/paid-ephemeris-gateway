/**
 * socialize/assertions - assertion-world reads over the Social Field.
 *
 * This cannibalizes the useful part of animating-experimental's assertion worlds
 * into socializing: an EAV assertion is admitted as an observer-local meme, and
 * disagreement is a derived multi-observer read over contrary predicates. There
 * is no second World carrier here; the Social Field remains the one socializing
 * carrier, and federation is still merge/settle/converge over observer stalks.
 */
import {
  action,
  cell,
  claim,
  jsonResource,
  mark,
  meme,
  predicateOfClaim,
  token,
  witnessedPotential,
  type Action,
  type JsonRecord,
  type JsonValue,
  type Meme,
} from "@emsenn/relating";
import {
  admitField,
  type Field,
} from "./field.mjs";
import {
  assertionDisagreementsCarrier,
  socialFieldCarrier,
  type AssertionDisagreements,
} from "../carriers.mjs";

export interface SocialAssertion {
  readonly e: JsonValue;
  readonly a: string;
  readonly v: JsonValue;
  readonly t?: JsonValue;
  readonly source?: string;
}

export interface AssertionDisagreement {
  readonly subject: JsonValue;
  readonly predicate: string;
  readonly contrary: string;
  readonly object: JsonValue;
  readonly observers: readonly number[];
  readonly contraryObservers: readonly number[];
  readonly value: "stable";
}

const CONTRARY_PREDICATE = "contrary-to";

function isRecord(value: JsonValue): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stableKey(value: JsonValue): string {
  return JSON.stringify(value);
}

function assertionFrom(value: JsonValue, context: string): SocialAssertion {
  if (!isRecord(value) || typeof value.a !== "string" || value.a.trim() === "" || value.e === undefined || value.v === undefined) {
    throw new TypeError(`${context}: expected an assertion { e, a, v }`);
  }
  return Object.freeze({
    e: value.e,
    a: value.a,
    v: value.v,
    ...(value.t === undefined ? {} : { t: value.t }),
    ...(typeof value.source === "string" ? { source: value.source } : {}),
  });
}

function assertionsFrom(value: JsonValue, context: string): readonly SocialAssertion[] {
  const list = Array.isArray(value) ? value : [value];
  return Object.freeze(list.map((item, index) => assertionFrom(item as JsonValue, `${context}[${index}]`)));
}

/** Convert one EAV assertion into the meme this observer locally holds. */
export function assertionMeme(assertion: SocialAssertion): Meme {
  const subject = token(mark(assertion.e));
  const predicate = predicateOfClaim(claim(mark(assertion.a)));
  const object = token(mark(assertion.v));
  return meme(
    cell(subject, predicate, object),
    witnessedPotential(mark(Object.freeze(["socializing", "assertion", assertion.e, assertion.a, assertion.v] as const))),
  );
}

/** Admit assertions into one observer's local stalk. */
export function admitAssertions(field: Field, observer: number, assertions: readonly SocialAssertion[]): Field {
  if (!Number.isInteger(observer) || observer < 0 || observer >= field.members.length) {
    throw new RangeError(`admitAssertions: observer ${observer} is out of range`);
  }
  const memes = assertions.map((assertion) => assertionMeme(assertion) as unknown as JsonRecord);
  const members = field.members.map((member, index) =>
    index === observer
      ? Object.freeze({ ...member, memes: Object.freeze([...member.memes, ...memes]) })
      : member);
  return Object.freeze({
    ...field,
    members: Object.freeze(members),
  });
}

/** Endomorphic action: add EAV claims to an observer's local meme stalk. */
export const assertAction: Action = action({
  verb: "assert",
  inputFormat: "json",
  outputFormat: "json",
  options: ["observer", "assertions"],
  summary: "Admit EAV assertions as observer-local memes in a social field.",
  description: "Domain: a social-field carrier. Codomain: the same social-field carrier with assertions appended to one observer's local meme stalk. Assertion admission only witnesses potential cells; disagreement is derived later by assertion-disagreements.",
  domain: socialFieldCarrier,
  codomain: socialFieldCarrier,
  run: (input: unknown, args: Record<string, unknown> = {}): JsonValue => {
    const field = admitField(input as JsonValue, "assert");
    const observer = Number(args.observer ?? 0);
    const assertions = assertionsFrom((args.assertions ?? []) as JsonValue, "assert.assertions");
    return jsonResource(admitAssertions(field, observer, assertions) as unknown as JsonValue, "social-field");
  },
});

type HeldAssertion = {
  readonly observer: number;
  readonly subject: JsonValue;
  readonly predicate: string;
  readonly object: JsonValue;
};

function heldAssertions(field: Field): readonly HeldAssertion[] {
  const held: HeldAssertion[] = [];
  field.members.forEach((member, observer) => {
    for (const local of member.memes) {
      const candidate = local as unknown as {
        readonly cell?: {
          readonly subject?: { readonly mark?: { readonly value?: unknown } };
          readonly predicate?: { readonly mark?: { readonly value?: unknown } };
          readonly object?: { readonly mark?: { readonly value?: unknown } };
        };
      };
      const subject = candidate.cell?.subject?.mark?.value as JsonValue | undefined;
      const predicate = candidate.cell?.predicate?.mark?.value;
      const object = candidate.cell?.object?.mark?.value as JsonValue | undefined;
      if (subject === undefined || object === undefined || typeof predicate !== "string") continue;
      held.push(Object.freeze({ observer, subject, predicate, object }));
    }
  });
  return Object.freeze(held);
}

function contrarietyOf(held: readonly HeldAssertion[], declared: Record<string, string>): ReadonlyMap<string, string> {
  const contrary = new Map<string, string>();
  for (const assertion of held) {
    if (assertion.predicate === CONTRARY_PREDICATE && typeof assertion.subject === "string" && typeof assertion.object === "string") {
      contrary.set(assertion.subject, assertion.object);
    }
  }
  for (const [left, right] of Object.entries(declared)) contrary.set(left, right);
  return contrary;
}

/** Derive stable disagreements from contrary predicates held over the same subject/object. */
export function assertionDisagreements(field: Field, declared: Record<string, string> = {}): AssertionDisagreements {
  const held = heldAssertions(field);
  const contrary = contrarietyOf(held, declared);
  const byCell = new Map<string, { subject: JsonValue; predicate: string; object: JsonValue; observers: Set<number> }>();
  for (const assertion of held) {
    const key = stableKey([assertion.subject, assertion.predicate, assertion.object]);
    const entry = byCell.get(key) ?? {
      subject: assertion.subject,
      predicate: assertion.predicate,
      object: assertion.object,
      observers: new Set<number>(),
    };
    entry.observers.add(assertion.observer);
    byCell.set(key, entry);
  }

  const disagreements: AssertionDisagreement[] = [];
  for (const entry of byCell.values()) {
    const contraryPredicate = contrary.get(entry.predicate);
    if (contraryPredicate === undefined) continue;
    const partner = byCell.get(stableKey([entry.subject, contraryPredicate, entry.object]));
    if (partner === undefined) continue;
    disagreements.push(Object.freeze({
      subject: entry.subject,
      predicate: entry.predicate,
      contrary: contraryPredicate,
      object: entry.object,
      observers: Object.freeze([...entry.observers].sort((a, b) => a - b)),
      contraryObservers: Object.freeze([...partner.observers].sort((a, b) => a - b)),
      value: "stable" as const,
    }));
  }

  return Object.freeze({
    kind: "socializing.assertion-disagreements" as const,
    disagreements: Object.freeze(disagreements),
  }) as AssertionDisagreements;
}

/** Read action: derive assertion disagreements from a social field. */
export const assertionDisagreementsAction: Action = action({
  verb: "assertion-disagreements",
  inputFormat: "json",
  outputFormat: "json",
  options: ["contrary"],
  summary: "Derive stable contrary-predicate disagreements from a social field.",
  description: "Domain: a social-field carrier. Codomain: socializing/assertion-disagreements. This is a read: disagreements are derived from observer-local assertion memes and declared contrary predicates, never admitted as denials.",
  domain: socialFieldCarrier,
  codomain: assertionDisagreementsCarrier,
  run: (input: unknown, args: Record<string, unknown> = {}): JsonValue => {
    const contrary = isRecord(args.contrary as JsonValue)
      ? Object.fromEntries(Object.entries(args.contrary as JsonRecord).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
      : {};
    return jsonResource(assertionDisagreements(admitField(input as JsonValue, "assertion-disagreements"), contrary) as unknown as JsonValue, "assertion-disagreements");
  },
});

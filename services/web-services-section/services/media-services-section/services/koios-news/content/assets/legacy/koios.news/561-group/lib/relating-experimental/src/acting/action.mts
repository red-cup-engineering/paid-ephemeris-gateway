/**
 * acting/action — the boundary-morphism class: an action is a cocone leg.
 *
 * An `action` registers, at the morphism's own definition, "a boundary morphism
 * with declared domain/codomain and the metadata OpenAPI and MCP require." It is
 * categorically a cocone leg: it injects one operation into the package's call
 * surface, whose coproduct apex `induceBins` assembles. `run` is the PURE
 * morphism over the decoded carrier; `in`/`out` name the default wire codecs
 * (string for the articulation family, JSON for composition); summary,
 * description, and the schemas are the documentation slots the transports read.
 *
 * The action carries utterance facts about itself, so the discovery carrier is
 * built from carriers, never from a second metadata model.
 */
import { mark, utterance, type UtteranceCarrier } from "../articulating/index.mjs";
import type { JsonRecord, JsonValue } from "../codecs/json.mjs";
import { wireCodec } from "./codecs.mjs";

/** An action: a registered boundary morphism over the package carrier. */
export interface Action<In extends JsonValue = JsonValue, Out extends JsonValue = JsonValue> {
  readonly kind: "relating.action";
  /** the verb — the CLI subcommand and the operation's name. */
  readonly verb: string;
  /** the default input wire codec name. */
  readonly in: string;
  /** the default output wire codec name. */
  readonly out: string;
  /** names of string-valued argv flags this action accepts (so `--name v` binds). */
  readonly options: readonly string[];
  readonly summary?: string;
  readonly description?: string;
  readonly inputSchema?: JsonRecord;
  readonly outputSchema?: JsonRecord;
  /** the pure morphism: a decoded input carrier (and argv args) to an output carrier. */
  readonly run: (input: In, args: JsonRecord) => Out;
}

/** The spec admitted by `action()`. */
export interface ActionSpec<In extends JsonValue = JsonValue, Out extends JsonValue = JsonValue> {
  readonly verb: string;
  readonly in?: string;
  readonly out?: string;
  readonly options?: readonly string[];
  readonly summary?: string;
  readonly description?: string;
  readonly inputSchema?: JsonRecord;
  readonly outputSchema?: JsonRecord;
  readonly run: (input: In, args: JsonRecord) => Out;
}

/** Register an action. Validates the verb and witnesses the wire codec names. */
export function action<In extends JsonValue = JsonValue, Out extends JsonValue = JsonValue>(
  spec: ActionSpec<In, Out>,
): Action<In, Out> {
  if (!spec.verb || spec.verb.trim() === "") throw new TypeError("action: verb is required");
  const inName = spec.in ?? "json";
  const outName = spec.out ?? "json";
  wireCodec(inName);
  wireCodec(outName);
  return Object.freeze({
    kind: "relating.action" as const,
    verb: spec.verb,
    in: inName,
    out: outName,
    options: Object.freeze([...(spec.options ?? [])]),
    ...(spec.summary === undefined ? {} : { summary: spec.summary }),
    ...(spec.description === undefined ? {} : { description: spec.description }),
    ...(spec.inputSchema === undefined ? {} : { inputSchema: spec.inputSchema }),
    ...(spec.outputSchema === undefined ? {} : { outputSchema: spec.outputSchema }),
    run: spec.run,
  });
}

/** Type guard: a value is an action carrier. */
export function isAction(value: unknown): value is Action {
  return typeof value === "object" && value !== null && (value as { kind?: unknown }).kind === "relating.action";
}

/** A relational fact as an utterance: token mark = {subject, object}, claim mark = predicate. */
export function fact(subject: JsonValue, predicate: string, object: JsonValue): UtteranceCarrier {
  return utterance(mark({ subject, object }), mark(predicate));
}

/** The utterance facts an action carries about itself — the leg's content. */
export function actionUtterances(act: Action): readonly UtteranceCarrier[] {
  const term = `relating.action.${act.verb}`;
  const facts: UtteranceCarrier[] = [
    fact(term, "relating.action.has-verb", act.verb),
    fact(term, "relating.action.accepts-codec", act.in),
    fact(term, "relating.action.emits-codec", act.out),
  ];
  if (act.summary !== undefined) facts.push(fact(term, "relating.action.summary", act.summary));
  if (act.description !== undefined) facts.push(fact(term, "relating.action.description", act.description));
  return Object.freeze(facts);
}

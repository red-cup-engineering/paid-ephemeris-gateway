/**
 * acting/induce — module → carrier: the coproduct apex of a module's actions,
 * resources, and prompts.
 *
 * This is the inverse of the manifest→carrier arrow elsewhere in the workspace
 * (which reads `package.json#bin`). `induceBins` reads a module's registered
 * actions, resources, and prompts and yields the discovery carrier — the
 * coproduct apex into which each leg injects — plus a bound dispatch. CLI,
 * OpenAPI, MCP (tools + resources + prompts), and web UX are projected from this
 * one carrier as functorial images; none invents a second ontology.
 *
 * Resources and prompts are derived from what the package already declares: each
 * action's input/output JSON Schema and the discovery carrier itself project as
 * MCP resources, and each action projects as a guided MCP prompt — so the three
 * standard knowledge-vault primitives come for free, with packages free to
 * register richer resources/prompts via `resource()`/`prompt()`.
 */
import type { UtteranceCarrier } from "../articulating/index.mjs";
import type { JsonRecord } from "../codecs/json.mjs";
import { actionUtterances, fact, isAction, type Action } from "./action.mjs";
import { wireCodec } from "./codecs.mjs";
import { dispatch, type DispatchOptions, type DispatchResult } from "./dispatch.mjs";
import {
  isResource,
  resource,
  resourceDescriptor,
  resourceUtterances,
  type ResourceCarrier,
  type ResourceDescriptor,
} from "./resource.mjs";
import {
  actionPrompt,
  isPrompt,
  promptDescriptor,
  promptUtterances,
  type PromptCarrier,
  type PromptDescriptor,
} from "./prompt.mjs";

/** One action projected as a POST endpoint over the stdio process boundary. */
export interface ActionEndpoint {
  readonly name: string;
  readonly href: string;
  readonly method: "POST";
  readonly input: string;
  readonly output: string;
  readonly summary?: string;
  readonly description?: string;
  readonly inputSchema?: JsonRecord;
  readonly outputSchema?: JsonRecord;
}

/** The discovery carrier: the coproduct apex of a package's legs. */
export interface ActionDiscovery {
  readonly kind: "relating.acting.discovery";
  readonly package: string;
  readonly protocol: "stdio";
  readonly bins: readonly ActionEndpoint[];
  readonly resources: readonly ResourceDescriptor[];
  readonly prompts: readonly PromptDescriptor[];
  readonly utterances: readonly UtteranceCarrier[];
}

/** What `induceBins` returns: the carrier, a bound dispatch, the legs. */
export interface InducedBins {
  readonly discovery: ActionDiscovery;
  readonly actions: readonly Action[];
  readonly resources: readonly ResourceCarrier[];
  readonly prompts: readonly PromptCarrier[];
  readonly dispatch: (argv: readonly string[], stdin: string, options?: DispatchOptions) => DispatchResult;
}

/** Options for inducing bins. */
export interface InduceOptions {
  readonly packageName?: string;
  readonly basePath?: string;
  /** Extra resources to publish beyond the auto-derived schema/discovery ones. */
  readonly resources?: readonly ResourceCarrier[];
  /** Extra prompts to publish beyond the auto-derived per-action ones. */
  readonly prompts?: readonly PromptCarrier[];
  /** Auto-derive one resource per action input/output JSON Schema. Default true. */
  readonly deriveSchemaResources?: boolean;
  /** Auto-derive one guided prompt per action. Default true. */
  readonly derivePrompts?: boolean;
}

function joinPath(basePath: string, leaf: string): string {
  const base = basePath.replace(/\/+$/, "");
  return `${base}/${encodeURIComponent(leaf)}`;
}

/** Keep only the actions out of a module namespace (or accept a list directly). */
export function collectActions(source: Iterable<unknown> | Readonly<Record<string, unknown>>): readonly Action[] {
  return Object.freeze(collectValues(source).filter(isAction));
}

/** Keep only the resources out of a module namespace (or accept a list directly). */
export function collectResources(source: Iterable<unknown> | Readonly<Record<string, unknown>>): readonly ResourceCarrier[] {
  return Object.freeze(collectValues(source).filter(isResource));
}

/** Keep only the prompts out of a module namespace (or accept a list directly). */
export function collectPrompts(source: Iterable<unknown> | Readonly<Record<string, unknown>>): readonly PromptCarrier[] {
  return Object.freeze(collectValues(source).filter(isPrompt));
}

function collectValues(source: Iterable<unknown> | Readonly<Record<string, unknown>>): readonly unknown[] {
  return Symbol.iterator in Object(source)
    ? [...(source as Iterable<unknown>)]
    : Object.values(source as Record<string, unknown>);
}

/** Project an action into its endpoint. */
function endpointOf(act: Action, basePath: string): ActionEndpoint {
  return Object.freeze({
    name: act.verb,
    href: joinPath(basePath, act.verb),
    method: "POST" as const,
    input: wireCodec(act.in).mediaType,
    output: wireCodec(act.out).mediaType,
    ...(act.summary === undefined ? {} : { summary: act.summary }),
    ...(act.description === undefined ? {} : { description: act.description }),
    ...(act.inputSchema === undefined ? {} : { inputSchema: act.inputSchema }),
    ...(act.outputSchema === undefined ? {} : { outputSchema: act.outputSchema }),
  });
}

/** The URI of an action's input/output schema resource. */
function schemaUri(packageName: string, verb: string, side: "input" | "output"): string {
  return `relating://${encodeURIComponent(packageName)}/schema/${encodeURIComponent(verb)}/${side}`;
}

/** Auto-derive the schema resources a package already carries on its actions. */
function schemaResourcesOf(actions: readonly Action[], packageName: string): readonly ResourceCarrier[] {
  const resources: ResourceCarrier[] = [];
  for (const act of actions) {
    if (act.inputSchema !== undefined) {
      const schema = act.inputSchema;
      resources.push(resource({
        uri: schemaUri(packageName, act.verb, "input"),
        name: `${act.verb} input schema`,
        description: `JSON Schema of the ${act.in} input carrier for ${act.verb}.`,
        read: () => `${JSON.stringify(schema, null, 2)}\n`,
      }));
    }
    if (act.outputSchema !== undefined) {
      const schema = act.outputSchema;
      resources.push(resource({
        uri: schemaUri(packageName, act.verb, "output"),
        name: `${act.verb} output schema`,
        description: `JSON Schema of the ${act.out} output carrier for ${act.verb}.`,
        read: () => `${JSON.stringify(schema, null, 2)}\n`,
      }));
    }
  }
  return Object.freeze(resources);
}

/** De-duplicate resources by URI, keeping the first occurrence. */
function dedupeResources(resources: readonly ResourceCarrier[]): readonly ResourceCarrier[] {
  const seen = new Set<string>();
  const kept: ResourceCarrier[] = [];
  for (const res of resources) {
    if (seen.has(res.uri)) continue;
    seen.add(res.uri);
    kept.push(res);
  }
  return Object.freeze(kept);
}

/** De-duplicate prompts by name, keeping the first occurrence. */
function dedupePrompts(prompts: readonly PromptCarrier[]): readonly PromptCarrier[] {
  const seen = new Set<string>();
  const kept: PromptCarrier[] = [];
  for (const pr of prompts) {
    if (seen.has(pr.name)) continue;
    seen.add(pr.name);
    kept.push(pr);
  }
  return Object.freeze(kept);
}

/** Induce the bin surface for a module's legs: the discovery carrier and a bound dispatch. */
export function induceBins(
  source: Iterable<unknown> | Readonly<Record<string, unknown>>,
  options: InduceOptions = {},
): InducedBins {
  const actions = collectActions(source);
  const packageName = options.packageName ?? "@emsenn/relating-experimental";
  const basePath = options.basePath ?? "";
  const term = `relating.package.${packageName}`;
  const bins = actions.map((act) => endpointOf(act, basePath));

  // Registered prompts come first so they win de-duplication over derived ones.
  const registeredPrompts = [...collectPrompts(source), ...(options.prompts ?? [])];
  const derivedPrompts = options.derivePrompts === false ? [] : actions.map(actionPrompt);
  const prompts = dedupePrompts([...registeredPrompts, ...derivedPrompts]);

  // Registered resources come first; auto-derived schema + discovery resources follow.
  const registeredResources = [...collectResources(source), ...(options.resources ?? [])];
  const schemaResources = options.deriveSchemaResources === false ? [] : schemaResourcesOf(actions, packageName);

  const utterances: UtteranceCarrier[] = [
    fact(term, "relating.package.has-name", packageName),
    fact(term, "relating.package.speaks-protocol", "stdio"),
  ];
  for (const act of actions) {
    utterances.push(fact(term, "relating.package.has-action", act.verb));
    for (const u of actionUtterances(act)) utterances.push(u);
  }

  // The discovery carrier is itself a resource; its read thunk closes over the
  // assembled descriptors so the artifact is always the live apex.
  let discoveryRef: ActionDiscovery;
  const discoveryResource = resource({
    uri: `relating://${encodeURIComponent(packageName)}/discovery`,
    name: `${packageName} discovery`,
    description: "The package's coproduct apex: its actions, resources, and prompts.",
    read: () => `${JSON.stringify(discoveryRef, null, 2)}\n`,
  });

  const resources = dedupeResources([...registeredResources, ...schemaResources, discoveryResource]);
  for (const res of resources) {
    utterances.push(fact(term, "relating.package.has-resource", res.uri));
    for (const u of resourceUtterances(res)) utterances.push(u);
  }
  for (const pr of prompts) {
    utterances.push(fact(term, "relating.package.has-prompt", pr.name));
    for (const u of promptUtterances(pr)) utterances.push(u);
  }

  discoveryRef = Object.freeze({
    kind: "relating.acting.discovery" as const,
    package: packageName,
    protocol: "stdio" as const,
    bins: Object.freeze(bins),
    resources: Object.freeze(resources.map(resourceDescriptor)),
    prompts: Object.freeze(prompts.map(promptDescriptor)),
    utterances: Object.freeze(utterances),
  });

  return Object.freeze({
    discovery: discoveryRef,
    actions,
    resources,
    prompts,
    dispatch: (argv: readonly string[], stdin: string, dispatchOptions: DispatchOptions = {}) =>
      dispatch(actions, argv, stdin, { namespace: packageName, ...dispatchOptions }),
  });
}

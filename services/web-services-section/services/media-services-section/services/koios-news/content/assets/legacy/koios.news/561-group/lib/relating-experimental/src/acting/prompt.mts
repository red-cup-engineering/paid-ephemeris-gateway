/**
 * acting/prompt — the composed-message class: a prompt is a cocone leg.
 *
 * A `prompt` injects a *composed message template* into the package's call
 * surface: a named, argument-taking recipe that renders MCP prompt messages. It
 * is the third standard MCP knowledge-vault primitive (alongside tools and
 * resources). `induceBins` collects prompts into the one apex; the MCP transport
 * projects them as `prompts/list` and `prompts/get`.
 *
 * Prompts compose from what the package already declares. `actionPrompt` derives
 * one prompt from an action's own summary/description/codec metadata — so every
 * registered morphism is, for free, a guided prompt an agent can fill in and run.
 * A package may also register richer composed flows (e.g. a research flow that
 * chains several actions) by calling `prompt()` directly.
 */
import type { UtteranceCarrier } from "../articulating/index.mjs";
import { fact, type Action } from "./action.mjs";

/** One rendered prompt message. */
export interface PromptMessage {
  readonly role: "user" | "assistant";
  readonly content: Readonly<{ type: "text"; text: string }>;
}

/** A declared prompt argument. */
export interface PromptArgument {
  readonly name: string;
  readonly description?: string;
  readonly required?: boolean;
}

/** A prompt: a registered composed-message template over the package carrier. */
export interface PromptCarrier {
  readonly kind: "relating.prompt";
  readonly name: string;
  readonly description?: string;
  readonly arguments: readonly PromptArgument[];
  /** render the prompt's messages from the supplied arguments. */
  readonly compose: (args: Readonly<Record<string, string>>) => readonly PromptMessage[];
}

/** The spec admitted by `prompt()`. */
export interface PromptSpec {
  readonly name: string;
  readonly description?: string;
  readonly arguments?: readonly PromptArgument[];
  readonly compose: (args: Readonly<Record<string, string>>) => readonly PromptMessage[];
}

/** The pure descriptor of a prompt — what `prompts/list` returns. */
export interface PromptDescriptor {
  readonly name: string;
  readonly description?: string;
  readonly arguments: readonly PromptArgument[];
}

/** Register a prompt. Validates the name and compose function. */
export function prompt(spec: PromptSpec): PromptCarrier {
  if (!spec.name || spec.name.trim() === "") throw new TypeError("prompt: name is required");
  if (typeof spec.compose !== "function") throw new TypeError("prompt: compose must be a function");
  return Object.freeze({
    kind: "relating.prompt" as const,
    name: spec.name,
    ...(spec.description === undefined ? {} : { description: spec.description }),
    arguments: Object.freeze([...(spec.arguments ?? [])]),
    compose: spec.compose,
  });
}

/** Type guard: a value is a prompt carrier. */
export function isPrompt(value: unknown): value is PromptCarrier {
  return typeof value === "object" && value !== null && (value as { kind?: unknown }).kind === "relating.prompt";
}

/** A convenience user-text message. */
export function userMessage(text: string): PromptMessage {
  return Object.freeze({ role: "user" as const, content: Object.freeze({ type: "text" as const, text }) });
}

/** The pure descriptor of a prompt (no compose). */
export function promptDescriptor(pr: PromptCarrier): PromptDescriptor {
  return Object.freeze({
    name: pr.name,
    ...(pr.description === undefined ? {} : { description: pr.description }),
    arguments: pr.arguments,
  });
}

/**
 * Derive a prompt from an action: a guided template that asks the agent to
 * produce the action's input carrier and run the verb. Composed entirely from
 * the action's own declared metadata — no second description.
 */
export function actionPrompt(act: Action): PromptCarrier {
  const summary = act.summary ?? `the ${act.verb} morphism`;
  return prompt({
    name: act.verb,
    description: act.summary ?? act.description ?? `Invoke the ${act.verb} operation.`,
    arguments: [
      Object.freeze({ name: "input", description: `The ${act.in} input carrier for ${act.verb}.`, required: true }),
    ],
    compose: (args) => {
      const lines = [
        `Operation: ${act.verb} — ${summary}.`,
        ...(act.description === undefined ? [] : [act.description]),
        `Input wire: ${act.in}. Output wire: ${act.out}.`,
        "",
        `Produce a well-formed ${act.in} input carrier, then call ${act.verb} with it.`,
        ...(args["input"] === undefined || args["input"] === "" ? [] : ["", "Given input:", args["input"]]),
      ];
      return [userMessage(lines.join("\n"))];
    },
  });
}

/** The utterance facts a prompt carries about itself — the leg's content. */
export function promptUtterances(pr: PromptCarrier): readonly UtteranceCarrier[] {
  const term = `relating.prompt.${pr.name}`;
  const facts: UtteranceCarrier[] = [fact(term, "relating.prompt.has-name", pr.name)];
  if (pr.description !== undefined) facts.push(fact(term, "relating.prompt.description", pr.description));
  for (const arg of pr.arguments) facts.push(fact(term, "relating.prompt.has-argument", arg.name));
  return Object.freeze(facts);
}

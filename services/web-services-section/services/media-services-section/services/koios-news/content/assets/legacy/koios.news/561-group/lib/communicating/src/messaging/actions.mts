/**
 * messaging/actions — message passing as cocone legs on the relating-experimental
 * `acting` boundary, so channels and messages get the same unified
 * CLI/HTTP/OpenAPI/MCP/WebUX surface and EAVT witnessing as every other operation.
 *
 * Sending and receiving are witnessed plays: the append-only ledger IS the
 * message log (the linear resource's life recorded as EAVT), and projected state
 * is the read-model.
 */
import { action, jsonResource, type Action, type JsonValue, type JsonRecord } from "@emsenn/relating-experimental";

import { semiosphere } from "../speaking/signifying/index.mjs";
import type { CompiledBundle } from "../speaking/listening/algebra/index.mjs";
import {
  listener,
  openChannel,
  receiveMessage,
  sendMessage,
  speaker,
  type MessageCarrier,
} from "./index.mjs";

function record(input: JsonValue, verb: string): JsonRecord {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError(`${verb}: expected a JSON object`);
  }
  return input as JsonRecord;
}

const str = (record: JsonRecord, key: string, verb: string): string => {
  const value = record[key];
  if (typeof value !== "string") throw new TypeError(`${verb}: ${key} must be a string`);
  return value;
};

/** open-channel — a directed relation between two semiospheres (a medium). */
export const openChannelAction: Action = action({
  verb: "open-channel",
  in: "json",
  out: "json",
  summary: "Open a channel: a directed relation between two semiospheres.",
  description: "Domain: { medium, from, to, capacity? } as JSON (or form). Codomain: the ChannelCarrier as JSON.",
  run: (input: JsonValue): JsonValue => {
    const r = record(input, "open-channel");
    const capacity = typeof r["capacity"] === "string" ? Number(r["capacity"]) : typeof r["capacity"] === "number" ? r["capacity"] : null;
    return jsonResource(openChannel(str(r, "medium", "open-channel"), semiosphere(str(r, "from", "open-channel")), semiosphere(str(r, "to", "open-channel")), capacity), "channel");
  },
});

/** send-message — a speaker extends a content into a linear resource in transit.
 *  Articulation of the content is over the supplied language bundle. */
export const sendMessageAction = (bundle: CompiledBundle): Action => action({
  verb: "send-message",
  in: "json",
  out: "json",
  summary: "Send a message: a linear resource carried delivered-via a channel.",
  description: "Domain: { from, to, medium, text, capacity? } as JSON (or form). Codomain: the MessageCarrier (status \"sent\", charge potential) as JSON.",
  run: (input: JsonValue): JsonValue => {
    const r = record(input, "send-message");
    const from = speaker(str(r, "from", "send-message"));
    const to = listener(str(r, "to", "send-message"));
    const medium = typeof r["medium"] === "string" ? r["medium"] : "default";
    const capacity = typeof r["capacity"] === "string" ? Number(r["capacity"]) : typeof r["capacity"] === "number" ? r["capacity"] : null;
    const channel = openChannel(medium, from.semiosphere, to.semiosphere, capacity);
    return jsonResource(sendMessage(from, to, channel, str(r, "text", "send-message"), bundle), "message");
  },
});

/** receive-message — the listener restricts the resource to an uptake, consuming it.
 *  The listener's reading is settled over the supplied language bundle. */
export const receiveMessageAction = (bundle: CompiledBundle): Action => action({
  verb: "receive-message",
  in: "json",
  out: "json",
  summary: "Receive a message: restrict the resource to an uptake, consuming it (linear).",
  description: "Domain: a MessageCarrier as JSON (the codomain of send-message). Codomain: the UptakeCarrier (the consumed message + the listener's reading) as JSON.",
  run: (input: JsonValue): JsonValue =>
    jsonResource(receiveMessage(record(input, "receive-message") as unknown as MessageCarrier, bundle), "uptake"),
});

/** The messaging actions added to a language's discovery apex, over its bundle. */
export const messagingActions = (bundle: CompiledBundle): readonly Action[] => Object.freeze([
  openChannelAction,
  sendMessageAction(bundle),
  receiveMessageAction(bundle),
]);

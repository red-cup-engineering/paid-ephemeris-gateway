import { fileURLToPath } from "node:url";

import { ACCOUNT, ACTOR, CONTEXT, digest, record, records } from "./boundary.mjs";
import {
  invokeLicensedEditorialState,
  solicitLicensedEditorialState,
} from "./contract-licensed-editorial-state.mjs";
import {
  invokeAdmissibleResearchPacket,
  solicitAdmissibleResearchPacket,
} from "./contract-admissible-research-packet.mjs";

export const SERVICE_SECTION = Object.freeze({
  "@context": CONTEXT,
  id: ACTOR,
  type: "Service",
  name: "Koios News Service Section",
  summary: "Warrant-preserving news-domain services that publications may hire without surrendering their editorial sovereignty.",
  account: ACCOUNT,
  inbox: Object.freeze({
    carrier: "newline-delimited JSON over standard input and output",
    operation: "settle-message",
    command: "node src/service-section.mjs settle-message [UTC-instant]",
  }),
  operations: Object.freeze([
    Object.freeze({
      service: "admissible-research-packet",
      demandType: "AdmissibleResearchPacketDemand",
      effect: "form-admissible-research-packet",
      price: Object.freeze({ amount: 0, currency: "USD" }),
    }),
    Object.freeze({
      service: "licensed-editorial-state",
      demandType: "LicensedEditorialStateDemand",
      effect: "form-licensed-editorial-state",
      price: Object.freeze({ amount: 0, currency: "USD" }),
    }),
    Object.freeze({
      service: "mathematics-research-intake",
      inputType: "ResearchSourcePacketDelivery",
      effect: "admit-authority-or-form-explicit-refusal",
      command: "node src/contract-mathematics-research-intake.mjs [UTC-instant]",
      price: Object.freeze({ amount: 0, currency: "USD" }),
    }),
  ]),
  boundary: Object.freeze({
    owns: Object.freeze(["news-domain law", "service offers", "provider receipts", "typed refusals"]),
    doesNotOwn: Object.freeze(["a publication's attention policy", "a publication's corpus", "publication approval", "public artifacts", "delivery authority"]),
  }),
});

function validInstant(value) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u.test(value) && !Number.isNaN(Date.parse(value));
}

function priorSettlement(messageDigest) {
  return records("koios-news-service-section.inbox-settlements")
    .findLast((value) => value.kind === "inbox.settlement" && value.messageDigest === messageDigest);
}

function refuse(activity, instant, code, summary) {
  return Object.freeze({
    "@context": CONTEXT,
    type: "Reject",
    actor: ACTOR,
    target: activity?.actor,
    object: activity,
    published: instant,
    code,
    summary,
  });
}

function routeFor(activity) {
  if (activity?.type === "Offer" && activity?.object?.type === "ServiceSolicitation") {
    const demandType = activity.object?.sourceActivity?.object?.type;
    if (demandType === "LicensedEditorialStateDemand") {
      return Object.freeze({ service: "licensed-editorial-state", phase: "solicit", settle: solicitLicensedEditorialState });
    }
    if (demandType === "AdmissibleResearchPacketDemand") {
      return Object.freeze({ service: "admissible-research-packet", phase: "solicit", settle: solicitAdmissibleResearchPacket });
    }
    return undefined;
  }
  if (activity?.type === "Accept" && activity?.object?.type === "ServiceContract") {
    const service = activity.object?.offer?.object?.service;
    if (service === "licensed-editorial-state") {
      return Object.freeze({ service, phase: "invoke", settle: invokeLicensedEditorialState });
    }
    if (service === "admissible-research-packet") {
      return Object.freeze({ service, phase: "invoke", settle: invokeAdmissibleResearchPacket });
    }
  }
  return undefined;
}

/**
 * Settle one exact inter-enterprise message at the Service Section boundary.
 *
 * The dispatcher only chooses among operations the Service Section itself
 * advertises. It neither discovers external providers nor acts in a customer
 * publication's territory. Exact-message replay returns the first durable
 * response, so a filesystem watcher may safely deliver a message again.
 */
export async function settleMessage(activity, instant = new Date().toISOString()) {
  if (!validInstant(instant)) throw new Error(`explicit UTC instant required: ${instant}`);
  const messageDigest = digest(activity);
  const prior = priorSettlement(messageDigest);
  if (prior !== undefined) {
    await record("koios-news-service-section.inbox-replays", instant, { kind: "inbox.replay", messageDigest, settlementDigest: prior.settlementDigest, recordedAt: instant });
    return prior.response;
  }

  let route;
  let response;
  if (activity?.["@context"] !== CONTEXT || activity?.target !== ACTOR) {
    response = refuse(activity, instant, "wrong-boundary", "message must be an ActivityStreams activity addressed to this Service Section");
  } else {
    route = routeFor(activity);
    response = route === undefined
      ? refuse(activity, instant, "unoffered-operation", "no advertised Service Section operation admits this message")
      : await route.settle(activity, instant);
  }

  const settlement = Object.freeze({
    kind: "inbox.settlement",
    messageDigest,
    settlementDigest: digest(response),
    route: route === undefined ? null : Object.freeze({ service: route.service, phase: route.phase }),
    disposition: response.type === "Reject" ? "refused" : "settled",
    response,
    recordedAt: instant,
  });
  await record("koios-news-service-section.inbox-settlements", instant, settlement);
  return response;
}

export function describeServiceSection() {
  return SERVICE_SECTION;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];
  if (command === "describe") {
    process.stdout.write(`${JSON.stringify(describeServiceSection())}\n`);
  } else if (command === "settle-message") {
    const instant = process.argv[3] ?? new Date().toISOString();
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const activity = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    process.stdout.write(`${JSON.stringify(await settleMessage(activity, instant))}\n`);
  } else {
    throw new Error(`unknown command: ${command ?? "(missing)"}`);
  }
}

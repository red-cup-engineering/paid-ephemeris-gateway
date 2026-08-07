import { fileURLToPath } from "node:url";

import { ACTOR, CONTEXT, digest, record } from "./boundary.mjs";

export const MATHEMATICS_RESEARCH_ACTOR = "urn:ame:mathematics-research-enterprise";
export const MATHEMATICS_CURRICULUM_ACTOR = "urn:ame:mathematics-curriculum-enterprise";
export const CATEGORY = "koios-news.mathematics-research-intake";

const PACKET_KIND = "mathematics-research.source-packet-admission";
const DELIVERY_KIND = "mathematics-research.source-packet-delivery";
const REFUSAL_KIND = "koios-news.mathematics-research-intake-refusal";
const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;

function validInstant(value) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u.test(value) && !Number.isNaN(Date.parse(value));
}

function exact(value, objectKind) {
  if (!value || typeof value !== "object" || !NI.test(value.id ?? "")) return false;
  const { id, ...body } = value;
  return id === digest(body, objectKind);
}

function validateDelivery(delivery) {
  if (!exact(delivery, DELIVERY_KIND) || delivery.type !== "Accept" || delivery.actor !== MATHEMATICS_RESEARCH_ACTOR) {
    throw new TypeError("mathematics research intake requires the exact canonical producer delivery");
  }
  const packet = delivery.object;
  if (!exact(packet, PACKET_KIND) || packet.type !== "ResearchSourcePacketAdmission" || packet.provider !== MATHEMATICS_RESEARCH_ACTOR) {
    throw new TypeError("mathematics research intake requires the exact canonical admitted packet");
  }
  if (delivery.target !== packet.customer || packet.customer !== MATHEMATICS_CURRICULUM_ACTOR) {
    throw new TypeError("mathematics research delivery and packet authority targets disagree");
  }
  if (!Array.isArray(packet.citations) || packet.citations.length === 0 || !Array.isArray(packet.claims) || packet.claims.length === 0) {
    throw new TypeError("mathematics research packet lacks citations or warranted claims");
  }
  const citations = new Map(packet.citations.map((citation) => [citation?.id, citation]));
  if (citations.size !== packet.citations.length || packet.citations.some((citation) => {
    try {
      const url = new URL(citation.url);
      return !citation.id || url.protocol !== "https:" || url.hostname !== "arxiv.org" || !url.pathname.startsWith("/abs/");
    } catch { return true; }
  })) throw new TypeError("mathematics research packet citation warrants are malformed");
  if (packet.claims.some((claim) => !claim?.statement || !claim?.scope || !Array.isArray(claim.warrants) || claim.warrants.length === 0 || claim.warrants.some((id) => !citations.has(id)))) {
    throw new TypeError("mathematics research packet contains an unwarranted claim");
  }
  if (!Array.isArray(packet.limitations) || packet.limitations.length === 0 || !Array.isArray(packet.reuseGrant)) {
    throw new TypeError("mathematics research packet lacks limitations or reuse authority");
  }
  return packet;
}

/**
 * Admit one exact producer delivery to Koios' authority membrane.
 *
 * This records a receiver decision, not a truth settlement. The current packet
 * is addressed and licensed for curriculum work, so Koios must retain its
 * warrants while refusing to infer editorial or publication authority.
 */
export function settleMathematicsResearchDelivery(delivery, instant = new Date().toISOString(), options = {}) {
  if (!validInstant(instant)) throw new TypeError(`explicit UTC instant required: ${instant}`);
  const packet = validateDelivery(delivery);
  const editorialUses = new Set(["koios-news-editorial", "newsroom-editorial", "news-publication"]);
  const hasEditorialGrant = packet.reuseGrant.some((use) => editorialUses.has(use));
  const addressedToKoios = delivery.target === ACTOR || packet.customer === ACTOR;
  if (hasEditorialGrant && addressedToKoios) {
    throw new TypeError("editorial authority is present; this refusal-only intake cannot infer publication acceptance");
  }

  const body = {
    "@context": CONTEXT,
    type: "Reject",
    actor: ACTOR,
    target: delivery.actor,
    object: delivery.id,
    published: instant,
    code: "editorial-reuse-not-granted",
    summary: "The admitted source packet is addressed to the mathematics curriculum enterprise and grants no Koios editorial or news-publication use.",
    diagnosis: {
      disposition: "authority-refusal",
      observedCustomer: packet.customer,
      observedDeliveryTarget: delivery.target,
      requiredReceiver: ACTOR,
      grantedUses: [...packet.reuseGrant],
      missingAuthorityEdges: [
        { predicate: "addressed-to", requiredObject: ACTOR },
        { predicate: "grants-reuse-for", requiredObject: "koios-news-editorial" },
      ],
    },
    sourceWarrants: packet.citations.map(({ id, title, authors, publisher, url, kind }) => ({ id, title, authors, publisher, url, kind })),
    claimWarrantBindings: packet.claims.map(({ statement, warrants, scope }) => ({ statement, warrants, scope })),
    limitations: [...packet.limitations],
    producerAuthorityWithheld: [...(packet.authorityWithheld ?? [])],
    receiverAuthorityWithheld: ["editorial-acceptance", "truth-settlement", "refutation", "publication", "republication-rights"],
  };
  const refusal = Object.freeze({ id: digest(body, REFUSAL_KIND), ...body });
  record(CATEGORY, instant, refusal, options.dataRoot);
  return refusal;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const instant = process.argv[2] ?? new Date().toISOString();
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const delivery = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  process.stdout.write(`${JSON.stringify(settleMathematicsResearchDelivery(delivery, instant))}\n`);
}

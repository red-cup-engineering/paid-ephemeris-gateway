// Reading the capital off the cable.
//
// The wire is canonical: when a cable URL is configured, stage 1 assembles
// the day's indicators from the published claim-state bundles — the draw
// from cartomantia, the reduction from arithmomantia, the Moon's placement
// and lunation from astrologia's chart — and falls back to local
// computation only when the cable is unreachable or a bundle is missing.
// The same topology code produces both sides, so wire and fallback witness
// each other; what the cable adds is ACCESS: the capital read as a value,
// not recomputed.
//
// The featured motion stays locally computed either way: choosing the
// day's motion is editorial selection over the chart, not a wire claim.

import http from "node:http";
import { lunationOf, signPlacement, type Lunation, type SignPlacement } from "@lenticule-science/divining/astrology";
import { TAROT_DECK, type Spread, type DateReduction } from "@lenticule-science/divining/divination";

type Bundle = Readonly<{
  subject: string;
  claims: readonly Readonly<{
    id: string;
    proposition: Readonly<{ predicate: string; object: unknown }>;
    provenance: Readonly<{ witness: string; method?: string; citation?: string }>;
    force: string;
  }>[];
}>;

export type CableIndicators = Readonly<{
  moon?: Readonly<{ placement: SignPlacement; lunation: Lunation }>;
  tarot?: Spread;
  numerology?: DateReduction;
  /** Which wires answered, for the brief's provenance line. */
  witnessed: readonly string[];
}>;

type CableDirectory = Readonly<{
  wires: readonly Readonly<{
    name: string;
    baseUrl: string;
    surfaces: Readonly<{ items: string }>;
  }>[];
}>;

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new TypeError(`${url}: HTTP ${response.status}`);
  return response.json();
}

/** GET with an explicit Host header — fetch forbids it, node:http does not. */
function httpGetJson(origin: URL, path: string, host: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const request = http.request(
      { hostname: origin.hostname, port: origin.port, path, method: "GET", headers: { host, accept: "application/json" } },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          if ((response.statusCode ?? 0) !== 200) {
            reject(new TypeError(`${origin.origin}${path} (host ${host}): HTTP ${response.statusCode}`));
            return;
          }
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch {
            reject(new TypeError(`${origin.origin}${path}: not JSON`));
          }
        });
      },
    );
    request.on("error", reject);
    request.end();
  });
}

/**
 * Fetch a wire resource by its canonical URL. When the cable is reached
 * indirectly (a local or tunneled origin), the request is re-rooted onto
 * that origin with the canonical host carried explicitly — the cable
 * routes wires by Host, and fetch() forbids overriding Host, so the
 * indirect path goes through node:http.
 */
async function fetchCanonical(cableUrl: string, canonicalUrl: string): Promise<unknown> {
  const canonical = new URL(canonicalUrl);
  const base = new URL(cableUrl);
  const reachable = canonical.host === base.host || canonical.host.endsWith(`.${base.host.split(":")[0]}`);
  if (reachable) return fetchJson(canonicalUrl);
  if (base.protocol !== "http:") throw new TypeError(`indirect cable access needs http: (got ${base.protocol})`);
  return httpGetJson(base, canonical.pathname, canonical.host);
}

function claimObject(bundle: Bundle, predicate: string): unknown {
  return bundle.claims.find((claim) => claim.proposition.predicate === predicate)?.proposition.object;
}

async function wireBundle(
  cableUrl: string,
  directory: CableDirectory,
  wireName: string,
  subject: string,
): Promise<Bundle | null> {
  const wire = directory.wires.find((candidate) => candidate.name === wireName);
  if (!wire) return null;
  // The items surface is a base URL; item resources live at <base><subject>.json.
  const itemUrl = `${wire.surfaces.items}${subject}.json`;
  try {
    return (await fetchCanonical(cableUrl, itemUrl)) as Bundle;
  } catch {
    return null;
  }
}

/**
 * Assemble what the cable can answer for the date. Absent wires or bundles
 * come back undefined; the caller fills gaps by local computation.
 */
export async function indicatorsFromCable(cableUrl: string, dateIso: string): Promise<CableIndicators> {
  const directoryUrl = cableUrl.endsWith("cable.json")
    ? cableUrl
    : `${cableUrl.replace(/\/$/, "")}/cable.json`;
  const directory = (await fetchJson(directoryUrl)) as CableDirectory;
  const witnessed: string[] = [];

  const result: {
    moon?: CableIndicators["moon"];
    tarot?: Spread;
    numerology?: DateReduction;
  } = {};

  const chart = await wireBundle(cableUrl, directory, "astrologia", `chart-${dateIso}`);
  if (chart) {
    const moonPlacement = claimObject(chart, "placement-moon") as
      | Readonly<{ longitude: number; speed: number }>
      | undefined;
    const sunPlacement = claimObject(chart, "placement-sun") as
      | Readonly<{ longitude: number }>
      | undefined;
    if (moonPlacement && sunPlacement) {
      result.moon = Object.freeze({
        placement: signPlacement(moonPlacement.longitude),
        lunation: lunationOf({
          sun: { longitude: sunPlacement.longitude },
          moon: { longitude: moonPlacement.longitude },
        }),
      });
      witnessed.push("astrologia");
    }
  }

  const draw = await wireBundle(cableUrl, directory, "cartomantia", `draw-${dateIso}`);
  if (draw) {
    const card = claimObject(draw, "card") as
      | Readonly<{ name: string; arcana: string; orientation: string; position?: string }>
      | undefined;
    const cardClaim = draw.claims.find((claim) => claim.proposition.predicate === "card");
    const deckCard = card && TAROT_DECK.find((candidate) => candidate.name === card.name);
    if (card && cardClaim && deckCard && (card.orientation === "upright" || card.orientation === "reversed")) {
      result.tarot = Object.freeze({
        spread: "single card",
        date: dateIso,
        positions: Object.freeze([
          Object.freeze({
            position: card.position ?? "the day",
            card: deckCard,
            orientation: card.orientation,
          }),
        ]),
        provenance: Object.freeze({
          method: cardClaim.provenance.method ?? cardClaim.provenance.witness,
          ...(typeof claimObject(draw, "seed") === "string" ? { seed: claimObject(draw, "seed") as string } : {}),
        }),
      });
      witnessed.push("cartomantia");
    }
  }

  const reduction = await wireBundle(cableUrl, directory, "arithmomantia", `reduction-${dateIso}`);
  if (reduction) {
    const value = claimObject(reduction, "reduces-to");
    const orbit = claimObject(reduction, "orbit");
    if (typeof value === "number" && Array.isArray(orbit)) {
      result.numerology = Object.freeze({
        date: dateIso,
        steps: Object.freeze(orbit.map(Number)),
        value,
        kind: ([11, 22, 33].includes(value) ? "master" : "simple") as DateReduction["kind"],
      });
      witnessed.push("arithmomantia");
    }
  }

  return Object.freeze({
    ...(result.moon === undefined ? {} : { moon: result.moon }),
    ...(result.tarot === undefined ? {} : { tarot: result.tarot }),
    ...(result.numerology === undefined ? {} : { numerology: result.numerology }),
    witnessed: Object.freeze(witnessed),
  });
}

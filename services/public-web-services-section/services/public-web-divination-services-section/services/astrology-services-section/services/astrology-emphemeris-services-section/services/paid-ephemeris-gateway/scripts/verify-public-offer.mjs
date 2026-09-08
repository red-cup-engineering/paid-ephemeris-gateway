import { WORKER_ROUTES } from "../src/worker.mjs";
import {
  MOMENT_ESSENTIALS_ROUTE,
  MOMENT_ESSENTIALS_PRICE,
  PRECISION_MOMENT_ROUTE,
  PRECISION_MOMENT_PRICE,
  STATUS_ROUTE,
} from "../src/route-catalog.mjs";
import { MARKET_OBSERVATION_ROUTE, MARKET_OBSERVATION_PRICE } from "../src/market-observation-route.mjs";

const BASE = "eip155:8453";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913".toLowerCase();
// Ruled house payout identity (record: x402.payto-decision, 2026-08-31, in
// x402-services-section/data/logs/2026/09/01/semantic-record-content.jsonl).
const PAY_TO = "0x32886F6F361C1d570255c2762967A2e41D0E9B1a".toLowerCase();

/** Example admission values used only to exercise the paid boundary; never a purchase. */
const EXAMPLE_DATE = "2026-08-15T00:00:00Z";
const EXAMPLE_PRECISION_QUERY = "latitude=46.7867&longitude=-92.1005";

const ROUTE_META = new Map([
  [MOMENT_ESSENTIALS_ROUTE, { name: "Moment Essentials", price: MOMENT_ESSENTIALS_PRICE }],
  [MARKET_OBSERVATION_ROUTE, { name: "x402 Market Observation", price: MARKET_OBSERVATION_PRICE }],
  [PRECISION_MOMENT_ROUTE, { name: "Precision Moment", price: PRECISION_MOMENT_PRICE, query: EXAMPLE_PRECISION_QUERY }],
]);

/** "$0.32" -> "320000": the exact-scheme atomic USDC amount (6 decimals) a price string prices. */
function atomicAmount(price) {
  const match = /^\$(\d+)\.(\d{2})$/u.exec(price);
  if (!match) throw new Error(`unrecognized price format: ${price}`);
  return String(Number(match[1]) * 1_000_000 + Number(match[2]) * 10_000);
}

/** Build one assayable offer from a route the gateway actually declares.
 *
 * `routeTemplate` is not asserted here: a fresh probe of production tonight
 * (2026-09-08) shows `extensions.bazaar` carries no `routeTemplate` field at
 * all for a `:date`-templated route — the same gap `test/prove.mjs` already
 * reproduces against source. That is a live discovery-layer drift, separate
 * from the payout/pricing identity this gate exists to hold the line on; it
 * is not fixed here (application.mjs/route-catalog.mjs are outside this
 * change's authored files) and should be tracked as its own finding. */
function offerForRoute(route) {
  const meta = ROUTE_META.get(route);
  if (!meta) throw new Error(`no assay metadata declared for route ${route}`);
  const path = `${route.replace(":date", EXAMPLE_DATE)}${meta.query ? `?${meta.query}` : ""}`;
  return Object.freeze({ name: meta.name, path, amount: atomicAmount(meta.price) });
}

/** Exactly the offers the Workers transport (`src/worker.mjs`) serves today. */
export const PUBLIC_OFFERS = Object.freeze(WORKER_ROUTES.map(offerForRoute));

/** Precision Moment is real product law (`route-catalog.mjs`) but is dropped from the
 * Workers transport (see `application.mjs`: it needs a subprocess and a DE440 binary,
 * impossible in a Workers isolate) — it is assayed only against an explicit origin that
 * actually serves it, never against the Workers origin. */
export const PRECISION_OFFER = offerForRoute(PRECISION_MOMENT_ROUTE);

function decodePaymentRequired(value) {
  if (typeof value !== "string") throw new Error("payment-required header is absent");
  try { return JSON.parse(Buffer.from(value, "base64url").toString("utf8")); }
  catch { throw new Error("payment-required header does not decode to JSON"); }
}

async function assayOffer(offer, origin, fetchImpl) {
  const url = `${origin}${offer.path}`;
  const response = await fetchImpl(url, { redirect: "error", headers: { accept: "application/json" } });
  if (response.status !== 402) throw new Error(`${offer.name} returned ${response.status}, not 402`);
  const challenge = decodePaymentRequired(response.headers.get("payment-required"));
  const acceptance = (challenge.accepts ?? []).find((entry) => entry.scheme === "exact" && entry.network === BASE);
  const valid = challenge.x402Version === 2
    && challenge.resource?.url === url
    && acceptance?.asset?.toLowerCase() === USDC
    && acceptance?.payTo?.toLowerCase() === PAY_TO
    && acceptance?.amount === offer.amount;
  if (!valid) throw new Error(`${offer.name} challenge drifted from its Coinbase offer`);
  return Object.freeze({ name: offer.name, qualified: true });
}

export async function verifyPublicOffer({
  origin = "https://ephemeris.561.group",
  precisionOrigin = process.env.PRECISION_ORIGIN,
  fetchImpl = globalThis.fetch,
} = {}) {
  const status = await fetchImpl(`${origin}${STATUS_ROUTE}`, { redirect: "error" });
  if (!status.ok || (await status.json()).service !== "paid-ephemeris-gateway") throw new Error("public gateway status failed");
  const offers = await Promise.all(PUBLIC_OFFERS.map((offer) => assayOffer(offer, origin, fetchImpl)));
  const precisionAssayed = Boolean(precisionOrigin);
  if (precisionAssayed) offers.push(await assayOffer(PRECISION_OFFER, precisionOrigin, fetchImpl));
  return Object.freeze({ qualified: true, offers: Object.freeze(offers), precisionAssayed, paymentAttempted: false });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(`${JSON.stringify(await verifyPublicOffer())}\n`);
}

import { OFFERS, PRECISION_OFFER as PRECISION_DECLARATION, ASTRONOMY_PRECISION_OFFER, STATUS_ROUTE } from "../src/route-catalog.mjs";

const BASE = "eip155:8453";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913".toLowerCase();
// Settled payout identity: x402.payto-decision, 2026-08-31.
const PAY_TO = "0x32886F6F361C1d570255c2762967A2e41D0E9B1a".toLowerCase();
const precision = new Set([PRECISION_DECLARATION, ASTRONOMY_PRECISION_OFFER]);
const assayDeclaration = (offer) => {
  const probe = new URL(offer.probeUrl);
  return Object.freeze({ name: offer.declaration.name, path: probe.pathname + probe.search, amount: offer.amount, routeTemplate: offer.declaration.route });
};
export const PUBLIC_OFFERS = Object.freeze(OFFERS.filter((offer) => !precision.has(offer)).map(assayDeclaration));
export const PRECISION_OFFERS = Object.freeze([...precision].map(assayDeclaration));

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
    && acceptance?.amount === offer.amount
    && challenge.extensions?.bazaar?.routeTemplate === offer.routeTemplate;
  if (!valid) throw new Error(`${offer.name} challenge drifted from its declared offer`);
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
  if (precisionAssayed) offers.push(...await Promise.all(PRECISION_OFFERS.map((offer) => assayOffer(offer, precisionOrigin, fetchImpl))));
  return Object.freeze({ qualified: true, offers: Object.freeze(offers), precisionAssayed, paymentAttempted: false });
}
if (import.meta.url === `file://${process.argv[1]}`) process.stdout.write(`${JSON.stringify(await verifyPublicOffer())}\n`);

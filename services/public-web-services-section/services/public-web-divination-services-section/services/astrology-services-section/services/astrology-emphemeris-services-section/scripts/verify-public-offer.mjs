const BASE = "eip155:8453";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913".toLowerCase();
const PAY_TO = "0x42F72C0a340A4A55C082Fe42483e87691D2bff64".toLowerCase();
export const PUBLIC_OFFERS = Object.freeze([
  Object.freeze({ name: "Moment Essentials", path: "/v1/ephemeris/moment/2026-08-15T00:00:00Z", amount: "40000", routeTemplate: "/v1/ephemeris/moment/:date" }),
  Object.freeze({ name: "Precision Moment", path: "/v1/ephemeris/precision-moment/2026-08-15T00:00:00Z?latitude=46.7867&longitude=-92.1005", amount: "320000", routeTemplate: "/v1/ephemeris/precision-moment/:date" }),
  // No :param segment in this route, so Bazaar leaves routeTemplate undefined (per
  // @x402/extensions' own convention: a static path already is the exact resource).
  Object.freeze({ name: "x402 Market Observation", path: "/v1/x402-market/observation", amount: "100000", routeTemplate: undefined }),
]);

function decodePaymentRequired(value) {
  if (typeof value !== "string") throw new Error("payment-required header is absent");
  try { return JSON.parse(Buffer.from(value, "base64url").toString("utf8")); }
  catch { throw new Error("payment-required header does not decode to JSON"); }
}

export async function verifyPublicOffer({ origin = "https://ephemeris.561.group", fetchImpl = globalThis.fetch } = {}) {
  const status = await fetchImpl(`${origin}/v1/status`, { redirect: "error" });
  if (!status.ok || (await status.json()).service !== "paid-ephemeris-gateway") throw new Error("public gateway status failed");
  const offers = await Promise.all(PUBLIC_OFFERS.map(async (offer) => {
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
    if (!valid) throw new Error(`${offer.name} challenge drifted from its Coinbase offer`);
    return Object.freeze({ name: offer.name, qualified: true });
  }));
  return Object.freeze({ qualified: true, offers: Object.freeze(offers), paymentAttempted: false });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(`${JSON.stringify(await verifyPublicOffer())}\n`);
}

/**
 * shop.561.group -- the one page that lists everything the 561 Group
 * sells. Composes `@red-cup-engineering/digital-goods-storefront-services-section`
 * (catalog validation, rendering, download tokens) and
 * `@red-cup-engineering/stripe-services-section` (the card rail) rather
 * than re-implementing either; this file owns only the Worker-specific
 * wiring both packages' own READMEs name as "not built here" -- routing,
 * the KV/R2 bindings, and the honest unarmed/entitlement states.
 */
import {
  catalogModel,
  esc,
  issueDownloadToken,
  renderCatalogHtml,
  renderOfferingHtml,
  stripeOfferingFor,
  validateCatalog,
  verifyDownloadToken,
} from "@red-cup-engineering/digital-goods-storefront-services-section";
import {
  ACTOR as STRIPE_ACTOR,
  ingestWebhook,
  invokeCheckout,
  projectEvent,
  readiness,
  solicitCheckout,
} from "@red-cup-engineering/stripe-services-section";

import catalog from "../catalog.json" with { type: "json" };

import { createKvRecordStore } from "./kv-record-store.mjs";

const PAID_STATUSES = new Set(["live", "test-only"]);
const DOWNLOAD_TTL_SECONDS = 3600;
const BUYER_ACTOR = "urn:ame:shop-561-group-buyer";

/**
 * Projects this site's catalog onto stripe-services-section's fixed-offering
 * catalog shape -- only `live`/`test-only` offerings have a Stripe form.
 * @param {object} siteCatalog `{ merchant, offerings }`
 * @returns {object} the stripe-services-section catalog shape
 */
function stripeCatalogFrom(siteCatalog) {
  return {
    merchant: siteCatalog.merchant,
    offerings: siteCatalog.offerings.filter((offering) => PAID_STATUSES.has(offering.status)).map(stripeOfferingFor),
  };
}

const STRIPE_CATALOG = stripeCatalogFrom(catalog);

/**
 * Whether the card rail can actually accept a charge right now, read
 * honestly from stripe-services-section's own `readiness()` rather than
 * re-decided locally.
 * @param {Record<string,string>} env
 * @returns {boolean}
 */
function checkoutArmed(env) {
  try {
    return readiness({ env, catalog: STRIPE_CATALOG }).credential.present;
  } catch {
    return false;
  }
}

function html(body, status = 200) {
  return new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
function text(body, status = 200) {
  return new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
function json(body, status = 200) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

function pageShell(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 48rem; margin: 0 auto; padding: 2rem 1.25rem; background: Canvas; color: CanvasText; }
  a { color: LinkText; }
</style>
</head>
<body>
${body}
</body>
</html>
`;
}

/**
 * The engine's rendered catalog HTML links to static `<id>.html` product
 * pages and a placeholder `#buy` anchor, since it is also usable to build
 * a static site with no server behind it. This Worker serves offerings
 * dynamically, so it rewrites those two link shapes onto its own routes,
 * scoped per `<article id="...">` block so a catalog with more than one
 * buyable offering rewrites every card, not just the first -- the only
 * adaptation this site makes to the engine's markup.
 * @param {string} renderedHtml output of `renderCatalogHtml`
 * @returns {string}
 */
function routedHtml(renderedHtml) {
  return renderedHtml.replace(/<article class="offering" id="([a-z0-9-]+)">([\s\S]*?)<\/article>/gu, (whole, id, inner) => {
    const rewritten = inner.replaceAll(`href="${id}.html"`, `href="/goods/${id}"`).replace('href="#buy"', `href="/checkout/${id}"`);
    return `<article class="offering" id="${id}">${rewritten}</article>`;
  });
}

function catalogHtmlResponse(env) {
  const model = catalogModel(catalog, { checkoutArmed: checkoutArmed(env) });
  return html(routedHtml(renderCatalogHtml(model)));
}

function offeringHtmlResponse(env, id) {
  const model = catalogModel(catalog, { checkoutArmed: checkoutArmed(env) });
  let rendered;
  try {
    rendered = renderOfferingHtml(model, id);
  } catch {
    return html(pageShell("Not found", "<p>No such offering.</p>"), 404);
  }
  return html(rendered.replace('href="index.html"', 'href="/"').replace('href="#buy"', `href="/checkout/${esc(id)}"`));
}

function unarmedCheckoutResponse(offering) {
  return html(
    pageShell(
      "Checkout not yet armed",
      `<p><a href="/goods/${esc(offering.id)}">&larr; ${esc(offering.title)}</a></p>
<h1>Checkout not yet armed</h1>
<p>This offering is priced and ready, but the card rail is not configured on this deployment yet. No charge can be made right now.</p>`,
    ),
    409,
  );
}

function checkoutRefusalResponse(offering, reason) {
  const status = reason === "unknown-offering" ? 404 : reason === "offering-not-active-for-credential-mode" ? 409 : 502;
  return html(
    pageShell(
      "Checkout unavailable",
      `<p><a href="/goods/${esc(offering?.id ?? "")}">&larr; back</a></p>
<h1>Checkout unavailable</h1>
<p>${esc(reason)}</p>`,
    ),
    status,
  );
}

/**
 * Runs the full checkout flow -- solicit then invoke -- against
 * stripe-services-section's ActivityStreams-envelope API, and 303s to the
 * resulting Stripe Checkout URL.
 * @param {URL} url
 * @param {Record<string,string>} env
 * @param {string} offeringId
 * @returns {Promise<Response>}
 */
async function handleCheckout(url, env, offeringId) {
  const offering = catalog.offerings.find((candidate) => candidate.id === offeringId);
  if (!offering || !PAID_STATUSES.has(offering.status)) {
    return html(pageShell("Not found", "<p>No such offering.</p>"), 404);
  }
  if (!checkoutArmed(env)) return unarmedCheckoutResponse(offering);

  const customerReference = crypto.randomUUID();
  const solicitation = {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: `urn:shop-561-group:checkout:${customerReference}`,
    type: "Offer",
    actor: BUYER_ACTOR,
    target: STRIPE_ACTOR,
    object: {
      type: "ServiceSolicitation",
      request: {
        offeringId,
        quantity: 1,
        successUrl: `${url.origin}/thanks?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${url.origin}/goods/${offeringId}`,
        customerReference,
      },
    },
  };
  const offered = solicitCheckout(solicitation, { env, catalog: STRIPE_CATALOG });
  if (offered.type !== "Offer") return checkoutRefusalResponse(offering, offered.object?.reason ?? "checkout-refused");

  const accept = {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: `${solicitation.id}:accept`,
    type: "Accept",
    actor: BUYER_ACTOR,
    target: STRIPE_ACTOR,
    object: { offer: offered },
  };
  const store = createKvRecordStore(env.SHOP_ENTITLEMENTS);
  const accepted = await invokeCheckout(accept, { env, catalog: STRIPE_CATALOG, store });
  if (accepted.type !== "Accept") return checkoutRefusalResponse(offering, accepted.object?.reason ?? "checkout-refused");

  return Response.redirect(accepted.object.checkoutUrl, 303);
}

/**
 * Verifies the Stripe webhook signature and dedups the event via
 * `ingestWebhook`, then -- for a fresh, supported
 * `checkout.session.completed` -- writes the one entitlement this Worker's
 * own idempotency actually rests on: one KV row per Stripe Checkout
 * Session id.
 * @param {Request} request
 * @param {Record<string,string>} env
 * @returns {Promise<Response>}
 */
async function handleWebhook(request, env) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("stripe-signature") ?? "";
  const store = createKvRecordStore(env.SHOP_ENTITLEMENTS);
  const result = await ingestWebhook({ rawBody, signatureHeader }, { env, store });
  if (result.type === "StripeWebhookRefusal") return json({ error: result.reason }, 400);

  if (!result.duplicate && result.supported && result.eventType === "checkout.session.completed") {
    let event;
    try {
      event = JSON.parse(rawBody);
    } catch {
      event = null;
    }
    const projection = event ? projectEvent(event) : null;
    if (projection?.stripeObjectId && projection.offeringId) {
      await env.SHOP_ENTITLEMENTS.put(
        `entitlement:${projection.stripeObjectId}`,
        JSON.stringify({
          sessionId: projection.stripeObjectId,
          offeringId: projection.offeringId,
          amountTotal: projection.amountTotal,
          currency: projection.currency,
          customerSettlement: projection.customerSettlement,
          createdAt: new Date().toISOString(),
        }),
      );
    }
  }
  return json({ accepted: result.accepted, duplicate: Boolean(result.duplicate) });
}

function noEntitlementResponse() {
  return html(
    pageShell(
      "No purchase found",
      `<p><a href="/">&larr; All offerings</a></p>
<h1>No purchase found</h1>
<p>This checkout session is not on file as paid yet. If you just completed checkout, wait a moment and refresh -- otherwise no download can be issued.</p>`,
    ),
    404,
  );
}

/**
 * Confirms one paid Checkout Session and issues one signed, expiring
 * download token per good. The KV entitlement -- written only from a
 * signature-verified webhook -- is the actual gate; when a Stripe key is
 * present this also independently confirms the session against the Stripe
 * API, refusing only on a confirmed non-paid session (a network hiccup or
 * an absent key never blocks a buyer the webhook already entitled).
 * @param {URL} url
 * @param {Record<string,string>} env
 * @returns {Promise<Response>}
 */
async function handleThanks(url, env) {
  const sessionId = url.searchParams.get("session_id");
  if (!sessionId) return text("Missing session_id.", 400);
  const raw = await env.SHOP_ENTITLEMENTS.get(`entitlement:${sessionId}`);
  if (!raw) return noEntitlementResponse();
  const entitlement = JSON.parse(raw);

  const key = env.STRIPE_SECRET_KEY || env.API_KEY_STRIPE;
  if (key) {
    try {
      const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (response.ok) {
        const session = await response.json();
        if (session.payment_status !== "paid" && session.status !== "complete") return noEntitlementResponse();
      }
    } catch {
      // Stripe API unreachable: fall back to the already signature-verified KV entitlement.
    }
  }

  const offering = catalog.offerings.find((candidate) => candidate.id === entitlement.offeringId);
  if (!offering) return noEntitlementResponse();

  const secret = env.SHOP_TOKEN_SECRET;
  if (!secret) return text("Download tokens are not configured on this deployment.", 500);
  const expiresAt = Date.now() + DOWNLOAD_TTL_SECONDS * 1000;
  const links = [];
  for (const good of offering.goods ?? []) {
    const token = await issueDownloadToken({ secret, offeringId: `${offering.id}/${good.key}`, sessionId, expiresAt });
    links.push(`<li><a href="/download/${token}">${esc(good.name)}</a></li>`);
  }
  return html(
    pageShell(
      "Thank you",
      `<h1>Thank you</h1>
<p>${esc(offering.title)} -- your download links, valid for one hour:</p>
<ul>${links.join("\n")}</ul>`,
    ),
  );
}

/**
 * Streams the requested good from R2 after verifying the signed token.
 * The token's `offeringId` field carries `<offeringId>/<goodKey>` -- this
 * Worker's own composition of the two identifiers the storefront package's
 * token schema does not itself split out.
 * @param {Record<string,string>} env
 * @param {string} token
 * @returns {Promise<Response>}
 */
async function handleDownload(env, token) {
  const secret = env.SHOP_TOKEN_SECRET ?? "";
  const verification = await verifyDownloadToken({ secret, token });
  if (!verification.valid) return text("Forbidden", 403);

  const separator = verification.offeringId?.indexOf("/") ?? -1;
  if (separator < 0) return text("Forbidden", 403);
  const offeringId = verification.offeringId.slice(0, separator);
  const goodKey = verification.offeringId.slice(separator + 1);
  const offering = catalog.offerings.find((candidate) => candidate.id === offeringId);
  const good = offering?.goods?.find((candidate) => candidate.key === goodKey);
  if (!offering || !good) return text("Forbidden", 403);

  const object = await env.SHOP_GOODS.get(`goods/${offering.id}/${good.key}`);
  if (!object) return text("Not Found", 404);
  return new Response(object.body, {
    status: 200,
    headers: {
      "content-type": good.contentType,
      "content-length": String(good.byteLength),
      "content-disposition": `attachment; filename="${good.key}"`,
      "cache-control": "no-store",
    },
  });
}

/** @type {{fetch(request: Request, env: Record<string,string>): Promise<Response>}} */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    if (method === "GET" && pathname === "/") return catalogHtmlResponse(env);
    if (method === "GET" && pathname === "/catalog.json") return json(catalog);
    if (method === "GET" && pathname.startsWith("/goods/")) return offeringHtmlResponse(env, pathname.slice("/goods/".length));
    if ((method === "GET" || method === "POST") && pathname.startsWith("/checkout/")) {
      return handleCheckout(url, env, pathname.slice("/checkout/".length));
    }
    if (method === "POST" && pathname === "/webhooks/stripe") return handleWebhook(request, env);
    if (method === "GET" && pathname === "/thanks") return handleThanks(url, env);
    if (method === "GET" && pathname.startsWith("/download/")) return handleDownload(env, pathname.slice("/download/".length));

    return text("Not Found", 404);
  },
};

export { STRIPE_CATALOG, stripeCatalogFrom, checkoutArmed, routedHtml };
export const CATALOG = catalog;
export const CATALOG_VALIDATION = validateCatalog(catalog);

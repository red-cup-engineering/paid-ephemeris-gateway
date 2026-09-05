import { createHash } from "node:crypto";


import {
  EXIT_TIGHTNESS_PILOT_ACCOUNT,
  EXIT_TIGHTNESS_PILOT_BODY_SHA256,
  EXIT_TIGHTNESS_PILOT_MAX_REPORTS,
  EXIT_TIGHTNESS_PILOT_PERMLINK,
  EXIT_TIGHTNESS_PILOT_PRICE,
} from "./exitTightnessPilotPost.mjs";

export const PRODUCT_PILOT_SCHEMA = "aagaard.product-pilot-event.v1" as const;
export const PRODUCT_PILOT_CATEGORY = "aagaard.product-pilot-event" as const;


export interface ProductPilotPublicationEvent {
  readonly productPilotSchema: typeof PRODUCT_PILOT_SCHEMA;
  readonly event: "offer-published";
  readonly publicationId: string;
  readonly recordedAt: string;
  readonly account: typeof EXIT_TIGHTNESS_PILOT_ACCOUNT;
  readonly permlink: typeof EXIT_TIGHTNESS_PILOT_PERMLINK;
  readonly transactionId: string;
  readonly block: number;
  readonly bodySha256: typeof EXIT_TIGHTNESS_PILOT_BODY_SHA256;
  readonly terms: {
    readonly price: typeof EXIT_TIGHTNESS_PILOT_PRICE;
    readonly maximumPaidReports: typeof EXIT_TIGHTNESS_PILOT_MAX_REPORTS;
    readonly invoiceBeforePayment: true;
    readonly revenueRecognized: "0.000 HBD";
  };
  readonly hiveProviders: readonly string[];
}

export interface ProductPilotDistributionEvent {
  readonly productPilotSchema: typeof PRODUCT_PILOT_SCHEMA;
  readonly event: "offer-distribution";
  readonly distributionId: string;
  readonly recordedAt: string;
  readonly status: "settlement-pending" | "distributed-confirmed";
  readonly account: "michael561";
  readonly author: typeof EXIT_TIGHTNESS_PILOT_ACCOUNT;
  readonly permlink: typeof EXIT_TIGHTNESS_PILOT_PERMLINK;
  readonly transactionId: string;
  readonly block: number | null;
  readonly hiveProviders: readonly string[];
  readonly audience: {
    readonly followers: number;
    readonly observedAt: string;
    readonly currentRc: string;
    readonly requiredRc: string;
  };
  readonly revenueRecognized: "0.000 HBD";
}

export type ProductPilotEvent = ProductPilotPublicationEvent | ProductPilotDistributionEvent;

export function productPilotPublicationEvent(input: {
  readonly transactionId: string;
  readonly block: number;
  readonly hiveProviders: readonly string[];
  readonly recordedAt?: string;
}): ProductPilotPublicationEvent {
  if (!/^[0-9a-f]{40}$/.test(input.transactionId)) throw new TypeError("product pilot publication needs one canonical Hive transaction id");
  if (!Number.isSafeInteger(input.block) || input.block <= 0) throw new TypeError("product pilot publication needs one positive Hive block");
  const providers = [...new Set(input.hiveProviders)].sort();
  if (providers.length < 2 || providers.some((provider) => !/^https:\/\//.test(provider))) {
    throw new TypeError("product pilot publication needs at least two distinct HTTPS Hive providers");
  }
  const recordedAt = new Date(input.recordedAt ?? new Date().toISOString()).toISOString();
  const digest = createHash("sha256").update(JSON.stringify([
    EXIT_TIGHTNESS_PILOT_ACCOUNT,
    EXIT_TIGHTNESS_PILOT_PERMLINK,
    input.transactionId,
  ])).digest("base64url");
  return Object.freeze({
    productPilotSchema: PRODUCT_PILOT_SCHEMA,
    event: "offer-published",
    publicationId: `urn:aagaard:product-pilot-publication:${digest}`,
    recordedAt,
    account: EXIT_TIGHTNESS_PILOT_ACCOUNT,
    permlink: EXIT_TIGHTNESS_PILOT_PERMLINK,
    transactionId: input.transactionId,
    block: input.block,
    bodySha256: EXIT_TIGHTNESS_PILOT_BODY_SHA256,
    terms: Object.freeze({
      price: EXIT_TIGHTNESS_PILOT_PRICE,
      maximumPaidReports: EXIT_TIGHTNESS_PILOT_MAX_REPORTS,
      invoiceBeforePayment: true,
      revenueRecognized: "0.000 HBD",
    }),
    hiveProviders: Object.freeze(providers),
  });
}

export async function recordProductPilotPublication(
  _dataDir: string,
  input: Parameters<typeof productPilotPublicationEvent>[0],
): Promise<ProductPilotPublicationEvent> {
  const event = productPilotPublicationEvent(input);
  return event;
}

export function productPilotDistributionEvent(input: Readonly<{
  status: ProductPilotDistributionEvent["status"];
  transactionId: string;
  block?: number | null;
  hiveProviders?: readonly string[];
  followers: number;
  observedAt: string;
  currentRc: string;
  requiredRc: string;
  recordedAt?: string;
}>): ProductPilotDistributionEvent {
  if (!/^[0-9a-f]{40}$/u.test(input.transactionId)) throw new TypeError("product distribution needs one canonical Hive transaction id");
  const recordedAt = new Date(input.recordedAt ?? new Date().toISOString()).toISOString();
  const observedAt = new Date(input.observedAt).toISOString();
  if (!Number.isSafeInteger(input.followers) || input.followers < 10) throw new TypeError("product distribution needs a meaningful observed audience");
  if (!/^[1-9][0-9]*$/u.test(input.currentRc) || !/^[1-9][0-9]*$/u.test(input.requiredRc)) throw new TypeError("product distribution RC evidence is malformed");
  if (BigInt(input.currentRc) < BigInt(input.requiredRc)) throw new TypeError("product distribution RC reserve was not satisfied");
  const providers = [...new Set(input.hiveProviders ?? [])].sort();
  const block = input.block ?? null;
  if (input.status === "distributed-confirmed"
    && (!Number.isSafeInteger(block) || block === null || block <= 0 || providers.length < 2 || providers.some((provider) => !/^https:\/\//u.test(provider)))) {
    throw new TypeError("confirmed product distribution needs one block and two Hive providers");
  }
  if (input.status === "settlement-pending" && (block !== null || providers.length !== 0)) {
    throw new TypeError("pending product distribution cannot carry invented confirmation evidence");
  }
  const digest = createHash("sha256").update(JSON.stringify([input.transactionId, input.status])).digest("base64url");
  return Object.freeze({ productPilotSchema: PRODUCT_PILOT_SCHEMA, event: "offer-distribution" as const,
    distributionId: `urn:aagaard:product-pilot-distribution:${digest}`, recordedAt, status: input.status,
    account: "michael561" as const, author: EXIT_TIGHTNESS_PILOT_ACCOUNT, permlink: EXIT_TIGHTNESS_PILOT_PERMLINK,
    transactionId: input.transactionId, block, hiveProviders: Object.freeze(providers),
    audience: Object.freeze({ followers: input.followers, observedAt, currentRc: input.currentRc, requiredRc: input.requiredRc }),
    revenueRecognized: "0.000 HBD" as const });
}

export async function recordProductPilotDistribution(
  _dataDir: string,
  input: Parameters<typeof productPilotDistributionEvent>[0],
): Promise<ProductPilotDistributionEvent> {
  const event = productPilotDistributionEvent(input);
  return event;
}

export async function readProductPilotEvents(_dataDir: string): Promise<readonly ProductPilotEvent[]> {
  throw new Error("product-pilot history is chain-derived; local projections are retired");
}

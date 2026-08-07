/**
 * writing/x402 — organizing's economic standards codec for HTTP 402 payment.
 *
 * A 402 challenge is not a new economic kernel. It is a protocol projection of
 * organizing's record-state work: a resource demands value settlement, a payment
 * authorization crosses the membrane, and the receipt records a witnessed
 * value-conserving exchange in RWIL.
 *
 * Real rail verification remains downstream. This module owns only the
 * rail-neutral organizing carrier and witness law.
 */
import { createHash } from "node:crypto";

import { carrierFrom, type FromSchema } from "@emsenn/relating/typing";
import { cell, projectStateView, type LogReading, type RWILWitnessLog } from "@emsenn/relating/ledger";
import type { Action } from "@emsenn/relating/running";
import { canonical, eavtRecord, type EAVTRecord, type JsonRecord, type JsonValue } from "@emsenn/relating/writing";

const jsonResource = (value: unknown, context: string): JsonValue => {
  const resource = JSON.parse(JSON.stringify(value)) as unknown;
  if (resource === undefined) throw new TypeError(`${context}: not a JSON value`);
  return resource as JsonValue;
};

const railSchema = { enum: ["x402", "ap2", "l402"] } as const;

export const monetaryQuantitySchema = {
  $id: "organizing/economy/value/quantity",
  title: "OrganizingValueQuantity",
  description:
    "A rail-neutral HTTP channel view of exact graded value: signed exact rational plus commodity grade.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "num", "den", "commodity"],
  properties: {
    kind: { const: "organizing.economy.value.quantity" },
    num: { type: "integer" },
    den: { type: "integer", minimum: 1 },
    commodity: { type: "string", minLength: 1 },
  },
} as const;
export type MonetaryQuantity = FromSchema<typeof monetaryQuantitySchema>;
export const monetaryQuantityCarrier = carrierFrom(monetaryQuantitySchema);

export const x402ChallengeSchema = {
  $id: "organizing/economy/x402/challenge",
  title: "X402Challenge",
  description:
    "HTTP 402 Payment Required challenge as an organizing-scale value-settlement request.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "id", "resource", "payee", "amount", "rails", "issuedAt"],
  properties: {
    kind: { const: "organizing.economy.x402.challenge" },
    id: { type: "string", minLength: 1 },
    resource: { type: "string", minLength: 1 },
    payee: { type: "string", minLength: 1 },
    amount: { $ref: "organizing/economy/value/quantity" },
    rails: { type: "array", items: railSchema, minItems: 1 },
    issuedAt: { type: "string", minLength: 1 },
    memo: { type: "string" },
  },
} as const;
type X402Rail = "x402" | "ap2" | "l402";
export type X402Challenge = Omit<FromSchema<typeof x402ChallengeSchema>, "amount" | "rails"> & {
  readonly amount: MonetaryQuantity;
  readonly rails: readonly X402Rail[];
};
export const x402ChallengeCarrier = carrierFrom(x402ChallengeSchema);

export const x402PaymentSchema = {
  $id: "organizing/economy/x402/payment",
  title: "X402Payment",
  description:
    "A membrane-crossing payment authorization responding to an x402/AP2/L402 challenge.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "id", "challengeId", "resource", "payer", "payee", "amount", "rail", "authorization", "paidAt"],
  properties: {
    kind: { const: "organizing.economy.x402.payment" },
    id: { type: "string", minLength: 1 },
    challengeId: { type: "string", minLength: 1 },
    resource: { type: "string", minLength: 1 },
    payer: { type: "string", minLength: 1 },
    payee: { type: "string", minLength: 1 },
    amount: { $ref: "organizing/economy/value/quantity" },
    rail: railSchema,
    authorization: { type: "string", minLength: 1 },
    paidAt: { type: "string", minLength: 1 },
    membrane: { const: "across" },
  },
} as const;
export type X402Payment = Omit<FromSchema<typeof x402PaymentSchema>, "amount" | "rail"> & {
  readonly amount: MonetaryQuantity;
  readonly rail: X402Rail;
};
export const x402PaymentCarrier = carrierFrom(x402PaymentSchema);

export const x402ReceiptSchema = {
  $id: "organizing/economy/x402/receipt",
  title: "X402Receipt",
  description:
    "The witnessed RWIL settlement receipt for an HTTP 402 exchange; debit equals credit.",
  type: "object",
  additionalProperties: false,
  required: [
    "kind",
    "id",
    "challengeId",
    "paymentId",
    "resource",
    "payer",
    "payee",
    "debit",
    "credit",
    "rail",
    "settledAt",
    "valueConserved",
    "witnessLedger",
  ],
  properties: {
    kind: { const: "organizing.economy.x402.receipt" },
    id: { type: "string", minLength: 1 },
    challengeId: { type: "string", minLength: 1 },
    paymentId: { type: "string", minLength: 1 },
    resource: { type: "string", minLength: 1 },
    payer: { type: "string", minLength: 1 },
    payee: { type: "string", minLength: 1 },
    debit: { $ref: "organizing/economy/value/quantity" },
    credit: { $ref: "organizing/economy/value/quantity" },
    rail: railSchema,
    settledAt: { type: "string", minLength: 1 },
    valueConserved: { type: "boolean" },
    witnessLedger: { type: "array", items: { type: "object" }, minItems: 1 },
  },
} as const;
export type X402Receipt = Omit<FromSchema<typeof x402ReceiptSchema>, "debit" | "credit" | "rail" | "witnessLedger"> & {
  readonly debit: MonetaryQuantity;
  readonly credit: MonetaryQuantity;
  readonly rail: X402Rail;
  readonly witnessLedger: readonly EAVTRecord[];
};
export const x402ReceiptCarrier = carrierFrom(x402ReceiptSchema);

export interface PaymentOptions {
  readonly id?: string;
  readonly payer: string;
  readonly rail?: X402Rail;
  readonly authorization: string;
  readonly paidAt?: string;
}

export interface ReceiptOptions {
  readonly id?: string;
  readonly settledAt?: string;
}

export function quantity(num: number, den: number, commodity: string): MonetaryQuantity {
  return monetaryQuantityCarrier.assert(
    Object.freeze({
      kind: "organizing.economy.value.quantity" as const,
      num,
      den,
      commodity,
    }),
    "organizing value quantity",
  );
}

export function valueQuantityView(num: number, den: number, commodity: string): MonetaryQuantity {
  return quantity(num, den, commodity);
}

export function paymentFromChallenge(challenge: X402Challenge, options: PaymentOptions): X402Payment {
  x402ChallengeCarrier.assert(challenge, "x402 challenge");
  const rail = options.rail ?? challenge.rails[0] ?? "x402";
  if (!challenge.rails.includes(rail)) {
    throw new TypeError(`paymentFromChallenge: rail ${rail} is not accepted by challenge ${challenge.id}`);
  }
  return x402PaymentCarrier.assert(
    Object.freeze({
      kind: "organizing.economy.x402.payment" as const,
      id: options.id ?? `${challenge.id}/payment`,
      challengeId: challenge.id,
      resource: challenge.resource,
      payer: options.payer,
      payee: challenge.payee,
      amount: challenge.amount,
      rail,
      authorization: options.authorization,
      paidAt: options.paidAt ?? challenge.issuedAt,
      membrane: "across" as const,
    }),
    "x402 payment",
  ) as unknown as X402Payment;
}

function sameQuantity(left: MonetaryQuantity, right: MonetaryQuantity): boolean {
  return left.num === right.num && left.den === right.den && left.commodity === right.commodity;
}

function assertPaymentAnswersChallenge(challenge: X402Challenge, payment: X402Payment): void {
  if (payment.challengeId !== challenge.id) {
    throw new TypeError("receiptFromPayment: payment does not answer the challenge");
  }
  if (payment.resource !== challenge.resource || payment.payee !== challenge.payee) {
    throw new TypeError("receiptFromPayment: payment membrane target differs from the challenge");
  }
  if (!sameQuantity(payment.amount, challenge.amount)) {
    throw new TypeError("receiptFromPayment: payment amount differs from the challenged value");
  }
}

export function valueConserved(debit: MonetaryQuantity, credit: MonetaryQuantity): boolean {
  return debit.commodity === credit.commodity &&
    BigInt(debit.num) * BigInt(credit.den) === BigInt(credit.num) * BigInt(debit.den);
}

function receiptWitnesses(receipt: Omit<X402Receipt, "witnessLedger">): readonly EAVTRecord[] {
  const entity = ["organizing", "economy", "x402", "receipt", receipt.id] as const;
  return Object.freeze([
    cell(entity, "kind", "organizing.economy.exchange.settlement", receipt.settledAt),
    cell(entity, "challenge", receipt.challengeId, receipt.settledAt),
    cell(entity, "payment", receipt.paymentId, receipt.settledAt),
    cell(entity, "resource", receipt.resource, receipt.settledAt),
    cell(entity, "payer", receipt.payer, receipt.settledAt),
    cell(entity, "payee", receipt.payee, receipt.settledAt),
    cell(entity, "debit", receipt.debit as unknown as JsonValue, receipt.settledAt),
    cell(entity, "credit", receipt.credit as unknown as JsonValue, receipt.settledAt),
    cell(entity, "rail", receipt.rail, receipt.settledAt),
    cell(entity, "valueConserved", receipt.valueConserved, receipt.settledAt),
  ]);
}

export function receiptFromPayment(
  challenge: X402Challenge,
  payment: X402Payment,
  options: ReceiptOptions = {},
): X402Receipt {
  x402ChallengeCarrier.assert(challenge, "x402 challenge");
  x402PaymentCarrier.assert(payment, "x402 payment");
  assertPaymentAnswersChallenge(challenge, payment);

  const debit = payment.amount;
  const credit = payment.amount;
  const settledAt = options.settledAt ?? payment.paidAt;
  const base = Object.freeze({
    kind: "organizing.economy.x402.receipt" as const,
    id: options.id ?? `${payment.id}/receipt`,
    challengeId: challenge.id,
    paymentId: payment.id,
    resource: payment.resource,
    payer: payment.payer,
    payee: payment.payee,
    debit,
    credit,
    rail: payment.rail,
    settledAt,
    valueConserved: valueConserved(debit, credit),
  });
  return x402ReceiptCarrier.assert(
    Object.freeze({
      ...base,
      witnessLedger: receiptWitnesses(base) as readonly JsonRecord[],
    }),
    "x402 receipt",
  ) as unknown as X402Receipt;
}

export function receiptLedgerState(receipt: X402Receipt): ReturnType<typeof projectStateView> {
  x402ReceiptCarrier.assert(receipt, "x402 receipt");
  return projectStateView(receipt.witnessLedger as readonly EAVTRecord[], new Set(["kind", "challenge", "payment", "resource", "payer", "payee", "debit", "credit", "rail", "valueConserved"]));
}

export function isWitnessedExchange(receipt: X402Receipt): boolean {
  const state = receiptLedgerState(receipt);
  const rows = Object.values(state);
  return rows.some((row) => row.kind === "organizing.economy.exchange.settlement" && row.valueConserved === true);
}

function witnessLogId(log: RWILWitnessLog): string {
  return createHash("sha256").update(canonical(log as unknown as JsonValue), "utf8").digest("hex").slice(0, 16);
}

function firstWitnessCoordinate(log: RWILWitnessLog): string {
  const time = log[0]?.t;
  return typeof time === "string" && time.length > 0 ? time : new Date(0).toISOString();
}

function receiptIdFromEntity(entity: JsonValue): string | undefined {
  if (!Array.isArray(entity)) return undefined;
  if (entity.length !== 5) return undefined;
  const [scope, economy, protocol, kind, id] = entity;
  return scope === "organizing" && economy === "economy" && protocol === "x402" && kind === "receipt" && typeof id === "string"
    ? id
    : undefined;
}

function asString(value: JsonValue | undefined, field: string): string {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`receiptFromWitnessLog: missing ${field}`);
  return value;
}

function asBoolean(value: JsonValue | undefined, field: string): boolean {
  if (typeof value !== "boolean") throw new TypeError(`receiptFromWitnessLog: missing ${field}`);
  return value;
}

function asRail(value: JsonValue | undefined): X402Rail {
  if (value === "x402" || value === "ap2" || value === "l402") return value;
  throw new TypeError("receiptFromWitnessLog: missing rail");
}

function receiptStateFromWitnessLog(log: RWILWitnessLog): { readonly id: string; readonly view: ReturnType<typeof projectStateView>[string] } | undefined {
  if (log.length === 0) return undefined;
  const entity = log[0]!.e;
  const entityKey = canonical(entity);
  if (!log.every((row) => canonical(row.e) === entityKey)) return undefined;
  const id = receiptIdFromEntity(entity);
  if (id === undefined) return undefined;
  const state = projectStateView(log, new Set(["kind", "challenge", "payment", "resource", "payer", "payee", "debit", "credit", "rail", "valueConserved"]));
  const view = state[entityKey];
  return view === undefined ? undefined : { id, view };
}

/**
 * witnessLogFromReceipt — read an x402 receipt as its ordered RWIL witness log.
 */
export function witnessLogFromReceipt(receipt: X402Receipt): RWILWitnessLog {
  const admitted = x402ReceiptCarrier.assert(receipt, "x402 receipt witness log") as unknown as X402Receipt;
  return Object.freeze(admitted.witnessLedger.map((row) => eavtRecord(row)));
}

/**
 * receiptFromWitnessLog — reconstruct or envelope an x402 receipt around a log.
 *
 * Logs produced by `receiptFromPayment` reconstruct the settlement receipt. Any
 * other ordered RWIL log is still a valid receipt wire because x402 receipts
 * carry `witnessLedger` as the protocol evidence field.
 */
export function receiptFromWitnessLog(log: RWILWitnessLog): X402Receipt {
  const witnessLedger = Object.freeze(log.map((row) => eavtRecord(row)));
  const state = receiptStateFromWitnessLog(witnessLedger);
  if (state !== undefined) {
    const { id, view } = state;
    return x402ReceiptCarrier.assert(Object.freeze({
      kind: "organizing.economy.x402.receipt" as const,
      id,
      challengeId: asString(view.challenge, "challenge"),
      paymentId: asString(view.payment, "payment"),
      resource: asString(view.resource, "resource"),
      payer: asString(view.payer, "payer"),
      payee: asString(view.payee, "payee"),
      debit: monetaryQuantityCarrier.assert(view.debit, "receipt debit") as MonetaryQuantity,
      credit: monetaryQuantityCarrier.assert(view.credit, "receipt credit") as MonetaryQuantity,
      rail: asRail(view.rail),
      settledAt: firstWitnessCoordinate(witnessLedger),
      valueConserved: asBoolean(view.valueConserved, "valueConserved"),
      witnessLedger,
    }), "x402 receipt from witness log") as unknown as X402Receipt;
  }

  const id = `receipt-log-${witnessLogId(witnessLedger)}`;
  const amount = quantity(0, 1, "RWIL");
  return x402ReceiptCarrier.assert(Object.freeze({
    kind: "organizing.economy.x402.receipt" as const,
    id,
    challengeId: `${id}/challenge`,
    paymentId: `${id}/payment`,
    resource: "urn:rwil:shared-log",
    payer: "did:web:dev.bare-cedar-fog.emsenn.net:agents:codex",
    payee: "did:web:dev.bare-cedar-fog.emsenn.net:agents:codex",
    debit: amount,
    credit: amount,
    rail: "x402" as const,
    settledAt: firstWitnessCoordinate(witnessLedger),
    valueConserved: true,
    witnessLedger,
  }), "x402 receipt from witness log") as unknown as X402Receipt;
}

export const x402ReceiptLogReading: LogReading<X402Receipt> = Object.freeze({
  id: "trading.x402.receipt",
  toWire: receiptFromWitnessLog,
  fromWire: witnessLogFromReceipt,
});

function admitChallenge(input: JsonValue, verb: string): X402Challenge {
  return x402ChallengeCarrier.assert(input, verb) as unknown as X402Challenge;
}

function admitPayment(input: JsonValue, verb: string): X402Payment {
  return x402PaymentCarrier.assert(input, verb) as unknown as X402Payment;
}

export const x402PaymentAction: Action = Object.freeze({
  kind: "relating.action" as const,
  verb: "x402-pay",
  inputFormat: "json",
  outputFormat: "json",
  options: ["payer", "rail", "authorization", "paidAt", "id"],
  summary: "Project an HTTP 402 challenge to a membrane-crossing organizing payment view.",
  description:
    "Domain: organizing/economy/x402/challenge plus payer/authorization options. Codomain: organizing/economy/x402/payment. This models the payment crossing the across membrane; it does not integrate or verify a real payment rail.",
  domainSchema: { $ref: "organizing/economy/x402/challenge" },
  codomainSchema: { $ref: "organizing/economy/x402/payment" },
  run: (input: unknown, args: Record<string, unknown> = {}): JsonValue => {
    const payer = typeof args.payer === "string" ? args.payer : "";
    const authorization = typeof args.authorization === "string" ? args.authorization : "";
    const rail = typeof args.rail === "string" ? args.rail as X402Rail : undefined;
    const paidAt = typeof args.paidAt === "string" ? args.paidAt : undefined;
    const id = typeof args.id === "string" ? args.id : undefined;
    const options: PaymentOptions = { payer, authorization };
    if (rail !== undefined) Object.assign(options, { rail });
    if (paidAt !== undefined) Object.assign(options, { paidAt });
    if (id !== undefined) Object.assign(options, { id });
    return jsonResource(paymentFromChallenge(admitChallenge(input as JsonValue, "x402-pay"), options) as unknown as JsonValue, "x402-payment");
  },
});

export const x402ReceiptAction: Action = Object.freeze({
  kind: "relating.action" as const,
  verb: "x402-receipt",
  inputFormat: "json",
  outputFormat: "json",
  options: ["payment", "settledAt", "id"],
  summary: "Settle an HTTP 402 payment to its witnessed value-conserving receipt.",
  description:
    "Domain: organizing/economy/x402/challenge plus a payment option. Codomain: organizing/economy/x402/receipt, an RWIL witness of the exchange where debit equals credit.",
  domainSchema: { challenge: { $ref: "organizing/economy/x402/challenge" }, payment: { $ref: "organizing/economy/x402/payment" } },
  codomainSchema: { $ref: "organizing/economy/x402/receipt" },
  run: (input: unknown, args: Record<string, unknown> = {}): JsonValue => {
    const payment = admitPayment(args.payment as JsonValue, "x402-receipt payment");
    const settledAt = typeof args.settledAt === "string" ? args.settledAt : undefined;
    const id = typeof args.id === "string" ? args.id : undefined;
    const options: ReceiptOptions = {};
    if (settledAt !== undefined) Object.assign(options, { settledAt });
    if (id !== undefined) Object.assign(options, { id });
    return jsonResource(receiptFromPayment(admitChallenge(input as JsonValue, "x402-receipt challenge"), payment, options) as unknown as JsonValue, "x402-receipt");
  },
});

export const x402Actions: readonly Action[] = Object.freeze([x402PaymentAction, x402ReceiptAction]);

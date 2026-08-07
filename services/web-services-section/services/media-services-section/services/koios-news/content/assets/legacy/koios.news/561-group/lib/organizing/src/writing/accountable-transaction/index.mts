/**
 * writing/accountable-transaction — organizing's accountability codec for one
 * authorized, invoked, paid, and attested transaction witness.
 *
 * This module does not create a trading kernel. It assembles lower-faculty
 * readings into one organizing-scale record: animating authority, CapTP
 * invocation, playing/WASI execution projection, x402 settlement, and RWIL
 * provenance all cohere over the same witness.
 */
import {
  canInvoke,
  capabilityFromUcan,
  deliver,
  invoke,
  refOf,
  type Activity,
  type Capability,
  type Delivery,
  type UcanToken,
} from "@emsenn/animating";
import {
  canInvokeWasi,
  invokeWasi,
  preopen,
  type WasiHandle,
  type WasiInvocation,
} from "@emsenn/playing";
import type { ChargeValueName } from "@emsenn/relating";
import {
  cohere,
  registerReading,
  sameWitness,
  type CoherenceReport,
  type Reading,
  type RWILWitness,
} from "@emsenn/relating/ledger";
import { carrierFrom, type FromSchema } from "@emsenn/relating/typing";
import {
  canonical,
  eavtRecord,
  type Datom,
  type EAVTRecord,
  type JsonValue,
} from "@emsenn/relating/writing";
import {
  isWitnessedExchange,
  type X402Challenge,
  type X402Payment,
  type X402Receipt,
  x402ReceiptCarrier,
} from "../x402/index.mjs";

const TRANSACTION_ATTRIBUTE = "authorized-paid-attested";

const looseObject = { type: "object" } as const;

export const transactionAttestationSchema = {
  $id: "organizing/accountable-transaction/attestation",
  title: "AccountableTransactionAttestation",
  description:
    "A thin provenance record: a signed Datom over the accountable transaction witness. This is not yet in-toto/SLSA.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "subject", "signer", "signedAt", "datom", "signature"],
  properties: {
    kind: { const: "organizing.accountable.attestation" },
    subject: { type: "string", minLength: 1 },
    signer: { type: "string", minLength: 1 },
    signedAt: { type: "string", minLength: 1 },
    datom: { type: "array", minItems: 5, maxItems: 5, items: {} },
    signature: { type: "string", minLength: 1 },
  },
} as const;
export type TransactionAttestation = Omit<FromSchema<typeof transactionAttestationSchema>, "datom"> & {
  readonly datom: Datom;
};
export const transactionAttestationCarrier = carrierFrom(transactionAttestationSchema);

export const transactionWitnessSchema = {
  $id: "organizing/accountable-transaction/witness",
  title: "AccountableTransactionWitness",
  description:
    "One accountable agentic transaction: UCAN/capability authority, CapTP/WASI invocation, x402 settlement, and a thin provenance attestation over one RWIL witness.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "id", "witnessedAt", "affordances", "capability", "authorization", "invocation", "settlement"],
  properties: {
    kind: { const: "organizing.accountable.transaction.witness" },
    id: { type: "string", minLength: 1 },
    witnessedAt: { type: "string", minLength: 1 },
    affordances: { type: "array", items: { type: "string" } },
    capability: looseObject,
    authorization: {
      type: "object",
      additionalProperties: false,
      required: ["kind", "token"],
      properties: {
        kind: { enum: ["ucan", "capability"] },
        token: looseObject,
      },
    },
    invocation: {
      type: "object",
      additionalProperties: false,
      required: ["kind", "activity", "captp", "wasi"],
      properties: {
        kind: { const: "organizing.accountable.invocation" },
        activity: looseObject,
        captp: looseObject,
        wasi: looseObject,
      },
    },
    settlement: {
      type: "object",
      additionalProperties: false,
      required: ["kind", "challenge", "paymentClaimed"],
      properties: {
        kind: { const: "organizing.accountable.settlement" },
        challenge: looseObject,
        payment: looseObject,
        receipt: looseObject,
        paymentClaimed: { type: "boolean" },
      },
    },
    provenance: {
      type: "object",
      additionalProperties: false,
      required: ["kind"],
      properties: {
        kind: { const: "organizing.accountable.provenance" },
        attestation: { $ref: "organizing/accountable-transaction/attestation" },
      },
    },
  },
} as const;

export interface TransactionAuthorization {
  readonly kind: "ucan" | "capability";
  readonly token: UcanToken | Capability;
}

export interface TransactionInvocation {
  readonly kind: "organizing.accountable.invocation";
  readonly activity: Activity;
  readonly captp: Delivery;
  readonly wasi: WasiInvocation;
}

export interface TransactionSettlement {
  readonly kind: "organizing.accountable.settlement";
  readonly challenge: X402Challenge;
  readonly payment?: X402Payment;
  readonly receipt?: X402Receipt;
  readonly paymentClaimed: boolean;
}

export interface TransactionProvenance {
  readonly kind: "organizing.accountable.provenance";
  readonly attestation?: TransactionAttestation;
}

export type TransactionWitness = Omit<
  FromSchema<typeof transactionWitnessSchema>,
  "affordances" | "capability" | "authorization" | "invocation" | "settlement" | "provenance"
> & {
  readonly affordances: readonly string[];
  readonly capability: Capability;
  readonly authorization: TransactionAuthorization;
  readonly invocation: TransactionInvocation;
  readonly settlement: TransactionSettlement;
  readonly provenance?: TransactionProvenance;
};

export const transactionWitnessCarrier = carrierFrom(transactionWitnessSchema);
export const transactionWitness = transactionWitnessCarrier;

export interface TransactionWitnessOptions {
  readonly id: string;
  readonly witnessedAt: string;
  readonly affordances: readonly string[];
  readonly capability: Capability;
  readonly authorization?: TransactionAuthorization;
  readonly challenge: X402Challenge;
  readonly payment?: X402Payment;
  readonly receipt?: X402Receipt;
  readonly paymentClaimed?: boolean;
  readonly captpMethod?: string;
  readonly captpArgs?: readonly unknown[];
  readonly wasiHandle?: WasiHandle;
  readonly wasiOperation?: string;
  readonly attestBy?: string;
}

export interface AccountabilityLegs {
  readonly authorized: ChargeValueName;
  readonly paid: ChargeValueName;
  readonly attested: ChargeValueName;
}

export interface AccountabilityReport {
  readonly kind: "organizing.accountable.query";
  readonly query: "authorized and paid and attested";
  readonly witness: EAVTRecord;
  readonly authorized: boolean;
  readonly paid: boolean;
  readonly attested: boolean;
  readonly accountable: boolean;
  readonly legs: AccountabilityLegs;
  readonly disputed: readonly string[];
  readonly coherence: readonly CoherenceReport[];
}

export interface CapabilityInvokeWire {
  readonly kind: "organizing.accountable.capability-invoke";
  readonly witness: TransactionWitness;
  readonly activity: Activity;
  readonly captp: Delivery;
  readonly wasi: WasiInvocation;
}

export interface X402ReceiptWire {
  readonly kind: "organizing.accountable.x402-receipt";
  readonly witness: TransactionWitness;
  readonly receipt: X402Receipt;
}

export interface AttestationWire {
  readonly kind: "organizing.accountable.attestation";
  readonly witness: TransactionWitness;
  readonly attestation: TransactionAttestation;
}

function jsonValue(value: unknown, context: string): JsonValue {
  const cloned = JSON.parse(JSON.stringify(value)) as unknown;
  if (cloned === undefined) throw new TypeError(`${context}: not a JSON value`);
  return cloned as JsonValue;
}

function transactionEntity(id: string): readonly JsonValue[] {
  return Object.freeze(["organizing", "accountable-transaction", id] as const);
}

export function rwilWitnessOf(transaction: TransactionWitness): RWILWitness {
  transactionWitnessCarrier.assert(transaction, "accountable transaction witness");
  return eavtRecord({
    e: transactionEntity(transaction.id),
    a: TRANSACTION_ATTRIBUTE,
    v: jsonValue(transaction, "accountable transaction witness value"),
    t: transaction.witnessedAt,
  });
}

export function transactionFromWitness(row: RWILWitness): TransactionWitness {
  const witness = eavtRecord(row);
  if (witness.a !== TRANSACTION_ATTRIBUTE) {
    throw new TypeError(`transactionFromWitness: unsupported attribute ${JSON.stringify(witness.a)}`);
  }
  return transactionWitnessCarrier.assert(witness.v, "accountable transaction witness value") as TransactionWitness;
}

function structuralSignature(signer: string, datom: Datom): string {
  return `structural-signature(${signer}:${canonical(datom as unknown as JsonValue)})`;
}

export function attestTransaction(row: RWILWitness, signer: string, signedAt: string): TransactionAttestation {
  const witness = eavtRecord(row);
  const transaction = transactionFromWitness(witness);
  const datom: Datom = [
    witness.e,
    "provenance.attested",
    true,
    signedAt,
    {
      kind: "organizing.accountable.attestation.reading",
      witnessAttribute: witness.a,
      witnessTime: witness.t,
    },
  ];
  return transactionAttestationCarrier.assert({
    kind: "organizing.accountable.attestation" as const,
    subject: transaction.id,
    signer,
    signedAt,
    datom,
    signature: structuralSignature(signer, datom),
  }, "accountable transaction attestation") as TransactionAttestation;
}

function authorizationOf(capability: Capability, authorization?: TransactionAuthorization): TransactionAuthorization {
  return authorization ?? { kind: "capability" as const, token: capability };
}

function invocationOf(options: TransactionWitnessOptions): TransactionInvocation {
  const ref = refOf(options.capability);
  const wasiHandle = options.wasiHandle ?? preopen(
    {
      id: options.capability.id,
      grants: options.capability.grants,
      holder: options.capability.holder,
      ...(options.capability.parent === undefined ? {} : { parent: options.capability.parent }),
    },
    { path: options.capability.grants },
  );
  return {
    kind: "organizing.accountable.invocation" as const,
    activity: invoke(options.capability),
    captp: deliver(ref, options.captpMethod ?? "invoke", options.captpArgs ?? [], `${options.id}:answer`),
    wasi: invokeWasi(wasiHandle, options.wasiOperation ?? "call"),
  };
}

export function makeTransactionWitness(options: TransactionWitnessOptions): TransactionWitness {
  const base = transactionWitnessCarrier.assert({
    kind: "organizing.accountable.transaction.witness" as const,
    id: options.id,
    witnessedAt: options.witnessedAt,
    affordances: [...options.affordances],
    capability: options.capability,
    authorization: authorizationOf(options.capability, options.authorization),
    invocation: invocationOf(options),
    settlement: {
      kind: "organizing.accountable.settlement" as const,
      challenge: options.challenge,
      ...(options.payment === undefined ? {} : { payment: options.payment }),
      ...(options.receipt === undefined ? {} : { receipt: options.receipt }),
      paymentClaimed: options.paymentClaimed ?? options.payment !== undefined,
    },
  }, "accountable transaction witness") as TransactionWitness;

  if (options.attestBy === undefined) return base;
  const attestation = attestTransaction(rwilWitnessOf(base), options.attestBy, options.witnessedAt);
  return transactionWitnessCarrier.assert({
    ...base,
    provenance: {
      kind: "organizing.accountable.provenance" as const,
      attestation,
    },
  }, "attested accountable transaction witness") as TransactionWitness;
}

function authorityCapability(transaction: TransactionWitness): Capability {
  if (transaction.authorization.kind === "ucan") {
    return capabilityFromUcan(transaction.authorization.token as UcanToken);
  }
  return transaction.authorization.token as Capability;
}

function sameCapability(left: Capability, right: Capability): boolean {
  return left.id === right.id && left.grants === right.grants && left.holder === right.holder;
}

function authorityStanding(transaction: TransactionWitness): { readonly ok: boolean; readonly charge: ChargeValueName } {
  const carried = authorityCapability(transaction);
  const same = sameCapability(carried, transaction.capability);
  const activityOk = canInvoke(transaction.affordances, transaction.capability);
  const wasiOk = canInvokeWasi(transaction.affordances, {
    id: transaction.capability.id,
    grants: transaction.capability.grants,
    holder: transaction.capability.holder,
    ...(transaction.capability.parent === undefined ? {} : { parent: transaction.capability.parent }),
  });
  const ok = same && activityOk && wasiOk;
  return { ok, charge: ok ? "potential" : "active" };
}

function paymentStanding(transaction: TransactionWitness): {
  readonly ok: boolean;
  readonly charge: ChargeValueName;
  readonly disputed?: string;
} {
  const receipt = transaction.settlement.receipt;
  if (receipt !== undefined) {
    x402ReceiptCarrier.assert(receipt, "accountable transaction x402 receipt");
    const ok = isWitnessedExchange(receipt);
    return ok
      ? { ok: true, charge: "potential" }
      : { ok: false, charge: "stable", disputed: "x402 receipt is present but its settlement is not witnessed" };
  }
  if (transaction.settlement.paymentClaimed || transaction.settlement.payment !== undefined) {
    return { ok: false, charge: "stable", disputed: "payment is claimed but no witnessed x402 receipt is present" };
  }
  return { ok: false, charge: "active" };
}

function attestationStanding(transaction: TransactionWitness): { readonly ok: boolean; readonly charge: ChargeValueName } {
  const attestation = transaction.provenance?.attestation;
  if (attestation === undefined) return { ok: false, charge: "active" };
  transactionAttestationCarrier.assert(attestation, "accountable transaction attestation");
  return { ok: attestation.subject === transaction.id, charge: attestation.subject === transaction.id ? "potential" : "active" };
}

export const capabilityInvokeReading: Reading<CapabilityInvokeWire> = registerReading(Object.freeze({
  id: "organizing.accountable.capability-invoke",
  toWire: (row: RWILWitness) => {
    const witness = transactionFromWitness(row);
    return {
      kind: "organizing.accountable.capability-invoke" as const,
      witness,
      activity: witness.invocation.activity,
      captp: witness.invocation.captp,
      wasi: witness.invocation.wasi,
    };
  },
  fromWire: (wire: CapabilityInvokeWire) => rwilWitnessOf(wire.witness),
}));

export const x402ReceiptReading: Reading<X402ReceiptWire> = registerReading(Object.freeze({
  id: "organizing.accountable.x402-receipt",
  toWire: (row: RWILWitness) => {
    const witness = transactionFromWitness(row);
    const receipt = witness.settlement.receipt;
    if (receipt === undefined) throw new TypeError("x402ReceiptReading: transaction has no receipt");
    return {
      kind: "organizing.accountable.x402-receipt" as const,
      witness,
      receipt,
    };
  },
  fromWire: (wire: X402ReceiptWire) => rwilWitnessOf(wire.witness),
}));

export const attestationReading: Reading<AttestationWire> = registerReading(Object.freeze({
  id: "organizing.accountable.attestation",
  toWire: (row: RWILWitness) => {
    const witness = transactionFromWitness(row);
    const attestation = witness.provenance?.attestation;
    if (attestation === undefined) throw new TypeError("attestationReading: transaction has no attestation");
    return {
      kind: "organizing.accountable.attestation" as const,
      witness,
      attestation,
    };
  },
  fromWire: (wire: AttestationWire) => rwilWitnessOf(wire.witness),
}));

export const accountableReadings = Object.freeze([
  capabilityInvokeReading,
  x402ReceiptReading,
  attestationReading,
] as const);

export function cohereAccountable(transaction: TransactionWitness): readonly CoherenceReport[] {
  const row = rwilWitnessOf(transaction);
  return Object.freeze([
    cohere(capabilityInvokeReading, x402ReceiptReading, row),
    cohere(capabilityInvokeReading, attestationReading, row),
    cohere(x402ReceiptReading, attestationReading, row),
  ]);
}

export function isAccountable(transaction: TransactionWitness): AccountabilityReport {
  const witness = transactionWitnessCarrier.assert(transaction, "accountable transaction witness") as TransactionWitness;
  const row = rwilWitnessOf(witness);
  const authority = authorityStanding(witness);
  const payment = paymentStanding(witness);
  const attestation = attestationStanding(witness);
  const coherence = payment.ok && attestation.ok ? cohereAccountable(witness) : [];
  const coherent = coherence.length === 0 ? payment.ok && attestation.ok : coherence.every((report) => report.ok);
  const accountable = authority.ok && payment.ok && attestation.ok && coherent;
  return Object.freeze({
    kind: "organizing.accountable.query" as const,
    query: "authorized and paid and attested" as const,
    witness: row,
    authorized: authority.ok,
    paid: payment.ok,
    attested: attestation.ok,
    accountable,
    legs: {
      authorized: authority.charge,
      paid: payment.charge,
      attested: attestation.charge,
    },
    disputed: Object.freeze([payment.disputed].filter((entry): entry is string => entry !== undefined)),
    coherence,
  });
}

export function sameAccountableWitness(left: TransactionWitness, right: TransactionWitness): boolean {
  return sameWitness(rwilWitnessOf(left), rwilWitnessOf(right));
}

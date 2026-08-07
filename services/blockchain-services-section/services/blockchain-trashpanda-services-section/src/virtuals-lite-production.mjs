import { createHash, randomBytes } from "node:crypto";
import {
  closeSync,
  constants,
  existsSync,
  fsyncSync,
  linkSync,
  mkdirSync,
  openSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { io as defaultIo } from "socket.io-client";
import { evaluateBasePreSignPolicy } from "./policy-conformance.mjs";
import { BASE_CHAIN_ID, PILOT_OFFERING_NAME, RECOVERY_WALLET } from "./virtuals-commercial-pilot-guard.mjs";
import {
  createVirtualsLiteApiClient,
  VIRTUALS_LITE_SOCKET_ORIGIN,
  YANAGI_OPERATOR_WALLET,
} from "./virtuals-lite-commercial-pilot.mjs";

export const VIRTUALS_PRODUCTION_PRICE = "0.05";
export const VIRTUALS_PRODUCTION_USDC_BASE_UNITS = 50_000n;
export const VIRTUALS_PRODUCTION_OFFERING = Object.freeze({
  name: PILOT_OFFERING_NAME,
  description: "Yanagi's Blockchain Trashpanda deterministically evaluates one unsigned Base transaction against the buyer's declared policy and immutable block anchor. Returns a replayable clause-by-clause PASS, FAIL, or ESCALATE receipt. Never accepts keys, signatures, custody, signing, or broadcast authority.",
  priceV2: Object.freeze({ type: "fixed", value: 0.05 }),
  slaMinutes: 5,
  requiredFunds: false,
  requirement: Object.freeze({
    type: "object",
    additionalProperties: false,
    properties: Object.freeze({
      request: Object.freeze({
        type: "object",
        description: "One exact BasePreSignConformanceRequest v1; stricter canonical shape, authority-refusal, and resource limits apply.",
      }),
    }),
    required: Object.freeze(["request"]),
  }),
  deliverable: "BasePreSignPolicyConformanceReceipt v1 JSON",
});

const MODULE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_TERMINAL_PATH = join(MODULE_ROOT, "data", "evidence", "virtuals-pilot-terminal.json");
const DEFAULT_MANDATE_PATH = join(MODULE_ROOT, "data", "authorizations", "2026-07-22-post-pilot-market-services-mandate.json");
const DEFAULT_PRICING_PATH = join(MODULE_ROOT, "data", "evidence", "2026-07-22-virtuals-market-pricing.json");
const DECIMAL_ID = /^(?:0|[1-9][0-9]*)$/u;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/u;
const TERMINAL_PHASES = new Set([4, 5, 6]);

function normalizeAddress(value, label) {
  if (typeof value !== "string" || !ADDRESS.test(value)) throw new TypeError(`${label} must be an EVM address`);
  return value.toLowerCase();
}

function normalizeJobId(value) {
  const text = String(value);
  if (!DECIMAL_ID.test(text)) throw new TypeError("Virtuals production job ID must be a nonnegative decimal integer");
  return text;
}

function readObject(path, label) {
  let value;
  try { value = JSON.parse(readFileSync(path, "utf8")); }
  catch { throw new TypeError(`${label} must be present and valid JSON`); }
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
  return value;
}

function syncDirectory(path) {
  const descriptor = openSync(path, constants.O_RDONLY | (constants.O_DIRECTORY ?? 0));
  try { fsyncSync(descriptor); } finally { closeSync(descriptor); }
}

function privateDirectory(path) {
  if (!existsSync(path)) mkdirSync(path, { recursive: true, mode: 0o700 });
  const stat = statSync(path);
  if (!stat.isDirectory() || (stat.mode & 0o077) !== 0) throw new TypeError("Virtuals production state directories must be private");
  return path;
}

function writeCreateOnly(path, value) {
  const temporary = join(dirname(path), `.${process.pid}.${randomBytes(12).toString("hex")}.tmp`);
  let descriptor;
  try {
    descriptor = openSync(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
    writeFileSync(descriptor, `${JSON.stringify(value)}\n`);
    fsyncSync(descriptor);
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
  try {
    linkSync(temporary, path);
    syncDirectory(dirname(path));
    return true;
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    return false;
  } finally {
    unlinkSync(temporary);
  }
}

export function requireVirtualsProductionGate({
  terminalPath = DEFAULT_TERMINAL_PATH,
  mandatePath = DEFAULT_MANDATE_PATH,
  pricingPath = DEFAULT_PRICING_PATH,
} = {}) {
  const terminal = readObject(terminalPath, "Virtuals pilot terminal evidence");
  const mandate = readObject(mandatePath, "post-pilot market-services mandate");
  const pricing = readObject(pricingPath, "Virtuals current-market pricing evidence");
  if (terminal.type !== "BlockchainTrashpandaVirtualsPilotTerminalEvidence"
      || !["completed", "rejected", "expired"].includes(terminal.outcome)
      || terminal.jobCount > 1
      || terminal.serviceOnly !== true
      || terminal.recoveryWalletUsed !== false
      || terminal.priceUsdc !== "0.01") {
    throw new TypeError("Virtuals production refuses absent or nonconforming pilot terminal evidence");
  }
  if (mandate.type !== "BlockchainTrashpandaPostPilotMarketServicesMandate"
      || !mandate.authorizedAfterGate?.includes("publish real Virtuals service offerings whose performing enterprise has contracted with Yanagi")) {
    throw new TypeError("Virtuals production mandate does not authorize publication");
  }
  if (pricing.type !== "BlockchainTrashpandaVirtualsCurrentMarketPricingEvidence"
      || pricing.admittedGrossPriceUsdc !== VIRTUALS_PRODUCTION_PRICE
      || pricing.pilotDemandExcluded !== true) {
    throw new TypeError("Virtuals production price lacks current-market admission");
  }
  return Object.freeze({ terminal, mandate, pricing });
}

function negotiation(data) {
  if (!Array.isArray(data?.memos)) throw new TypeError("Virtuals production job memos must be an array");
  const memo = data.memos.find((candidate) => candidate?.nextPhase === 1);
  if (!memo || typeof memo.content !== "string") throw new TypeError("Virtuals production job has no negotiation memo");
  let value;
  try { value = JSON.parse(memo.content); }
  catch { throw new TypeError("Virtuals production negotiation memo must be valid JSON"); }
  if (value?.name !== PILOT_OFFERING_NAME || (value.priceType !== undefined && value.priceType !== "fixed")
      || value.requirement === null || typeof value.requirement !== "object" || Array.isArray(value.requirement)) {
    throw new TypeError("Virtuals production negotiation does not match the admitted offering");
  }
  return value.requirement.request;
}

function envelope(data, operatorWallet) {
  const id = normalizeJobId(data?.id);
  if (data.price !== 0.05 && data.price !== VIRTUALS_PRODUCTION_PRICE) throw new TypeError("Virtuals production price must be exactly 0.05 USDC");
  if (normalizeAddress(data.providerAddress, "Virtuals production provider") !== operatorWallet) {
    throw new TypeError("Virtuals production provider is not Yanagi's separate operator wallet");
  }
  if (data.requiredFunds === true || data.payableDetail !== undefined) throw new TypeError("Virtuals production refuses buyer-fund transfer or custody");
  return id;
}

export function createVirtualsProductionGuard({
  stateRoot,
  operatorWalletAddress = YANAGI_OPERATOR_WALLET,
  recoveryWalletAddress = RECOVERY_WALLET,
  now = () => new Date().toISOString(),
}) {
  const operatorWallet = normalizeAddress(operatorWalletAddress, "Virtuals production operator");
  if (operatorWallet === normalizeAddress(recoveryWalletAddress, "Yanagi recovery wallet")) {
    throw new TypeError("Virtuals production operator must differ from the recovery wallet");
  }
  const root = privateDirectory(resolve(stateRoot));
  const jobsRoot = privateDirectory(join(root, "jobs"));
  const publicationPath = join(root, "offering-publication-attempt.json");

  function jobDirectory(jobId) {
    return privateDirectory(join(jobsRoot, normalizeJobId(jobId)));
  }

  function claim(jobId, request) {
    const id = normalizeJobId(jobId);
    const requestSha256 = createHash("sha256").update(JSON.stringify(request)).digest("hex");
    const path = join(jobDirectory(id), "claim.json");
    const value = { type: "BlockchainTrashpandaVirtualsProductionJobClaim", jobId: id, operatorWallet, priceUsdc: VIRTUALS_PRODUCTION_PRICE, serviceOnly: true, requestSha256, admittedAt: now() };
    if (!writeCreateOnly(path, value)) {
      const existing = readObject(path, "Virtuals production job claim");
      if (existing.jobId !== id || existing.operatorWallet !== operatorWallet || existing.requestSha256 !== requestSha256) {
        throw new TypeError("Virtuals production job identifier is already bound to different work");
      }
      return Object.freeze(existing);
    }
    return Object.freeze(value);
  }

  function requireClaim(jobId) {
    return readObject(join(jobDirectory(jobId), "claim.json"), "Virtuals production job claim");
  }

  function effect(jobId, name, payload) {
    const claimValue = requireClaim(jobId);
    const allowed = new Set(["accept", "request-payment", "deliver", "terminal"]);
    if (!allowed.has(name)) throw new TypeError(`Virtuals production refuses effect ${name}`);
    if (name === "request-payment" && (Object.hasOwn(payload, "payableDetail") || Object.keys(payload).some((key) => key !== "content"))) {
      throw new TypeError("Virtuals production payment request must not contain fund-transfer detail");
    }
    if (name === "deliver" && (Object.hasOwn(payload, "payableDetail") || Object.keys(payload).some((key) => key !== "deliverable"))) {
      throw new TypeError("Virtuals production delivery must contain only the service receipt");
    }
    const value = {
      type: "BlockchainTrashpandaVirtualsProductionEffectAttempt",
      jobId: claimValue.jobId,
      effect: name,
      payloadSha256: createHash("sha256").update(JSON.stringify(payload)).digest("hex"),
      attemptedAt: now(),
      retry: false,
    };
    if (!writeCreateOnly(join(jobDirectory(jobId), `${name}.json`), value)) throw new TypeError(`Virtuals production ${name} attempt is already exhausted`);
    return Object.freeze(value);
  }

  function admitPublication() {
    const value = {
      type: "BlockchainTrashpandaVirtualsProductionOfferingPublicationAttempt",
      operatorWallet,
      offering: PILOT_OFFERING_NAME,
      priceUsdc: VIRTUALS_PRODUCTION_PRICE,
      requiredFunds: false,
      attemptedAt: now(),
      retry: false,
    };
    if (!writeCreateOnly(publicationPath, value)) throw new TypeError("Virtuals production offering publication attempt is already exhausted");
    return Object.freeze(value);
  }

  return Object.freeze({ operatorWallet, root, publicationPath, admitPublication, claim, requireClaim, effect });
}

function profile(value) { return value?.data?.data ?? value?.data ?? value; }

export async function ensureVirtualsProductionOffering({ client, guard, gateOptions }) {
  const gate = requireVirtualsProductionGate(gateOptions);
  const current = profile(await client.me());
  if (current?.name !== "Yanagi" || normalizeAddress(current.walletAddress, "Virtuals profile wallet") !== guard.operatorWallet) {
    throw new TypeError("Virtuals credential is not bound to Yanagi's admitted operator identity");
  }
  const existing = (Array.isArray(current.jobs) ? current.jobs : []).find((candidate) => candidate?.name === PILOT_OFFERING_NAME);
  if (existing) {
    if (existing.priceV2?.type !== "fixed" || existing.priceV2?.value !== 0.05 || existing.requiredFunds !== false) {
      throw new TypeError("the pilot or another incompatible offering still occupies the production offering name");
    }
    return Object.freeze({ disposition: "already-published", gate });
  }
  guard.admitPublication();
  await client.publishOffering(VIRTUALS_PRODUCTION_OFFERING);
  return Object.freeze({ disposition: "published", gate });
}

export function createVirtualsProductionJobHandler({ client, guard, onEvent = async () => {} }) {
  return async function handle(data) {
    let id = null;
    try {
      id = envelope(data, guard.operatorWallet);
      const request = negotiation(data);
      if (data.phase === 0) {
        if (data.memoToSign === undefined) return Object.freeze({ disposition: "ignored", jobId: id });
        evaluateBasePreSignPolicy(request);
        guard.claim(id, request);
        const acceptance = { accept: true, reason: "Exact service-only pre-sign policy-conformance job admitted" };
        guard.effect(id, "accept", acceptance);
        await client.accept(id, acceptance);
        const payment = { content: "0.05 USDC fixed service fee; no additional funds, custody, token gate, signing, or broadcast authority." };
        guard.effect(id, "request-payment", payment);
        await client.requestPayment(id, payment);
        await onEvent({ type: "production-job-admitted", jobId: id });
        return Object.freeze({ disposition: "payment-requested", jobId: id });
      }
      if (data.phase === 2) {
        guard.requireClaim(id);
        const receipt = evaluateBasePreSignPolicy(request);
        const delivery = { deliverable: JSON.stringify(receipt) };
        guard.effect(id, "deliver", delivery);
        await client.deliver(id, delivery);
        await onEvent({ type: "production-job-delivered", jobId: id, receiptId: receipt.id });
        return Object.freeze({ disposition: "delivered", jobId: id, receiptId: receipt.id });
      }
      if (TERMINAL_PHASES.has(data.phase)) {
        guard.requireClaim(id);
        guard.effect(id, "terminal", { phase: data.phase });
        await onEvent({ type: "production-job-terminal", jobId: id, phase: data.phase });
        return Object.freeze({ disposition: "terminal", jobId: id, phase: data.phase });
      }
      return Object.freeze({ disposition: "ignored", jobId: id });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      await onEvent({ type: "production-job-refusal", jobId: id, reason });
      return Object.freeze({ disposition: "refused", jobId: id, reason });
    }
  };
}

export async function startVirtualsLiteProduction({
  apiKey,
  stateRoot,
  gateOptions,
  operatorWalletAddress = YANAGI_OPERATOR_WALLET,
  fetchImpl = fetch,
  ioFactory = defaultIo,
  socketOrigin = VIRTUALS_LITE_SOCKET_ORIGIN,
  onEvent = async () => {},
}) {
  if (socketOrigin !== VIRTUALS_LITE_SOCKET_ORIGIN) throw new TypeError("Virtuals production refuses a non-official socket origin");
  const guard = createVirtualsProductionGuard({ stateRoot, operatorWalletAddress });
  const client = createVirtualsLiteApiClient({ apiKey, fetchImpl });
  const publication = await ensureVirtualsProductionOffering({ client, guard, gateOptions });
  const handle = createVirtualsProductionJobHandler({ client, guard, onEvent });
  const socket = ioFactory(socketOrigin, { auth: { walletAddress: guard.operatorWallet }, transports: ["websocket"] });
  socket.on("roomJoined", (_data, acknowledge) => { if (typeof acknowledge === "function") acknowledge(true); });
  for (const event of ["onNewTask", "onEvaluate"]) socket.on(event, (data, acknowledge) => {
    if (typeof acknowledge === "function") acknowledge(true);
    void handle(data);
  });
  socket.on("connect_error", (error) => { void onEvent({ type: "socket-error", reason: error.message }); });
  return Object.freeze({ guard, client, publication, handle, stop: () => socket.disconnect() });
}

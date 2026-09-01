#!/usr/bin/env node
import { closeSync, constants, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { recordSettlementRecord } from "./settlement-witness.mjs";
import { semanticDigest } from "./policy-conformance.mjs";
import { createYanagiX402Service, X402_NETWORK, X402_PAY_TO, X402_PRICE, X402_ROUTE, X402_SAMPLE_REQUEST } from "./x402-service.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ACTOR = "urn:ame:blockchain-trashpanda";
const WITNESS_JOURNAL_AGENT = "http://127.0.0.1:19764/.well-known/agent-card.json";
const identify = (body) => ({ id: semanticDigest("blockchain-trashpanda.channel-readiness-admission", body), ...body });
const facilitator = {
  async getSupported() { return { kinds: [{ x402Version: 2, scheme: "exact", network: X402_NETWORK }], extensions: [], signers: {} }; },
  async verify() { throw new Error("channel-readiness proof does not accept payment"); },
  async settle() { throw new Error("channel-readiness proof does not settle"); },
};

function syncDirectory(path) {
  const descriptor = openSync(path, constants.O_RDONLY | (constants.O_DIRECTORY ?? 0));
  try { fsyncSync(descriptor); } finally { closeSync(descriptor); }
}
function project(value) {
  const root = join(ROOT, "data", "evidence");
  if (!existsSync(root)) { mkdirSync(root, { recursive: true, mode: 0o700 }); syncDirectory(join(ROOT, "data")); }
  const target = join(root, "channel-readiness.json"), bytes = Buffer.from(`${JSON.stringify(value)}\n`);
  if (existsSync(target)) { if (!readFileSync(target).equals(bytes)) throw new TypeError("channel readiness projection conflicts"); return target; }
  const temporary = join(root, `.channel-readiness.${process.pid}.tmp`), descriptor = openSync(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
  try { writeFileSync(descriptor, bytes); fsyncSync(descriptor); } finally { closeSync(descriptor); }
  renameSync(temporary, target); syncDirectory(root); return target;
}

async function proveX402Challenge() {
  const service = createYanagiX402Service({ facilitatorClient: facilitator, afterSettle: async () => { throw new Error("unpaid proof cannot witness settlement"); } });
  const server = service.app.listen(0, "127.0.0.1");
  await new Promise((accept) => server.once("listening", accept));
  await new Promise((accept) => setTimeout(accept, 25));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${X402_ROUTE}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(X402_SAMPLE_REQUEST) });
    const header = response.headers.get("payment-required");
    const required = JSON.parse(Buffer.from(header, "base64").toString("utf8"));
    if (response.status !== 402 || required.x402Version !== 2 || required.accepts?.length !== 1
        || required.accepts[0].network !== X402_NETWORK || required.accepts[0].payTo.toLowerCase() !== X402_PAY_TO.toLowerCase()) {
      throw new TypeError("official x402 challenge proof did not hold");
    }
    return identify({ type: "BlockchainTrashpandaX402UnpaidSellerChallengeProof", network: X402_NETWORK, route: `POST ${X402_ROUTE}`,
      price: X402_PRICE, payTo: X402_PAY_TO, httpStatus: 402, x402Version: 2, challenge: required,
      authority: { credentials: false, paymentAttempted: false, signingAttempted: false, settlementAttempted: false, protectedProductServed: false } });
  } finally { await new Promise((accept) => server.close(accept)); }
}

export async function admitChannelReadiness() {
  const x402 = await proveX402Challenge();
  const virtuals = identify({ type: "BlockchainTrashpandaVirtualsSandboxRefusal", environment: "sandbox", serviceOnly: true,
    offering: "content/offers/virtuals-acp-pre-sign-conformance.json", disposition: "refused-by-formation-authority",
    reason: "Virtuals sandbox requires a whitelisted private key and recommends Base mainnet real-USDC jobs, while this allocation forbids credentials, mainnet effects, real USDC, and external cash.",
    credentialsUsed: false, mainnetEffects: false, realUsdc: false, externalCash: false });
  const evidence = identify({ type: "BlockchainTrashpandaChannelReadinessEvidence", status: "lawful-partial",
    x402: { status: "succeeded", proofKind: "unpaid-seller-challenge", network: X402_NETWORK, proofCount: 1, receipt: x402.id },
    virtuals: { status: "refused", environment: "sandbox", proofCount: 0, serviceOnly: true, receipt: virtuals.id },
    externalCash: false, mainnetEffects: false, realUsdc: false, credentialsUsed: false });
  const recordedAt = new Date().toISOString();
  const admission = identify({ type: "BlockchainTrashpandaChannelReadinessAdmission", enterprise: ACTOR, evidence, x402, virtuals,
    disposition: "admit-x402-challenge-and-virtuals-authority-refusal", recordedAt });
  await recordSettlementRecord({ agentUrl: WITNESS_JOURNAL_AGENT, settlement: ACTOR, actor: ACTOR,
    category: "blockchain-trashpanda.channel-readiness-admissions", recordedAt, record: admission });
  return Object.freeze({ admission, evidence, x402, virtuals, projection: project(evidence) });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const value = await admitChannelReadiness();
  process.stdout.write(`${JSON.stringify({ admission: value.admission.id, evidence: value.evidence.id, x402: value.x402.id, virtuals: value.virtuals.id, projection: value.projection })}\n`);
}

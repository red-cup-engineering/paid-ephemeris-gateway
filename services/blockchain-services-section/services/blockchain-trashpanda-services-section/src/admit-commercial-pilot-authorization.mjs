#!/usr/bin/env node
import { closeSync, constants, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { recordSettlementRecord } from "./settlement-witness.mjs";
import { semanticDigest } from "./policy-conformance.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ACTOR = "urn:ame:blockchain-trashpanda";
const identify = (body) => ({ id: semanticDigest("blockchain-trashpanda.commercial-pilot-authorization", body), ...body });
function syncDirectory(path) { const fd = openSync(path, constants.O_RDONLY | (constants.O_DIRECTORY ?? 0)); try { fsyncSync(fd); } finally { closeSync(fd); } }
function project(value) {
  const root = join(ROOT, "data", "authorizations"); if (!existsSync(root)) { mkdirSync(root, { recursive: true, mode: 0o700 }); syncDirectory(join(ROOT, "data")); }
  const target = join(root, "one-job-virtuals-commercial-pilot.json"), bytes = Buffer.from(`${JSON.stringify(value)}\n`);
  if (existsSync(target)) { if (!readFileSync(target).equals(bytes)) throw new TypeError("commercial pilot authorization conflicts"); return target; }
  const temporary = join(root, `.commercial-pilot.${process.pid}.tmp`), fd = openSync(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
  try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); } renameSync(temporary, target); syncDirectory(root); return target;
}
export async function admitCommercialPilotAuthorization() {
  const authorization = identify({
    type: "BlockchainTrashpandaCommercialPilotAuthorization",
    authorizedBy: "union-leader",
    authorizedOn: "2026-07-22",
    enterprise: ACTOR,
    platform: "Virtuals ACP",
    network: "eip155:8453",
    jobLimit: 1,
    jobType: "service-only",
    exactPrice: { amount: "0.01", currency: "USDC" },
    operatorWallet: { separation: "new-and-separate", recoveryWalletForbidden: true },
    permittedEffects: ["create-or-contract-one-separate-Virtuals-operator-wallet", "configure-one-service-only-offering", "perform-at-most-one-job", "receive-the-exact-service-fee-under-platform-settlement"],
    forbiddenEffects: ["buyer-fund-custody", "fund-transfer-job", "YANAGI-payment-gate", "broader-launch", "recovery-wallet-runtime-use", "more-than-one-job", "price-other-than-0.01-USDC"],
    sourceText: "Approve one Yanagi commercial pilot using a new, separate Virtuals operator wallet—not the recovery wallet—for at most one Base-mainnet service-only job priced at 0.01 USDC, with no buyer-fund custody, no YANAGI gate, and no broader launch."
  });
  const recordedAt = new Date().toISOString(), admission = identify({ type: "BlockchainTrashpandaCommercialPilotAuthorizationAdmission", enterprise: ACTOR,
    authorization, disposition: "admit-exact-one-job-commercial-pilot", recordedAt });
  await recordSettlementRecord({ agentUrl: "http://127.0.0.1:19764/.well-known/agent-card.json", settlement: ACTOR,
    actor: ACTOR, category: "blockchain-trashpanda.commercial-pilot-authorizations", recordedAt, record: admission });
  return { admission, authorization, projection: project(authorization) };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) { const value = await admitCommercialPilotAuthorization(); process.stdout.write(`${JSON.stringify({ admission: value.admission.id, authorization: value.authorization.id, projection: value.projection })}\n`); }

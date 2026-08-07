#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { admitPortableCarrier, digest } from "./portable-carrier-receiver.mjs";

const PROVIDER = "urn:ame:portable-node-carrier-service";
const ACTOR = "https://koios-news-service-section.invalid/activitypub/actor";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_PROVIDER_ROOT = resolve(ROOT, "../../../red-cup-engineering/services/software-development-services-section/services/portable-node-carrier-service");
const EFFECTS = Object.freeze(["admitted-source-read", "provider-local-temporary-staging", "provider-local-append-only-evidence", "proposal-only-carrier-bytes"]);

function contentRecord(body) { return { id: `urn:${digest(body)}`, ...body }; }
function providerEndpoint(root, operation) { const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")); const relative = pkg.bin?.[operation]; if (typeof relative !== "string") throw new Error(`portable carrier provider does not advertise ${operation}`); const endpoint = resolve(root, relative); if (!endpoint.startsWith(`${root}/`)) throw new Error("portable carrier provider endpoint escapes its membrane"); return endpoint; }
function invokeProvider(root, operation, input, now) {
  const temp = mkdtempSync(join(tmpdir(), "service-section-portable-carrier-contract-")); const inputPath = join(temp, "input.json"), outputPath = join(temp, "output.json");
  try { writeFileSync(inputPath, `${JSON.stringify(input)}\n`); const run = spawnSync(process.execPath, [providerEndpoint(root, operation), "--operation", operation, "--now", now, "--input-file", inputPath, "--output-file", outputPath], { cwd: root, encoding: "utf8", timeout: 180000, env: { ...process.env, NO_COLOR: "1" }, maxBuffer: 4 * 1024 * 1024 }); try { return JSON.parse(readFileSync(outputPath, "utf8")); } catch { throw new Error(run.error?.message || run.stderr || run.stdout || `portable carrier provider ${operation} exited ${run.status}`); } }
  finally { rmSync(temp, { recursive: true, force: true }); }
}

export function procurePortableCarrier(options = {}) {
  const now = options.now ?? new Date().toISOString();
  const providerRoot = resolve(options.providerRoot ?? process.env["KOIOS_NEWS_SERVICE_SECTION_PORTABLE_CARRIER_SERVICE_ROOT"] ?? DEFAULT_PROVIDER_ROOT);
  const request = Object.freeze({ type: "PortableNodeCarrierDemand", carrier: "koios-news-service-section", deliveryMode: "proposal-pending-customer-decision", customerMutationAuthorized: false, ceilings: Object.freeze({ maximumFiles: 20000, maximumBytes: 64 * 1024 * 1024 }), acceptanceChecks: Object.freeze([{ type: "PortableNodeCarrierCheck", assertion: "the advertised Service Section inbox imports from disposable territory" }, { type: "PortableNodeCarrierCheck", assertion: "manifest and artifacts bind the accepted source snapshot" }, { type: "PortableNodeCarrierCheck", assertion: "realization creates no deployment or public ingress" }]) });
  const sourceActivity = contentRecord({ type: "Create", actor: ACTOR, target: PROVIDER, object: request, recordedAt: now });
  const solicitation = contentRecord({ type: "Offer", actor: ACTOR, target: PROVIDER, object: Object.freeze({ type: "ServiceSolicitation", sourceActivity }), recordedAt: now });
  const offer = invokeProvider(providerRoot, "solicit-service", solicitation, now);
  if (offer.type !== "Offer" || offer.actor !== PROVIDER || offer.target !== ACTOR) throw new Error(`portable carrier solicitation refused: ${offer.object?.reason ?? offer.type}`);
  const capability = Object.freeze({ type: "PurposeBoundCapability", issuer: ACTOR, holder: PROVIDER, invocationTarget: PROVIDER, requestDigest: offer.object.requestDigest, providerOfferDigest: digest(offer), snapshotDigest: offer.object.snapshotDigest, effects: EFFECTS, singleUse: true, expiresAt: new Date(Date.parse(now) + 3_600_000).toISOString() });
  const invocation = contentRecord({ type: "Accept", actor: ACTOR, target: PROVIDER, object: Object.freeze({ type: "ServiceContract", contract: "portable-node-carrier-realization", offer, capability }), recordedAt: now });
  const proposedProduct = invokeProvider(providerRoot, "invoke-service", invocation, now);
  if (proposedProduct.type !== "Accept" || proposedProduct.actor !== PROVIDER || proposedProduct.target !== ACTOR || proposedProduct.object?.type !== "ProposedPortableNodeCarrier") throw new Error(`portable carrier realization refused: ${proposedProduct.object?.reason ?? proposedProduct.type}`);
  const product = proposedProduct.object;
  const checks = Object.freeze([{ assertion: "standalone import witness passed", passed: product.importWitness?.passed === true && product.importWitness?.exitCode === 0 }, { assertion: "manifest binds accepted snapshot", passed: digest(product.manifest) === offer.object.snapshotDigest && product.snapshotDigest === offer.object.snapshotDigest }, { assertion: "receiver authority preserved", passed: product.customerMutation === false && product.foreignMutation === false && product.pendingCustomerDecision === true }]);
  if (checks.some((check) => !check.passed)) throw new Error("Service Section refused the proposed carrier");
  const customerDecision = contentRecord({ type: "Accept", actor: ACTOR, target: PROVIDER, object: Object.freeze({ type: "PortableNodeCarrierCustomerDecision", proposedProduct, proposedProductDigest: digest(proposedProduct), checks }), recordedAt: now });
  const providerDecisionReceipt = invokeProvider(providerRoot, "accept-result", customerDecision, now);
  if (providerDecisionReceipt.type !== "Accept") throw new Error(`portable carrier provider did not receipt acceptance: ${providerDecisionReceipt.object?.reason ?? providerDecisionReceipt.type}`);
  return admitPortableCarrier({ proposedProduct, customerDecision, providerDecisionReceipt }, { now, ...(options.stagingScope === undefined ? {} : { stagingScope: options.stagingScope }), ...(options.dataRoot === undefined ? {} : { dataRoot: options.dataRoot }) });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) { try { process.stdout.write(`${JSON.stringify(procurePortableCarrier(), null, 2)}\n`); } catch (error) { process.stdout.write(`${JSON.stringify({ type: "PortableNodeCarrierProcurementRefusal", reason: error.message }, null, 2)}\n`); process.exitCode = 2; } }

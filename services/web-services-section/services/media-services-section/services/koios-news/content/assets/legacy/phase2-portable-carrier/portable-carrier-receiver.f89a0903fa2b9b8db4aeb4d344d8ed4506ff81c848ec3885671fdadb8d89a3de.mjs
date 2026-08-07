import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const PROVIDER = "urn:ame:portable-node-carrier-service";
const ACTOR = "https://koios-news-service-section.invalid/activitypub/actor";
const CARRIER = "koios-news-service-section";

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().filter((key) => value[key] !== undefined).map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
export function digest(value) { return `sha256:${createHash("sha256").update(canonical(value)).digest("hex")}`; }
function safeRelative(value) { if (typeof value !== "string" || value === "" || value.includes("\0") || isAbsolute(value)) return false; const clean = normalize(value).replaceAll("\\", "/"); return clean !== "." && !clean.startsWith("../") && !clean.includes("/../"); }

function appendReceipt(dataRoot, now, receipt) {
  const [year, month, day] = now.slice(0, 10).split("-");
  const path = join(dataRoot, "carrier-admissions", year, month, day, `${now.slice(0, 10)}-koios-news-service-section-carrier-admissions.jsonl`);
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(receipt)}\n`);
}

export function admitPortableCarrier(input, options = {}) {
  const now = options.now ?? new Date().toISOString();
  const proposal = input?.proposedProduct;
  const product = proposal?.object;
  const decision = input?.customerDecision;
  const providerReceipt = input?.providerDecisionReceipt;
  if (proposal?.type !== "Accept" || proposal.actor !== PROVIDER || proposal.target !== ACTOR || product?.type !== "ProposedPortableNodeCarrier" || product.carrier !== CARRIER || product.customerMutation !== false || product.foreignMutation !== false || product.pendingCustomerDecision !== true) throw new Error("receiver requires the exact proposal-only Service Section carrier");
  const proposalDigest = digest(proposal);
  if (decision?.type !== "Accept" || decision.actor !== ACTOR || decision.target !== PROVIDER || decision.object?.proposedProductDigest !== proposalDigest || decision.object?.checks?.some((check) => check.passed !== true)) throw new Error("receiver requires the exact customer acceptance and passing checks");
  if (providerReceipt?.type !== "Accept" || providerReceipt.actor !== PROVIDER || providerReceipt.target !== ACTOR || providerReceipt.object?.proposedProduct !== proposal.id || providerReceipt.object?.decision !== "Accept" || providerReceipt.object?.installationAuthorized !== false) throw new Error("receiver requires the provider decision receipt without installation authority");
  if (product.importWitness?.passed !== true || product.importWitness.exitCode !== 0) throw new Error("carrier has no passing standalone import witness");
  const artifacts = product.artifacts;
  if (!Array.isArray(artifacts) || artifacts.length === 0 || artifacts.length > 20000) throw new Error("carrier artifact count is invalid");
  const manifest = artifacts.map(({ targetPath, byteLength, digest: fileDigest }) => ({ targetPath, byteLength, digest: fileDigest }));
  if (digest(manifest) !== product.snapshotDigest || digest(product.manifest) !== product.snapshotDigest) throw new Error("carrier manifest does not bind the snapshot");
  const targets = new Set(); let totalBytes = 0;
  const verified = artifacts.map((artifact) => { if (!safeRelative(artifact.targetPath) || targets.has(artifact.targetPath) || typeof artifact.bytesBase64 !== "string" || !Number.isInteger(artifact.byteLength)) throw new Error("carrier artifact is malformed or colliding"); targets.add(artifact.targetPath); const bytes = Buffer.from(artifact.bytesBase64, "base64"); if (bytes.toString("base64") !== artifact.bytesBase64 || bytes.length !== artifact.byteLength || digest(artifact.bytesBase64) !== artifact.digest) throw new Error(`carrier artifact digest mismatch: ${artifact.targetPath}`); totalBytes += bytes.length; return { ...artifact, bytes }; });
  if (totalBytes > 64 * 1024 * 1024) throw new Error("carrier exceeds receiver byte ceiling");
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const stagingScope = resolve(options.stagingScope ?? process.env["KOIOS_NEWS_SERVICE_SECTION_CARRIER_STAGING_ROOT"] ?? join(root, ".carriers"));
  const targetRoot = resolve(options.targetRoot ?? join(stagingScope, product.snapshotDigest.replace(/^sha256:/u, "")));
  if ((!targetRoot.startsWith(`${stagingScope}${sep}`) && targetRoot !== stagingScope) || existsSync(targetRoot)) throw new Error("carrier target is outside the admitted staging scope or already exists");
  mkdirSync(stagingScope, { recursive: true });
  const temporary = mkdtempSync(join(stagingScope, ".service-section-carrier-"));
  try { for (const artifact of verified) { const target = resolve(temporary, artifact.targetPath); if (!target.startsWith(`${temporary}${sep}`)) throw new Error("carrier staging path escaped"); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, artifact.bytes, { flag: "wx", mode: 0o600 }); } renameSync(temporary, targetRoot); }
  catch (error) { rmSync(temporary, { recursive: true, force: true }); throw error; }
  const receipt = { type: "PortableNodeCarrierInstallationReceipt", actor: ACTOR, provider: PROVIDER, proposedProduct: proposal.id, proposedProductDigest: proposalDigest, snapshotDigest: product.snapshotDigest, targetRoot, targetName: basename(targetRoot), artifactCount: verified.length, byteLength: totalBytes, overwrite: false, networkAccess: false, credentialAccess: false, externalSpend: false, deployment: false, publicIngress: false, recordedAt: now };
  appendReceipt(resolve(options.dataRoot ?? process.env["KOIOS_NEWS_SERVICE_SECTION_DATA_ROOT"] ?? join(root, "data")), now, receipt);
  return receipt;
}

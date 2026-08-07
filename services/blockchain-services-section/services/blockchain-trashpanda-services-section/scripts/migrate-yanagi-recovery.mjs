#!/usr/bin/env node
import { createHash, randomBytes } from "node:crypto";
import {
  closeSync,
  constants,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  encryptSettlementMnemonic,
  ensureSettlementPassword,
  inspectSettlementMnemonic,
  openSettlementSigner,
} from "../src/settlement-key-custody.mjs";

export const YANAGI_RECOVERY_ADDRESS = "0x224c08a8526751887a83e2711b167f890c6d078d";
export const YANAGI_RECOVERY_URN = "urn:ame:yanagi-recovery-owner";
const VARIABLE = "YANAGI_WALLET";

function privateFile(path, label) {
  const stat = statSync(path);
  if (!stat.isFile() || (stat.mode & 0o077) !== 0) throw new Error(`${label} must be an owner-only regular file`);
}

function envMnemonic(path, variable = VARIABLE) {
  privateFile(path, "mnemonic source");
  const lines = readFileSync(path, "utf8").split(/\r?\n/u);
  const matches = lines.filter((line) => line.startsWith(`${variable}=`));
  if (matches.length !== 1) throw new Error(`mnemonic source must contain exactly one ${variable} assignment`);
  let value = matches[0].slice(variable.length + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  return value;
}

function syncDirectory(path) {
  const descriptor = openSync(path, constants.O_RDONLY | (constants.O_DIRECTORY ?? 0));
  try { fsyncSync(descriptor); } finally { closeSync(descriptor); }
}

function retireEnvAssignment(path, variable = VARIABLE) {
  const source = readFileSync(path, "utf8");
  const lines = source.split(/\r?\n/u);
  const matching = lines.filter((line) => line.startsWith(`${variable}=`));
  if (matching.length !== 1) throw new Error(`refusing to retire anything except one exact ${variable} assignment`);
  const replacement = lines.filter((line) => !line.startsWith(`${variable}=`));
  const index = replacement.length > 0 && replacement.at(-1) === "" ? replacement.length - 1 : replacement.length;
  replacement.splice(index, 0, `# ${variable} retired after exact-address encrypted-keystore migration`);
  const temporary = join(dirname(path), `.${variable.toLowerCase()}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`);
  let descriptor;
  try {
    descriptor = openSync(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
    writeFileSync(descriptor, replacement.join("\n"));
    fsyncSync(descriptor);
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
  renameSync(temporary, path);
  syncDirectory(dirname(path));
  privateFile(path, "retired mnemonic source");
}

export async function migrateYanagiRecovery({
  envPath,
  credentialRoot,
  evidencePath,
  expectedAddress = YANAGI_RECOVERY_ADDRESS,
  now = () => new Date().toISOString(),
}) {
  const source = resolve(envPath);
  const credentials = resolve(credentialRoot);
  const evidence = resolve(evidencePath);
  if (existsSync(evidence) && !readFileSync(source, "utf8").split(/\r?\n/u).some((line) => line.startsWith(`${VARIABLE}=`))) {
    return Object.freeze(JSON.parse(readFileSync(evidence, "utf8")));
  }
  const mnemonic = envMnemonic(source);
  const inspected = inspectSettlementMnemonic({ mnemonic });
  if (inspected.signer !== expectedAddress.toLowerCase()) throw new Error("YANAGI_WALLET does not derive the exact admitted recovery address");

  const passwordFile = ensureSettlementPassword({ credentialRoot: credentials, urn: YANAGI_RECOVERY_URN, chainId: 8453 });
  const keystorePath = join(dirname(passwordFile), "eip155-8453-recovery.json");
  if (!existsSync(keystorePath)) {
    await encryptSettlementMnemonic({ path: keystorePath, passwordFile, mnemonic, expectedSigner: expectedAddress });
  }
  privateFile(keystorePath, "Yanagi recovery keystore");
  const signer = await openSettlementSigner({ path: keystorePath, passwordFile });
  if (signer.address.toLowerCase() !== expectedAddress.toLowerCase()) throw new Error("reopened Yanagi recovery keystore does not match the admitted recovery address");
  const keystoreSha256 = createHash("sha256").update(readFileSync(keystorePath)).digest("hex");

  retireEnvAssignment(source);
  mkdirSync(dirname(evidence), { recursive: true });
  const receipt = {
    type: "YanagiRecoveryOwnershipCustodyMigrationEvidence",
    recoveryIdentity: `eip155:8453:${expectedAddress.toLowerCase()}`,
    custodyProvider: "urn:ame:blockchain-trashpanda",
    keystoreFormat: "ethereum-secret-storage-v3",
    keystoreSha256: `sha256:${keystoreSha256}`,
    plaintextSourceVariable: VARIABLE,
    plaintextSourceRetired: true,
    runtimeUseAuthorized: false,
    mnemonicRecorded: false,
    privateKeyRecorded: false,
    recoveryWalletUsedForCommercialRuntime: false,
    recordedAt: now(),
  };
  writeFileSync(evidence, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
  return Object.freeze(receipt);
}

function value(argv, name) {
  const index = argv.indexOf(name);
  if (index < 0 || !argv[index + 1]) throw new Error(`missing ${name}`);
  return argv[index + 1];
}

async function main() {
  const receipt = await migrateYanagiRecovery({
    envPath: value(process.argv, "--env"),
    credentialRoot: value(process.argv, "--credential-root"),
    evidencePath: value(process.argv, "--evidence"),
  });
  process.stdout.write(`${JSON.stringify(receipt)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify({ type: "YanagiRecoveryMigrationRefusal", reason: error instanceof Error ? error.message : String(error) })}\n`);
    process.exitCode = 1;
  });
}

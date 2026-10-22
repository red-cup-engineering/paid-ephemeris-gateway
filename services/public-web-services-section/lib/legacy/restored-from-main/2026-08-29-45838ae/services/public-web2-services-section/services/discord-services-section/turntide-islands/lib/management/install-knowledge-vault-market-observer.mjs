#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TTI_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const BEGIN_MARKER = "# BEGIN TTI KNOWLEDGE VAULT MARKET OBSERVER";
export const END_MARKER = "# END TTI KNOWLEDGE VAULT MARKET OBSERVER";
export function observerBlock(options = {}) {
  const root = options.ttiRoot ?? TTI_ROOT; const node = options.nodePath ?? process.execPath; const witnessJournal = options.witnessJournalAgentUrl ?? "http://127.0.0.1:19764/.well-known/agent-card.json";
  const app = join(root, "src/apps/turntide-islands-discord-platform"); const runner = join(root, "lib/management/observe-knowledge-vault-market.mjs"); const lock = join(root, "data/runtime/knowledge-vault-market.lock"); const log = join(root, "data/runtime/knowledge-vault-market.log");
  return `${BEGIN_MARKER}\n17 * * * * /usr/bin/env WITNESS_JOURNAL_RDF_AGENT=${witnessJournal} /usr/bin/flock -n ${lock} ${node} --env-file=${join(app, ".env")} ${runner} >> ${log} 2>&1\n${END_MARKER}`;
}
export function spliceObserver(existing, options = {}) {
  const begins = existing.split(BEGIN_MARKER).length - 1; const ends = existing.split(END_MARKER).length - 1; if (begins !== ends || begins > 1) throw new Error("vault observer recurrence markers malformed");
  const without = (begins ? existing.replace(new RegExp(`${BEGIN_MARKER}[\\s\\S]*?${END_MARKER}\\n?`, "u"), "") : existing).trimEnd(); return `${without ? `${without}\n\n` : ""}${observerBlock(options)}\n`;
}
function current(run) { const result = run("crontab", ["-l"], { encoding: "utf8" }); if (result.status === 0) return result.stdout; if (result.status === 1 && /no crontab/iu.test(result.stderr ?? "")) return ""; throw new Error(`crontab read failed: ${result.status}`); }
export function installObserver(options = {}) {
  const run = options.run ?? spawnSync; const desired = spliceObserver(current(run), options); const root = options.ttiRoot ?? TTI_ROOT; mkdirSync(join(root, "data/runtime"), { recursive: true }); const installed = run("crontab", ["-"], { encoding: "utf8", input: desired });
  if (installed.status !== 0) return { type: "TTIKnowledgeVaultObserverRefusal", reason: "crontab-install-failed" }; const observed = current(run);
  return observed.includes(observerBlock(options)) ? { type: "TTIKnowledgeVaultObserverInstallationReceipt", status: "installed", schedule: "17 * * * *", behavior: "observe consented Discord reaction signals and append a TTI-owned market snapshot without calling interest revenue" } : { type: "TTIKnowledgeVaultObserverRefusal", reason: "installed-crontab-verification-failed" };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) { const result = process.argv.includes("--install") ? installObserver() : { type: "TTIKnowledgeVaultObserverDryRun", block: observerBlock() }; process.stdout.write(`${JSON.stringify(result, null, 2)}\n`); if (result.type.endsWith("Refusal")) process.exitCode = 2; }

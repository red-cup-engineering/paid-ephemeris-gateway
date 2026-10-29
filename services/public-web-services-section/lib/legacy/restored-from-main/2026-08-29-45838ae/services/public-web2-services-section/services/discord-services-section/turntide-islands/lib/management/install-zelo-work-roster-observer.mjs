#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TTI_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const BEGIN_MARKER = "# BEGIN TTI ZELO WORK ROSTER OBSERVER";
export const END_MARKER = "# END TTI ZELO WORK ROSTER OBSERVER";

export function zeloWorkObserverBlock(options = {}) {
  const root = options.ttiRoot ?? TTI_ROOT;
  const node = options.nodePath ?? process.execPath;
  const app = join(root, "src/apps/turntide-islands-discord-platform");
  const runner = join(app, "dist/turntide-software-system/scripts/zelo-work-roster.mjs");
  const lock = join(root, "data/runtime/zelo-work-roster.lock");
  const log = join(root, "data/runtime/zelo-work-roster.log");
  return `${BEGIN_MARKER}\n*/5 * * * * /usr/bin/flock -n ${lock} ${node} --env-file=${join(app, ".env")} ${runner} observe >> ${log} 2>&1\n${END_MARKER}`;
}

export function spliceZeloWorkObserver(existing, options = {}) {
  const begins = existing.split(BEGIN_MARKER).length - 1;
  const ends = existing.split(END_MARKER).length - 1;
  if (begins !== ends || begins > 1) throw new Error("Zelo work observer recurrence markers malformed");
  const without = begins
    ? existing.replace(new RegExp(`${BEGIN_MARKER}[\\s\\S]*?${END_MARKER}\\n?`, "u"), "")
    : existing;
  const prefix = without.trimEnd();
  return `${prefix ? `${prefix}\n\n` : ""}${zeloWorkObserverBlock(options)}\n`;
}

function currentCrontab(run) {
  const result = run("crontab", ["-l"], { encoding: "utf8" });
  if (result.status === 0) return result.stdout;
  if (result.status === 1 && /no crontab/iu.test(result.stderr ?? "")) return "";
  throw new Error(`crontab read failed: ${result.status}`);
}

export function installZeloWorkObserver(options = {}) {
  const run = options.run ?? spawnSync;
  const desired = spliceZeloWorkObserver(currentCrontab(run), options);
  const root = options.ttiRoot ?? TTI_ROOT;
  mkdirSync(join(root, "data/runtime"), { recursive: true });
  const installed = run("crontab", ["-"], { encoding: "utf8", input: desired });
  if (installed.status !== 0) return { type: "TTIZeloWorkObserverRefusal", reason: "crontab-install-failed" };
  const observed = currentCrontab(run);
  return observed.includes(zeloWorkObserverBlock(options))
    ? { type: "TTIZeloWorkObserverInstallationReceipt", status: "installed", schedule: "*/5 * * * *", behavior: "admit every human Zelo mention to TTI's private operational roster and alert the configured admin without copying message text" }
    : { type: "TTIZeloWorkObserverRefusal", reason: "installed-crontab-verification-failed" };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = process.argv.includes("--install")
    ? installZeloWorkObserver()
    : { type: "TTIZeloWorkObserverDryRun", block: zeloWorkObserverBlock() };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.type.endsWith("Refusal")) process.exitCode = 2;
}

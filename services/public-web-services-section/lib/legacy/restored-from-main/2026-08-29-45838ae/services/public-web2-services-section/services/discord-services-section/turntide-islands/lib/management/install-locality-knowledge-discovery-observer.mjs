#!/usr/bin/env node

import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const TTI_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const START = "# BEGIN TTI LOCALITY KNOWLEDGE DISCOVERY OBSERVER";
const END = "# END TTI LOCALITY KNOWLEDGE DISCOVERY OBSERVER";

export function observerBlock(options = {}) {
  if (!/^\d{17,20}$/u.test(options.channelId ?? "") || !/^\d{17,20}$/u.test(options.messageId ?? "")) throw new Error("locality observer requires exact Discord channel and message IDs");
  const root = options.ttiRoot ?? TTI_ROOT, node = options.nodePath ?? process.execPath;
  const envFile = options.envFile ?? join(root, "src/apps/turntide-islands-discord-platform/.env");
  const controller = join(root, "lib/management/locality-knowledge-experiment-controller.mjs"), lock = join(root, "data/runtime/locality-knowledge-discovery-observer.lock"), log = join(root, "data/runtime/locality-knowledge-discovery-observer.log");
  return `${START}\n23 * * * * /usr/bin/flock -n ${lock} ${node} --env-file=${envFile} ${controller} --live --channel-id ${options.channelId} --message-id ${options.messageId} >> ${log} 2>&1\n${END}`;
}

export function spliceObserver(current, options = {}) {
  const block = observerBlock(options), pattern = new RegExp(`${escape(START)}[\\s\\S]*?${escape(END)}\\n?`, "u");
  const clean = String(current ?? "").replace(pattern, "").trimEnd();
  return `${clean ? `${clean}\n` : ""}${block}\n`;
}

export function installLocalityKnowledgeDiscoveryObserver(options = {}) {
  const run = options.run ?? spawnSync, current = run("crontab", ["-l"], { encoding: "utf8" });
  if (![0, 1].includes(current.status)) throw new Error(`cannot read crontab: ${current.stderr}`);
  const desired = spliceObserver(current.status === 0 ? current.stdout : "", options), root = options.ttiRoot ?? TTI_ROOT;
  mkdirSync(join(root, "data/runtime"), { recursive: true });
  const installed = run("crontab", ["-"], { encoding: "utf8", input: desired });
  if (installed.status !== 0) throw new Error(`cannot install locality observer: ${installed.stderr}`);
  return { type: "TTILocalityKnowledgeDiscoveryObserverInstallation", status: "installed", cadence: "23 * * * *", channelId: options.channelId, messageId: options.messageId };
}
function escape(value) { return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"); }

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const channelAt = process.argv.indexOf("--channel-id"), messageAt = process.argv.indexOf("--message-id");
  process.stdout.write(`${JSON.stringify(installLocalityKnowledgeDiscoveryObserver({ channelId: process.argv[channelAt + 1], messageId: process.argv[messageAt + 1] }), null, 2)}\n`);
}

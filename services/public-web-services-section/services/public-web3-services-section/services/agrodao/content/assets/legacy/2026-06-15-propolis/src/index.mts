import os from "node:os";
import path from "node:path";
import { readFileSync } from "node:fs";

import type { App } from "@emsenn/http-server";
import { htmlRepr, jsonRepr, mergeApps, mountAt, serveScripts } from "@emsenn/http-server";

type HiveScriptMap = Record<string, (params: Record<string, string>) => Promise<unknown>>;
type CreateHiveScripts = (config: {
  account: string;
  postingKey?: string | undefined;
  activeKey?: string | undefined;
  nodes?: readonly string[] | undefined;
}) => HiveScriptMap;

export interface PropolisAccountConfig {
  readonly account: string;
}

export interface PropolisConfig {
  readonly name?: string;
  readonly accounts?: readonly PropolisAccountConfig[];
  readonly keyRoot?: string;
  readonly nodes?: readonly string[];
}

export interface CreatePropolisAppOptions {
  readonly configPath: string;
  readonly stateDir: string;
  readonly logDir: string;
  readonly keyRoot?: string;
  readonly publicBaseUrl: string;
}

interface LoadedConfig {
  readonly name: string;
  readonly accounts: readonly PropolisAccountConfig[];
  readonly keyRoot: string;
  readonly nodes?: readonly string[];
}

function expandHome(value: string): string {
  return value === "~" ? os.homedir() : value.startsWith("~/") ? path.join(os.homedir(), value.slice(2)) : value;
}

function readJsonFile(file: string): unknown {
  return JSON.parse(readFileSync(file, "utf8")) as unknown;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

export function loadPropolisConfig(configPath: string, overrides: { keyRoot?: string | undefined } = {}): LoadedConfig {
  const raw = readJsonFile(configPath);
  const record = isRecord(raw) ? raw : {};
  const accounts = Array.isArray(record["accounts"])
    ? record["accounts"]
      .filter((item): item is PropolisAccountConfig => isRecord(item) && typeof item["account"] === "string")
      .map((item) => Object.freeze({ account: item.account }))
    : [];
  const configuredKeyRoot = typeof record["keyRoot"] === "string" ? record["keyRoot"] : "~/.config/blockchain/hive";
  const keyRoot = overrides.keyRoot ?? configuredKeyRoot;
  const nodes = Array.isArray(record["nodes"])
    ? record["nodes"].filter((node): node is string => typeof node === "string")
    : undefined;
  return Object.freeze({
    name: typeof record["name"] === "string" ? record["name"] : path.basename(path.dirname(configPath)),
    accounts: Object.freeze(accounts),
    keyRoot: expandHome(keyRoot),
    ...(nodes === undefined ? {} : { nodes: Object.freeze(nodes) }),
  });
}

function readWif(keyRoot: string, account: string, role: string): string | undefined {
  try {
    return readFileSync(path.join(keyRoot, account, `${role}.wif`), "utf8").trim();
  } catch {
    return undefined;
  }
}

async function loadHiveScripts(): Promise<{ createHiveScripts: CreateHiveScripts } | { error: string }> {
  try {
    const importRuntime = Function("specifier", "return import(specifier)") as (specifier: string) => Promise<unknown>;
    const imported = await importRuntime("@emsenn/computing-with-hive/scripts");
    const createHiveScripts = (imported as { createHiveScripts?: unknown }).createHiveScripts;
    if (typeof createHiveScripts !== "function") return { error: "@emsenn/computing-with-hive/scripts does not export createHiveScripts" };
    return { createHiveScripts: createHiveScripts as CreateHiveScripts };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
</head>
<body>
  <main>
${body}
  </main>
</body>
</html>`;
}

function unavailableApp(account: string, reason: string): App {
  return {
    resources: [
      {
        match: "/",
        methods: ["GET"],
        produces: ["application/json"],
        handler: () => jsonRepr({ status: "unavailable", account, reason }, 503),
      },
      {
        match: "/health",
        methods: ["GET"],
        produces: ["application/json"],
        handler: () => jsonRepr({ status: "unavailable", account, reason }, 503),
      },
    ],
  };
}

export async function createPropolisApp(options: CreatePropolisAppOptions): Promise<App> {
  const config = loadPropolisConfig(options.configPath, { keyRoot: options.keyRoot });
  const hive = await loadHiveScripts();
  const hiveStatus = "error" in hive ? "unavailable" : "ok";
  const hiveReason = "error" in hive ? hive.error : undefined;

  const baseApp: App = {
    resources: [
      {
        match: "/",
        methods: ["GET"],
        produces: ["text/html", "application/json"],
        handler: (ctx) => {
          const body = {
            kind: "propolis.instance",
            name: config.name,
            publicBaseUrl: options.publicBaseUrl.replace(/\/$/, ""),
            status: hiveStatus,
            accounts: config.accounts.map((entry) => entry.account),
            stateDir: options.stateDir,
            logDir: options.logDir,
            ...(hiveReason === undefined ? {} : { reason: hiveReason }),
          };
          if (ctx.negotiatedType === "application/json") return jsonRepr(body);
          const items = config.accounts.map((entry) => `<li><a href="/agents/${entry.account}">${entry.account}</a></li>`).join("\n");
          return htmlRepr(page(`${config.name} Propolis`, `    <h1>${config.name} Propolis</h1>
    <p>Status: ${hiveStatus}</p>
    <ul>
${items}
    </ul>`));
        },
      },
      {
        match: "/health",
        methods: ["GET"],
        produces: ["application/json"],
        handler: () => jsonRepr({
          status: hiveStatus,
          name: config.name,
          accounts: config.accounts.length,
          stateDir: options.stateDir,
          logDir: options.logDir,
          ...(hiveReason === undefined ? {} : { reason: hiveReason }),
        }, hiveStatus === "ok" ? 200 : 503),
      },
      {
        match: "/agents",
        methods: ["GET"],
        produces: ["application/json"],
        handler: () => jsonRepr({
          agents: config.accounts.map((entry) => ({
            account: entry.account,
            postingKey: readWif(config.keyRoot, entry.account, "posting") !== undefined,
            activeKey: readWif(config.keyRoot, entry.account, "active") !== undefined,
          })),
        }),
      },
    ],
  };

  const agentApps = config.accounts.map((entry) => {
    if ("error" in hive) return mountAt(`/agents/${entry.account}`, unavailableApp(entry.account, hive.error));
    const scripts = hive.createHiveScripts({
      account: entry.account,
      postingKey: readWif(config.keyRoot, entry.account, "posting"),
      activeKey: readWif(config.keyRoot, entry.account, "active"),
      ...(config.nodes === undefined ? {} : { nodes: config.nodes }),
    });
    return mountAt(`/agents/${entry.account}`, serveScripts(scripts));
  });

  return mergeApps(baseApp, ...agentApps);
}

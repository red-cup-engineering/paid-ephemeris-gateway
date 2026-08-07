// server.mts — serve Koios.News: env-configured, graceful, the 561.group
// serving pattern. KOIOS_NEWS_HOST/KOIOS_NEWS_PORT (or HOST/PORT) select the
// bind; KOIOS_NEWS_AD_CLIENT enables ad markup; KOIOS_NEWS_DATA relocates the
// view trace.

import process from "node:process";
import { pathToFileURL } from "node:url";

import { installGracefulShutdown, start, type StartResult } from "@emsenn/http-server";

import { createKoiosNewsSiteApp, type KoiosSiteOptions } from "./index.mjs";

export type ServeKoiosNewsOptions = KoiosSiteOptions & Readonly<{
  host?: string;
  port?: number;
  log?: (line: string) => void;
}>;

export type ServeKoiosNewsResult = StartResult & Readonly<{ host: string }>;

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 18_802;

export function serveKoiosNewsOptionsFromEnv(): { host: string; port: number } & KoiosSiteOptions {
  const adClient = process.env.KOIOS_NEWS_AD_CLIENT;
  const dataDir = process.env.KOIOS_NEWS_DATA;
  return {
    host: process.env.KOIOS_NEWS_HOST ?? process.env.HOST ?? DEFAULT_HOST,
    port: envPort() ?? DEFAULT_PORT,
    ...(adClient ? { adClient } : {}),
    ...(dataDir ? { dataDir } : {}),
  };
}

export async function serveKoiosNews(options: ServeKoiosNewsOptions = {}): Promise<ServeKoiosNewsResult> {
  const envOptions = serveKoiosNewsOptionsFromEnv();
  const host = options.host ?? envOptions.host;
  const port = options.port ?? envOptions.port;
  const running = await start(createKoiosNewsSiteApp({ ...envOptions, ...options }), { host, port });

  installGracefulShutdown(running, {
    onClosed: () => options.log?.("Koios.News stopped"),
    onError: (error) => options.log?.(`Koios.News shutdown failed: ${error instanceof Error ? error.message : String(error)}`),
  });

  options.log?.(`Koios.News listening at https://koios.news/ on ${host}:${running.port}`);
  return { ...running, host };
}

function envPort(): number | undefined {
  const raw = process.env.KOIOS_NEWS_PORT ?? process.env.PORT;
  if (raw === undefined) return undefined;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65_535) {
    throw new Error(`Invalid KOIOS_NEWS_PORT: ${raw}`);
  }
  return parsed;
}

function isMain(): boolean {
  return process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isMain()) {
  serveKoiosNews({ log: (line) => console.log(line) }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

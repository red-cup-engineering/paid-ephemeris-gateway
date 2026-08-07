#!/usr/bin/env node
// cable-server.mts — serve Koios.News's collapse newscable.

import process from "node:process";
import { pathToFileURL } from "node:url";

import { readNewscableSiteConfig } from "@emsenn/content-production/cable";
import { installGracefulShutdown, start, type StartResult } from "@emsenn/http-server";

import { createKoiosNewscableApp } from "./cable-app.mjs";
import { DEFAULT_CONTENT_PRODUCTION_CONFIG } from "./config.mjs";

export type ServeKoiosNewscableOptions = Readonly<{
  host?: string;
  port?: number;
  log?: (line: string) => void;
}>;

const DEFAULT_HOST = "127.0.0.1";

export async function serveKoiosNewscable(options: ServeKoiosNewscableOptions = {}): Promise<StartResult & { host: string }> {
  const config = await readNewscableSiteConfig(DEFAULT_CONTENT_PRODUCTION_CONFIG);
  const host = options.host ?? process.env.KOIOS_NEWS_CABLE_HOST ?? process.env.HOST ?? DEFAULT_HOST;
  const port = options.port ?? envPort() ?? config.port;
  const running = await start(await createKoiosNewscableApp(undefined, (line) => options.log?.(line)), { host, port });

  installGracefulShutdown(running, {
    onClosed: () => options.log?.("Koios.News cable stopped"),
    onError: (error) => options.log?.(`Koios.News cable shutdown failed: ${error instanceof Error ? error.message : String(error)}`),
  });

  options.log?.(`Koios.News cable listening at https://cable.koios.news/ on ${host}:${running.port}`);
  return { ...running, host };
}

function envPort(): number | undefined {
  const raw = process.env.KOIOS_NEWS_CABLE_PORT;
  if (raw === undefined) return undefined;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65_535) {
    throw new Error(`Invalid KOIOS_NEWS_CABLE_PORT: ${raw}`);
  }
  return parsed;
}

function isMain(): boolean {
  return process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isMain()) {
  serveKoiosNewscable({ log: (line) => console.log(line) }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

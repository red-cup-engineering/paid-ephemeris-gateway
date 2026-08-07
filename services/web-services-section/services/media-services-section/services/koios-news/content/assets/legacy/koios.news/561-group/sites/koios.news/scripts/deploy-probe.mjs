#!/usr/bin/env node

import net from "node:net";
import { performance } from "node:perf_hooks";

const timeoutMs = Number(process.env.KOIOS_DEPLOY_PROBE_TIMEOUT_MS ?? 60_000);
const intervalMs = Number(process.env.KOIOS_DEPLOY_PROBE_INTERVAL_MS ?? 1_000);
const startedAt = performance.now();

const listeners = Object.freeze([
  Object.freeze({ name: "public", host: "127.0.0.1", port: 18802 }),
  Object.freeze({ name: "newsroom", host: "127.0.0.1", port: 18803 }),
]);

const routes = Object.freeze([
  Object.freeze({ name: "public.home", url: "http://127.0.0.1:18802/", expect: "Koios" }),
  Object.freeze({ name: "public.feed-json", url: "http://127.0.0.1:18802/feed.json", expect: "items" }),
  Object.freeze({ name: "public.feed-xml", url: "http://127.0.0.1:18802/feed.xml", expect: "<rss" }),
  Object.freeze({ name: "public.bibliography", url: "http://127.0.0.1:18802/bibliography.json", expect: "domains" }),
  Object.freeze({ name: "public.audit", url: "http://127.0.0.1:18802/newswire-audit.json", expect: "subject" }),
  Object.freeze({ name: "public.article", url: "http://127.0.0.1:18802/posts/hello-world", expect: "Hello" }),
  Object.freeze({ name: "newsroom.workbench", url: "http://127.0.0.1:18803/operators/workbench.json", expect: "koios.newsroom.operator-workbench" }),
  Object.freeze({ name: "newsroom.work-queue", url: "http://127.0.0.1:18803/operators/work-queue.json", expect: "koios.newsroom.operator-work-queue" }),
  Object.freeze({ name: "newsroom.developing", url: "http://127.0.0.1:18803/administrating/developing", expect: "nested-derived-components" }),
  Object.freeze({ name: "newsroom.publication-candidates", url: "http://127.0.0.1:18803/operators/publication-candidates.json", expect: "koios.newsroom.publication-candidates" }),
  Object.freeze({ name: "newsroom.content-graph", url: "http://127.0.0.1:18803/operators/content/graph.json", expect: "publishing.managing.circulating.graph" }),
  Object.freeze({ name: "newsroom.predication", url: "http://127.0.0.1:18803/operators/content/predication.json", expect: "publishing.managing.circulating.predication" }),
  Object.freeze({ name: "newsroom.openapi", url: "http://127.0.0.1:18803/openapi.json", expect: "readKoiosContentGraph" }),
]);

function elapsedMs() {
  return Math.round(performance.now() - startedAt);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tcpProbe(listener) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: listener.host, port: listener.port });
    socket.setTimeout(Math.min(2_000, Math.max(250, intervalMs)));
    socket.once("connect", () => {
      socket.destroy();
      resolve(Object.freeze({ ...listener, ok: true, elapsedMs: elapsedMs() }));
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(Object.freeze({ ...listener, ok: false, error: "timeout" }));
    });
    socket.once("error", (error) => {
      socket.destroy();
      resolve(Object.freeze({ ...listener, ok: false, error: error.message }));
    });
  });
}

async function waitForListener(listener) {
  let last = await tcpProbe(listener);
  while (!last.ok && elapsedMs() < timeoutMs) {
    await sleep(intervalMs);
    last = await tcpProbe(listener);
  }
  return last;
}

async function routeProbe(route) {
  const started = performance.now();
  try {
    const response = await fetch(route.url, { redirect: "manual" });
    const body = await response.text();
    const ok = response.status >= 200 && response.status < 300 && body.includes(route.expect);
    return Object.freeze({
      name: route.name,
      url: route.url,
      ok,
      status: response.status,
      latencyMs: Math.round(performance.now() - started),
      evidence: ok ? route.expect : body.slice(0, 160),
    });
  } catch (error) {
    return Object.freeze({
      name: route.name,
      url: route.url,
      ok: false,
      status: 0,
      latencyMs: Math.round(performance.now() - started),
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function waitForRoute(route) {
  let last = await routeProbe(route);
  while (!last.ok && elapsedMs() < timeoutMs) {
    await sleep(intervalMs);
    last = await routeProbe(route);
  }
  return last;
}

const listenerResults = [];
for (const listener of listeners) listenerResults.push(await waitForListener(listener));

const routeResults = [];
for (const route of routes) routeResults.push(await waitForRoute(route));

const ok = listenerResults.every((result) => result.ok) && routeResults.every((result) => result.ok);
const report = Object.freeze({
  kind: "koios.deploy-readiness",
  ok,
  timeoutMs,
  elapsedMs: elapsedMs(),
  listeners: Object.freeze(listenerResults),
  routes: Object.freeze(routeResults),
});

console.log(JSON.stringify(report, null, 2));
if (!ok) process.exitCode = 1;

#!/usr/bin/env node
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripTypeScriptTypes } from "node:module";
import sirv from "sirv";
import { manifest } from "../src/cartridge.manifest.mts";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const VENDOR_CARTRIDGE_ROOT = path.join(ROOT, "node_modules", "@red-cup-engineering", "cartridge", "src");
const VENDOR_PREFIX = "/vendor/red-cup-engineering-cartridge/";
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 8794);
const STATIC_OPTIONS = { dev: true, etag: true, extensions: [] };
const serveStatic = sirv(ROOT, STATIC_OPTIONS);
const serveCartridge = sirv(VENDOR_CARTRIDGE_ROOT, STATIC_OPTIONS);

function resolveModule(pathname) {
  const filePath = path.resolve(ROOT, `.${decodeURIComponent(pathname)}`);
  return filePath.startsWith(`${ROOT}${path.sep}`) ? filePath : null;
}

function send(res, status, body, type = "text/plain") {
  res.writeHead(status, { "Content-Type": `${type}; charset=utf-8` });
  res.end(body);
}

function serveFrom(middleware, pathname, req, res) {
  const originalUrl = req.url;
  req.url = pathname;
  middleware(req, res, () => send(res, 404, "not found"));
  req.url = originalUrl;
}

export function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (url.pathname === "/") {
        res.writeHead(302, { Location: "/web/index.html" });
        res.end();
        return;
      }
      if (url.pathname === "/api/manifest") {
        return send(res, 200, JSON.stringify(manifest, null, 2), "application/json");
      }
      if (url.pathname.endsWith(".mts")) {
        const filePath = resolveModule(url.pathname);
        if (!filePath) return send(res, 403, "forbidden");
        const raw = await readFile(filePath, "utf8");
        return send(res, 200, stripTypeScriptTypes(raw, { mode: "strip" }), "text/javascript");
      }
      const cartridge = url.pathname.startsWith(VENDOR_PREFIX);
      const pathname = cartridge ? url.pathname.slice(VENDOR_PREFIX.length - 1) : url.pathname;
      serveFrom(cartridge ? serveCartridge : serveStatic, pathname, req, res);
    } catch (err) {
      if (err && err.code === "ENOENT") {
        return send(res, 404, "not found");
      }
      send(res, 500, `server error: ${err instanceof Error ? err.message : String(err)}`);
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createServer().listen(PORT, () => {
    console.log(`stoke-service serving ${ROOT} at http://localhost:${PORT}/`);
  });
}

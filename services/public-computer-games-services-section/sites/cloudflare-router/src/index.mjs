// cloudflare-router-561-group
//
// Minimal reverse-proxy Worker: maps each 561.group game subdomain to its
// Cloud Run origin, rewrites the upstream Host, and passes the request
// through unmodified otherwise (method, path, query, headers, body).
// Custom Domain routing (see wrangler.jsonc) is what actually attaches the
// four hostnames to this Worker and auto-manages their DNS records — this
// script owns only the hostname -> origin mapping and the proxy fetch.

// Map, not a plain object literal: request hostnames are untrusted external input, and a plain
// object would resolve a lookup like "__proto__" to Object.prototype instead of undefined.
export const ORIGIN_BY_HOST = new Map([
  ["ruinfold.561.group", "ruinfold-1019481907460.us-central1.run.app"],
  ["farstone.561.group", "http://ops.561.group:8080"],
  ["durante.561.group", "durante-1019481907460.us-central1.run.app"],
  ["aletheon.561.group", "aletheon-1019481907460.us-central1.run.app"],
  ["tidepool.561.group", "tidepool-1019481907460.us-central1.run.app"],
  ["casino.561.group", "casino-1019481907460.us-central1.run.app"],
]);

export function upstreamRequestFor(request) {
  const url = new URL(request.url);
  const upstreamHost = ORIGIN_BY_HOST.get(url.hostname);
  if (!upstreamHost) return null;

  if (upstreamHost.includes("://")) {
    const origin = new URL(upstreamHost);
    url.protocol = origin.protocol;
    url.hostname = origin.hostname;
    url.port = origin.port;
  } else {
    url.protocol = "https:";
    url.hostname = upstreamHost;
    url.port = "";
  }

  const upstreamRequest = new Request(url, request);
  upstreamRequest.headers.set("Host", url.host);
  return upstreamRequest;
}

export default {
  async fetch(request) {
    const upstreamRequest = upstreamRequestFor(request);
    if (!upstreamRequest) return new Response("Not found", { status: 404 });
    return fetch(upstreamRequest);
  },
};

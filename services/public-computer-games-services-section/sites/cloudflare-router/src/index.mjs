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
  ["play.561.group", "play-561-group-1019481907460.us-central1.run.app"],
  ["crucible.561.group", "crucible-1019481907460.us-central1.run.app"],
  ["solitaire.561.group", "solitaire-1019481907460.us-central1.run.app"],
  ["gambling-trainer.561.group", "gambling-trainer-1019481907460.us-central1.run.app"],
  ["ruinfold.561.group", "ruinfold-1019481907460.us-central1.run.app"],
  ["farstone.561.group", "farstone-1019481907460.us-central1.run.app"],
  ["durante.561.group", "durante-1019481907460.us-central1.run.app"],
  ["aletheon.561.group", "aletheon-1019481907460.us-central1.run.app"],
  ["equivo.561.group", "equivo-1019481907460.us-central1.run.app"],
  ["weiqi.561.group", "weiqi-1019481907460.us-central1.run.app"],
  ["stoke.561.group", "stoke-1019481907460.us-central1.run.app"],
  ["parlor.561.group", "parlor-1019481907460.us-central1.run.app"],
  ["you-are-conscious.561.group", "you-are-conscious-1019481907460.us-central1.run.app"],
  ["tidepool.561.group", "tidepool-1019481907460.us-central1.run.app"],
  ["fearful.561.group", "be-not-so-fearful-1019481907460.us-central1.run.app"],
]);

export function upstreamRequestFor(request) {
  const url = new URL(request.url);
  const upstreamHost = ORIGIN_BY_HOST.get(url.hostname);
  if (!upstreamHost) return null;

  url.protocol = "https:";
  url.hostname = upstreamHost;
  url.port = "";

  const upstreamRequest = new Request(url, request);
  upstreamRequest.headers.set("Host", upstreamHost);
  return upstreamRequest;
}

export default {
  async fetch(request) {
    const upstreamRequest = upstreamRequestFor(request);
    if (!upstreamRequest) return new Response("Not found", { status: 404 });
    return fetch(upstreamRequest);
  },
};

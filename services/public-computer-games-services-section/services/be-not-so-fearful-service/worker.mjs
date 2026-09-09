import { createCloudflareStaticAssetsWorker } from "@red-cup-engineering/web-server-platform-services-section/cloudflare-static-assets-worker";

export default createCloudflareStaticAssetsWorker({
  assetBinding: "ASSETS",
  redirects: [{ from: "/", to: "/web/index.html" }],
  responses: [{ path: "/health", status: 200, body: JSON.stringify({ ok: true }), headers: { "Content-Type": "application/json; charset=utf-8" } }],
});

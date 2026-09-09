import { createCloudflareStaticAssetsWorker } from "@red-cup-engineering/web-server-platform-services-section/cloudflare-static-assets-worker";

export default createCloudflareStaticAssetsWorker({
  assetBinding: "ASSETS",
  redirects: [{ from: "/", to: "/web/index.html" }],
  rewrites: [{ from: "/api/manifest", to: "/api-manifest.json" }],
});

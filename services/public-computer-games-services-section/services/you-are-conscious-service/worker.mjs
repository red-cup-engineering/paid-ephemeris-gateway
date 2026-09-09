import { createCloudflareStaticAssetsWorker } from "@red-cup-engineering/web-server-platform-services-section/cloudflare-static-assets-worker";

export default createCloudflareStaticAssetsWorker({
  assetBinding: "ASSETS",
  rewrites: [
    { from: "/", to: "/web/index.html" },
    { from: "/web/", to: "/web/index.html" },
    { from: "/api/manifest", to: "/api-manifest.json" },
  ],
});

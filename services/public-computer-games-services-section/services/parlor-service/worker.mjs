import { createCloudflareStaticAssetsWorker } from "@red-cup-engineering/web-server-platform-services-section/cloudflare-static-assets-worker";

export default createCloudflareStaticAssetsWorker({
  assetBinding: "ASSETS",
  prefix: { path: "/web", exclude: ["/web/", "/src/", "/vendor/parlor-kernel/", "/vendor/cartridge/"], index: "/index.html" },
});

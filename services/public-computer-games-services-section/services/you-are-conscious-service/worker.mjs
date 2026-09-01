// worker — the request-time behaviors dist/ cannot bake in. "/" is served as an INTERNAL
// rewrite to "/web/index.html" (bytes at URL "/", no redirect), matching web/server.mjs exactly
// — web/index.html's asset refs are root-absolute (`/web/css/style.css`, `/vendor/...`), so a
// same-URL fetch resolves them correctly with no extra hop. Also: a Content-Type override for
// ".mts" (Workers infers Content-Type from extension and does not know ".mts"), and serving the
// baked "/api/manifest" JSON at the URL web/server.mjs served it at dynamically.
export default {
  /**
   * @param {Request} request
   * @param {{ASSETS: {fetch: (req: Request) => Promise<Response>}}} env
   * @returns {Promise<Response>}
   */
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/manifest") {
      const manifestUrl = new URL(request.url);
      manifestUrl.pathname = "/api-manifest.json";
      return env.ASSETS.fetch(new Request(manifestUrl, request));
    }
    if (url.pathname === "/" || url.pathname === "") {
      const indexUrl = new URL(request.url);
      indexUrl.pathname = "/web/index.html";
      return env.ASSETS.fetch(new Request(indexUrl, request));
    }
    const response = await env.ASSETS.fetch(request);
    if (url.pathname.endsWith(".mts") && response.ok) {
      const headers = new Headers(response.headers);
      headers.set("Content-Type", "text/javascript; charset=utf-8");
      return new Response(response.body, { status: response.status, headers });
    }
    return response;
  },
};

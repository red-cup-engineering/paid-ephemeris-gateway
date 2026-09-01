// worker — replicates web/server.mjs's resolveFile routing at request time, since Workers
// Assets' default html_handling only auto-serves <dir>/index.html and knows nothing of parlor's
// dual namespace (pretty game URLs living under web/, plus fully-qualified /src/ and /web/
// paths), then fixes up ".mts" Content-Type (Workers Assets infers it from extension and does
// not know ".mts"). Vendor paths (/vendor/parlor-kernel/, /vendor/cartridge/) need no rewrite —
// those files are physically copied into dist/vendor/ already.
export default {
  /**
   * @param {Request} request
   * @param {{ASSETS: {fetch: (req: Request) => Promise<Response>}}} env
   * @returns {Promise<Response>}
   */
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    let rewritten = request;
    if (
      !pathname.startsWith("/vendor/parlor-kernel/") &&
      !pathname.startsWith("/vendor/cartridge/") &&
      !pathname.startsWith("/src/") &&
      !pathname.startsWith("/web/")
    ) {
      let rel = pathname;
      if (rel === "/" || rel === "") rel = "/index.html";
      else if (rel.endsWith("/")) rel = `${rel}index.html`;
      const rewrittenUrl = new URL(`/web${rel}`, url);
      rewrittenUrl.search = url.search;
      rewritten = new Request(rewrittenUrl, request);
    }
    const response = await env.ASSETS.fetch(rewritten);
    if (pathname.endsWith(".mts") && response.ok) {
      const headers = new Headers(response.headers);
      headers.set("Content-Type", "text/javascript; charset=utf-8");
      return new Response(response.body, { status: response.status, headers });
    }
    return response;
  },
};

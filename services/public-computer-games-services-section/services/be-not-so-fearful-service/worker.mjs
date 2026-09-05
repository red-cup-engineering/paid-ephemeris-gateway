// worker — the three request-time behaviors the static dist/ build cannot bake in: the real
// "/" -> "/web/index.html" redirect, the "/health" liveness constant, and a Content-Type
// override for ".mts" files (Workers Assets infers Content-Type from extension and does not
// know ".mts", src/server.mjs's own CONTENT_TYPES table maps it to text/javascript).
export default {
  /**
   * @param {Request} request
   * @param {{ASSETS: {fetch: (req: Request) => Promise<Response>}}} env
   * @returns {Promise<Response>}
   */
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "") {
      return new Response(null, { status: 302, headers: { Location: "/web/index.html" } });
    }
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
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

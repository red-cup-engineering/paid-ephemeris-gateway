// worker — the two request-time behaviors the static dist/ build cannot bake in: the real
// "/" -> "/web/index.html" redirect web/server.mjs used, and a Content-Type override for
// ".mts" files (Workers Assets infers Content-Type from extension and does not know ".mts").
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
    const response = await env.ASSETS.fetch(request);
    if (url.pathname.endsWith(".mts") && response.ok) {
      const headers = new Headers(response.headers);
      headers.set("Content-Type", "text/javascript; charset=utf-8");
      return new Response(response.body, { status: response.status, headers });
    }
    return response;
  },
};

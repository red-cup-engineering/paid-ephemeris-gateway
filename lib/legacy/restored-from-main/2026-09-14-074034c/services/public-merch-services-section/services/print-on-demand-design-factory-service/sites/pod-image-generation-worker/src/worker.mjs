// Private Workers AI proxy: accepts {prompt, model?}, runs the bound AI
// model, and returns the raster. Pure request/response shaping is factored
// out for offline unit testing; only fetch() itself touches the AI binding.

const DEFAULT_MODEL = "@cf/black-forest-labs/flux-1-schnell";

export function parseRequestBody(body) {
  if (!body || typeof body !== "object") {
    throw new Error("invalid JSON body");
  }
  const { prompt, model = DEFAULT_MODEL } = body;
  if (!prompt || typeof prompt !== "string") {
    throw new Error("prompt (string) is required");
  }
  return { prompt, model };
}

export function describeAiResult(result, model) {
  if (result && typeof result === "object" && typeof result.image === "string") {
    return { kind: "json", model, imageBase64: result.image, mimeType: "image/jpeg" };
  }
  if (result instanceof ReadableStream || result instanceof Uint8Array || result instanceof ArrayBuffer) {
    return { kind: "binary", model, body: result, mimeType: "image/png" };
  }
  throw new Error("unrecognized AI.run result shape");
}

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("POST only", { status: 405 });
    }
    let parsed;
    try {
      parsed = parseRequestBody(await request.json());
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
    try {
      const result = await env.AI.run(parsed.model, { prompt: parsed.prompt });
      const described = describeAiResult(result, parsed.model);
      if (described.kind === "json") {
        return new Response(
          JSON.stringify({ model: described.model, imageBase64: described.imageBase64, mimeType: described.mimeType }),
          { headers: { "content-type": "application/json" } }
        );
      }
      return new Response(described.body, {
        headers: { "content-type": described.mimeType, "x-pod-worker-model": described.model },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
        status: 502,
        headers: { "content-type": "application/json" },
      });
    }
  },
};

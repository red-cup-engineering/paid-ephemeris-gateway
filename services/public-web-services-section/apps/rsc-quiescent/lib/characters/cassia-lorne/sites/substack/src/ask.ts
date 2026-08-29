/**
 * ask — a prompt-to-text morphism over OpenAI-compatible chat completion
 * endpoints, plus a prompt-to-image morphism over NVIDIA NIM's image
 * generation invoke endpoints.
 *
 * Ported into Cassia Lorne's own pipeline from the legacy
 * @red-cup-engineering/producing-content package's src/computer/ask.mts (self-contained,
 * zero dependencies there too) and extended with makeAskImage for the
 * routine read's illustration. `makeAsk`/`makeAskImage` each close over one
 * provider configuration and return a plain async function; the production
 * cycle takes that function as a value and never sees a provider.
 *
 * Provider note (carried from operations, live-verified 2026-07-17): `nim`
 * is the default-capable text provider
 * (https://integrate.api.nvidia.com/v1/chat/completions). `groq` has a
 * tiny context window and is suitable ONLY for prompts well under 8k
 * tokens. For images, `pollinations` (a public, unauthenticated endpoint)
 * is the default -- the `nim` account this was tested against carries no
 * image models at all; see imageProviders' own note.
 */

type FetchLike = typeof fetch;

export type ContentProviderName = "groq" | "nim";

export type ContentProvider = Readonly<{
  url: string;
  /** Candidate env var names, checked in order; the corpus carries at
   *  least three names for the same NVIDIA credential across notes and
   *  .env files (NVIDIA_API_KEY, API_KEY_NVIDIA, API_KEY_INFERENCE_NVIDIA). */
  keyEnv: readonly string[];
  model: string;
}>;

export type ContentProviderUsage = Readonly<{
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  raw?: unknown;
}>;

export type ContentAskOptions = Readonly<{
  provider?: ContentProviderName | string;
  providers?: Readonly<Record<string, ContentProvider>>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  env?: Readonly<Record<string, string | undefined>>;
  fetchImpl?: FetchLike;
  onUsage?: (usage: ContentProviderUsage, meta: Readonly<{ provider: string; model: string }>) => void;
}>;

/**
 * The default text-provider registry. `nim` is the default-capable
 * provider; `groq` only suits prompts well under 8k tokens.
 */
export const contentProviders: Readonly<Record<string, ContentProvider>> = Object.freeze({
  groq: Object.freeze({ url: "https://api.groq.com/openai/v1/chat/completions", keyEnv: ["GROQ_API_KEY"], model: "llama-3.1-8b-instant" }),
  nim: Object.freeze({
    url: "https://integrate.api.nvidia.com/v1/chat/completions",
    keyEnv: ["NVIDIA_API_KEY", "API_KEY_NVIDIA", "API_KEY_INFERENCE_NVIDIA"],
    model: "meta/llama-3.1-8b-instruct",
  }),
});

function envValue(env: Readonly<Record<string, string | undefined>>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = env[key];
    if (value !== undefined && value !== "") return value;
  }
  return undefined;
}

/** Whether a provider is configured AND keyed in the given environment. */
export function hasProvider(provider: string, opts: Pick<ContentAskOptions, "providers" | "env"> = {}): boolean {
  const providers = opts.providers ?? contentProviders;
  const config = providers[provider];
  return !!(config && envValue(opts.env ?? process.env, config.keyEnv));
}

/** First keyed provider in preference order; nim leads (see module note). */
export function pickProvider(order: readonly string[] = ["nim", "groq"], opts: Pick<ContentAskOptions, "providers" | "env"> = {}): string | null {
  return order.find((provider) => hasProvider(provider, opts)) ?? null;
}

function normalizeProviderUsage(value: unknown): ContentProviderUsage {
  if (!value || typeof value !== "object") return Object.freeze({ raw: value });
  const usage = value as { prompt_tokens?: unknown; completion_tokens?: unknown; total_tokens?: unknown };
  const promptTokens = typeof usage.prompt_tokens === "number" ? usage.prompt_tokens : undefined;
  const completionTokens = typeof usage.completion_tokens === "number" ? usage.completion_tokens : undefined;
  const totalTokens = typeof usage.total_tokens === "number" ? usage.total_tokens : undefined;
  const normalized: { promptTokens?: number; completionTokens?: number; totalTokens?: number; raw?: unknown } = { raw: value };
  if (promptTokens !== undefined) normalized.promptTokens = promptTokens;
  if (completionTokens !== undefined) normalized.completionTokens = completionTokens;
  if (totalTokens !== undefined) normalized.totalTokens = totalTokens;
  return Object.freeze(normalized);
}

/**
 * Close over one text-provider configuration and return the ask morphism.
 * Defaults to `nim`, the default-capable provider; pass `provider: "groq"`
 * only for prompts well under 8k tokens. Throws only on malformed
 * configuration (unknown provider, unkeyed environment) — transport
 * failures surface per call.
 */
export function makeAsk(options: ContentAskOptions = {}): (prompt: string) => Promise<string> {
  const providerName = options.provider ?? "nim";
  const providers = options.providers ?? contentProviders;
  const provider = providers[providerName];
  if (!provider) throw new TypeError(`unknown provider "${providerName}"`);
  const key = envValue(options.env ?? process.env, provider.keyEnv);
  if (!key) throw new TypeError(`none of ${provider.keyEnv.join(", ")} is set`);
  const model = options.model ?? provider.model;
  const fetchImpl = options.fetchImpl ?? fetch;
  const temperature = options.temperature ?? 0.4;
  return async (prompt: string): Promise<string> => {
    const response = await fetchImpl(provider.url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: String(prompt) }],
        temperature,
        ...(options.maxTokens === undefined ? {} : { max_tokens: options.maxTokens }),
      }),
    });
    if (!response.ok) throw new Error(`${providerName} ${model}: HTTP ${response.status}`);
    const data = (await response.json()) as { usage?: unknown; choices?: readonly { message?: { content?: unknown } }[] };
    options.onUsage?.(normalizeProviderUsage(data.usage), { provider: providerName, model });
    return String(data.choices?.[0]?.message?.content ?? "");
  };
}

// ── image generation ────────────────────────────────────────────────────

export type ImageProviderName = "nim" | "pollinations";

/**
 * Two transports are needed, not one: `nim-genai` (NVIDIA's image NIM
 * invoke contract — POST JSON, key required, base64 back) and
 * `pollinations-get` (a public, unauthenticated GET-by-URL endpoint — no
 * key, raw image bytes back). Providers are not interchangeable strings
 * over one shape; the shape itself differs.
 */
export type ImageProvider =
  | Readonly<{ kind: "nim-genai"; urlTemplate: string; keyEnv: readonly string[]; model: string }>
  | Readonly<{ kind: "pollinations-get"; urlTemplate: string; model?: undefined }>;

export type ImageAskOptions = Readonly<{
  provider?: ImageProviderName | string;
  providers?: Readonly<Record<string, ImageProvider>>;
  model?: string;
  /** Output image size in pixels, square. Defaults to 1024. */
  size?: number;
  /** Denoising steps. Defaults to the model's own default when omitted. */
  steps?: number;
  /** Classifier-free guidance scale. Defaults to the model's own default. */
  cfgScale?: number;
  /** Deterministic seed; the routine-read's own draw seed by convention. */
  seed?: number;
  env?: Readonly<Record<string, string | undefined>>;
  fetchImpl?: FetchLike;
}>;

/** A generated image: base64-encoded bytes plus what produced them. */
export type GeneratedImage = Readonly<{
  base64: string;
  mimeType: string;
  provider: string;
  model: string;
}>;

/**
 * The default image-provider registry.
 *
 * `nim` invokes an NVIDIA-hosted image-generation NIM's genai endpoint —
 * LIVE-CHECKED 2026-07-17 against a real key and found to carry no image
 * models at all for this account (its /v1/models catalog is text-only, and
 * the configured model 404s as "not found for account"). Kept as a
 * provider option for an account that does carry one; not the default.
 *
 * `pollinations` is Pollinations.ai's public, unauthenticated image
 * endpoint (https://image.pollinations.ai/prompt/<url-encoded prompt>) —
 * LIVE-VERIFIED 2026-07-17: a real request returned a real 512x512 JPEG in
 * one call, no key needed. The default until an account with real NIM
 * image entitlement is confirmed.
 */
export const imageProviders: Readonly<Record<string, ImageProvider>> = Object.freeze({
  nim: Object.freeze({
    kind: "nim-genai" as const,
    urlTemplate: "https://ai.api.nvidia.com/v1/genai/{model}",
    keyEnv: ["NVIDIA_API_KEY", "API_KEY_NVIDIA", "API_KEY_INFERENCE_NVIDIA"],
    model: "stabilityai/stable-diffusion-3-medium",
  }),
  pollinations: Object.freeze({
    kind: "pollinations-get" as const,
    urlTemplate: "https://image.pollinations.ai/prompt/{prompt}",
  }),
});

/** Whether an image provider is configured AND (if it needs one) keyed in the given environment. */
export function hasImageProvider(provider: string, opts: Pick<ImageAskOptions, "providers" | "env"> = {}): boolean {
  const providers = opts.providers ?? imageProviders;
  const config = providers[provider];
  if (!config) return false;
  return config.kind === "pollinations-get" || !!envValue(opts.env ?? process.env, config.keyEnv);
}

async function bufferToBase64(response: Response): Promise<string> {
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return Buffer.from(binary, "binary").toString("base64");
}

/**
 * Close over one image-provider configuration and return the image-ask
 * morphism: a text prompt in, a base64-encoded image out. Defaults to
 * `pollinations` (see imageProviders' own note on why). Throws only on
 * malformed configuration; transport and decode failures surface per call
 * so a missing illustration never silently becomes a missing routine read.
 */
export function makeAskImage(options: ImageAskOptions = {}): (prompt: string) => Promise<GeneratedImage> {
  const providerName = options.provider ?? "pollinations";
  const providers = options.providers ?? imageProviders;
  const provider = providers[providerName];
  if (!provider) throw new TypeError(`unknown image provider "${providerName}"`);
  const fetchImpl = options.fetchImpl ?? fetch;
  const size = options.size ?? 1024;

  if (provider.kind === "pollinations-get") {
    return async (prompt: string): Promise<GeneratedImage> => {
      const url = provider.urlTemplate.replace("{prompt}", encodeURIComponent(String(prompt)));
      const params = new URLSearchParams({
        width: String(size),
        height: String(size),
        nologo: "true",
        ...(options.seed === undefined ? {} : { seed: String(options.seed) }),
      });
      const response = await fetchImpl(`${url}?${params.toString()}`);
      if (!response.ok) throw new Error(`pollinations: HTTP ${response.status}`);
      const contentType = response.headers.get("content-type") ?? "image/jpeg";
      return Object.freeze({ base64: await bufferToBase64(response), mimeType: contentType, provider: providerName, model: "pollinations-default" });
    };
  }

  const key = envValue(options.env ?? process.env, provider.keyEnv);
  if (!key) throw new TypeError(`none of ${provider.keyEnv.join(", ")} is set`);
  const model = options.model ?? provider.model;
  const url = provider.urlTemplate.replace("{model}", model);
  return async (prompt: string): Promise<GeneratedImage> => {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}`, accept: "application/json" },
      body: JSON.stringify({
        prompt: String(prompt),
        width: size,
        height: size,
        ...(options.steps === undefined ? {} : { steps: options.steps }),
        ...(options.cfgScale === undefined ? {} : { cfg_scale: options.cfgScale }),
        ...(options.seed === undefined ? {} : { seed: options.seed }),
      }),
    });
    if (!response.ok) throw new Error(`${providerName} ${model}: HTTP ${response.status}`);
    const data = (await response.json()) as { image?: unknown; artifacts?: readonly { base64?: unknown }[] };
    const base64 =
      typeof data.image === "string" ? data.image : typeof data.artifacts?.[0]?.base64 === "string" ? data.artifacts[0].base64 : undefined;
    if (!base64) throw new Error(`${providerName} ${model}: response carried no image (got keys: ${Object.keys(data).join(", ")})`);
    return Object.freeze({ base64, mimeType: "image/png", provider: providerName, model });
  };
}

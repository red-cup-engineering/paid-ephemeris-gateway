/**
 * ask — a prompt-to-text morphism over OpenAI-compatible chat completion
 * endpoints.
 *
 * `makeAsk` closes over one provider configuration and returns
 * `(prompt) => Promise<string>`; the production cycle takes that function
 * as a value and never sees a provider. Providers, keys, and `fetch` all
 * enter as values, so consumers and tests can run hermetically.
 *
 * Provider note (carried from operations): `nim` is the default-capable
 * provider (https://integrate.api.nvidia.com/v1/chat/completions, keyed by
 * NVIDIA_API_KEY). `groq` has a tiny context window and is suitable ONLY
 * for prompts well under 8k tokens.
 */

type FetchLike = typeof fetch;

export type ContentProviderName = "groq" | "nim";

export type ContentProvider = Readonly<{
  url: string;
  keyEnv: string;
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
 * The default provider registry. `nim` is the default-capable provider;
 * `groq` only suits prompts well under 8k tokens (tiny context window).
 */
export const contentProviders: Readonly<Record<string, ContentProvider>> = Object.freeze({
  groq: Object.freeze({ url: "https://api.groq.com/openai/v1/chat/completions", keyEnv: "GROQ_API_KEY", model: "llama-3.1-8b-instant" }),
  nim: Object.freeze({ url: "https://integrate.api.nvidia.com/v1/chat/completions", keyEnv: "NVIDIA_API_KEY", model: "meta/llama-3.1-8b-instruct" }),
});

function envValue(env: Readonly<Record<string, string | undefined>>, key: string): string | undefined {
  const value = env[key];
  return value === "" ? undefined : value;
}

/** Whether a provider is configured AND keyed in the given environment.
 *  Boolean convenience at the app edge (invariant A1 reserves carriers for
 *  lib judgments; an app may answer configuration questions plainly). */
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
 * Close over one provider configuration and return the ask morphism.
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
  if (!key) throw new TypeError(`${provider.keyEnv} is not set`);
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
    const data = await response.json() as { usage?: unknown; choices?: readonly { message?: { content?: unknown } }[] };
    options.onUsage?.(normalizeProviderUsage(data.usage), { provider: providerName, model });
    return String(data.choices?.[0]?.message?.content ?? "");
  };
}

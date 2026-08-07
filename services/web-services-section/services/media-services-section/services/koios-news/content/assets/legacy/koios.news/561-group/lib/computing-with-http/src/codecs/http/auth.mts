import { quoteHeaderValue } from "./header-value.mjs";

export type BearerChallengeOptions = Readonly<{
  realm?: string;
  error?: string;
  errorDescription?: string;
  errorUri?: string;
  resourceMetadata?: string;
}>;

function first(value: string | readonly string[] | undefined): string | undefined {
  return typeof value === "string" ? value : value?.[0];
}

export function bearerToken(authorization: string | readonly string[] | undefined): string | undefined {
  const raw = first(authorization);
  const match = /^Bearer\s+(.+)$/i.exec(raw ?? "");
  return match?.[1]?.trim() || undefined;
}

export function bearerChallenge(options: BearerChallengeOptions = {}): string {
  const parts: string[] = [];
  if (options.realm !== undefined) parts.push(`realm=${quoteHeaderValue(options.realm)}`);
  if (options.error !== undefined) parts.push(`error=${quoteHeaderValue(options.error)}`);
  if (options.errorDescription !== undefined) {
    parts.push(`error_description=${quoteHeaderValue(options.errorDescription)}`);
  }
  if (options.errorUri !== undefined) parts.push(`error_uri=${quoteHeaderValue(options.errorUri)}`);
  if (options.resourceMetadata !== undefined) {
    parts.push(`resource_metadata=${quoteHeaderValue(options.resourceMetadata)}`);
  }
  return parts.length === 0 ? "Bearer" : `Bearer ${parts.join(", ")}`;
}

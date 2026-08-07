// signed-value.mts — HMAC-signed cookie values.
//
// Semantic value: a string. Wire form: "value.signature" with an HMAC
// over a salt-scoped key. The pair is a RETRACTION onto the image of
// sign: unsignCookieValue ∘ signCookieValue = id, and everything outside
// the image (tampered or unsigned text) decodes to null. Verification is
// timing-safe.

import { createHmac, timingSafeEqual } from "node:crypto";

export function signCookieValue(value: string, secret: string, salt = "cookie"): string {
  if (!secret) throw new TypeError("signCookieValue: secret is required");
  const signature = createHmac("sha256", secret).update(salt).update("\0").update(value).digest("base64url");
  return `${value}.${signature}`;
}

export function unsignCookieValue(signedValue: string, secret: string, salt = "cookie"): string | null {
  const marker = signedValue.lastIndexOf(".");
  if (marker <= 0) return null;
  const value = signedValue.slice(0, marker);
  const signature = signedValue.slice(marker + 1);
  const expected = signCookieValue(value, secret, salt).slice(value.length + 1);
  return safeEqual(signature, expected) ? value : null;
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

// @emsenn/web-codecs-cookie — codec for the cookie representations.
//
// Three encode/decode pairs, each a morphism pair in the representational
// category, each stating its strength:
//
// - Cookie request header (record ↔ header text): retraction — parse ∘
//   serialize = id on valid records; parse normalizes the wire form.
// - Set-Cookie response field (cookie ↔ field text): retraction — parse ∘
//   serialize recovers the cookie with casing normalized; parse drops
//   what the grammar does not admit.
// - Signed values (string ↔ "value.signature"): retraction onto the image
//   of sign — everything outside it decodes to null, timing-safely.
//
// Transport is not represented here: putting these texts on req/res
// objects is the server's business, not the codec's.

export { parseCookieHeader, serializeCookieHeader } from "./cookie-header.mjs";

export { parseSetCookie, serializeSetCookie } from "./set-cookie.mjs";
export type { CookieOptions, CookiePriority, SameSite, SetCookie } from "./set-cookie.mjs";

export { signCookieValue, unsignCookieValue } from "./signed-value.mjs";

export { assertCookieName, isCookieName } from "./grammar.mjs";

// @emsenn/web-codecs-negotiation — content negotiation as codec selection.
//
// The Accept, Accept-Encoding, and Accept-Language headers decode to
// ranked preferences; the negotiate functions choose among offered
// representations. The chosen representation is exactly the codec the
// traversal will use — negotiation is the selection morphism, not a
// transport concern. The offered lists are the caller's authority: this
// package knows the representations, never the platform's capabilities.

export { negotiateType, parseAccept } from "./accept.mjs";
export type { AcceptEntry } from "./accept.mjs";

export { negotiateEncoding, parseAcceptEncoding } from "./accept-encoding.mjs";
export type { Coding } from "./accept-encoding.mjs";

export { negotiateLanguage, parseAcceptLanguage } from "./accept-language.mjs";
export type { AcceptLanguageEntry } from "./accept-language.mjs";

export { extensionType, isCompressible } from "./media-type.mjs";

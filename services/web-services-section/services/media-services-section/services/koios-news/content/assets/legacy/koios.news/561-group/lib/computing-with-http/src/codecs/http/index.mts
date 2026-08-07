// @emsenn/web-codecs-http — codec for the HTTP header-value
// representations: parameterized field values, Content-Type,
// IMF-fixdate, entity tags with their precondition evaluators, byte
// ranges, Cache-Control, and the Link field.
//
// Everything here is representation: functions take field values and
// semantic values, never sockets or request objects. Binding a field
// to a live request or response is the server's business.

export {
  firstHeader,
  joinedHeader,
  parseDirectiveList,
  quoteHeaderValue,
  splitHeaderParameters,
  unquoteHeaderValue,
} from "./header-value.mjs";
export type { HeaderValue } from "./header-value.mjs";

export { parseContentType, serializeContentType } from "./content-type.mjs";
export type { ContentType } from "./content-type.mjs";

export { httpDate, parseHttpDate } from "./date.mjs";

export {
  etagList,
  ifMatch,
  ifModifiedSince,
  ifNoneMatch,
  ifRange,
  ifUnmodifiedSince,
  strongEtagMatch,
  weakEtagMatch,
} from "./conditional.mjs";

export {
  byterangesCloseDelimiter,
  byterangesPartHeader,
  contentRange,
  multipartByterangesBody,
  multipartRangeBoundary,
  parseRange,
  parseRanges,
} from "./range.mjs";
export type { ByteRange } from "./range.mjs";

export { cacheControl, parseCacheControl } from "./cache-control.mjs";
export type { CacheControl } from "./cache-control.mjs";

export { linkHeader, parseLinkHeader } from "./link.mjs";
export type { LinkValue } from "./link.mjs";

export { bearerChallenge, bearerToken } from "./auth.mjs";
export type { BearerChallengeOptions } from "./auth.mjs";

// Service-facing content-coding exports. The computation lives in
// @emsenn/computing-with-http/codecs/compression.

export {
  CODINGS,
  compress,
  compressStream,
  decompress,
  decompressStream,
  supportedCompressionCodings,
  zstdSupported,
} from "@emsenn/computing-with-http/codecs/compression";

/**
 * mutating  -  the document-write surface (dry-run-first), derived from
 * @emsenn/relating's markdown codec. Prepares and (on explicit write) places documents.
 */
export { createDocument, updateFrontmatter, type PreparedDocument } from "./mutating.mjs";

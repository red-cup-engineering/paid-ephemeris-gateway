/**
 * vault  -  the vault as a directed category.
 *
 * The on-disk vault (content/) is organized generator/generated: every parent
 * directory GENERATES its child, so the directory tree IS the directed knowledge
 * relation the learning verbs traverse. This subpath rolls up the scoped readers
 * that admit that category as carriers  -  node resolution, the generator chain
 * (ancestry), the generated frontier (children), and the canonical document.
 */
export {
  resolveNode,
  requireNode,
  claim,
  ancestry,
  children,
  generator,
  references,
  document,
  UnknownTopic,
  type VaultNode,
  type ResolvedNode,
  type NodeRole,
} from "./store.mjs";

// The vault reading boundary  -  resources decoded into documents by relating's
// markdown codec, plus confined listing and gathering. The disk store is the vault.
export {
  readDocument,
  listEntries,
  gatherResources,
  confine,
  type Resource,
  type VaultDocument,
  type Listing,
  type ListEntry,
} from "./documents.mjs";

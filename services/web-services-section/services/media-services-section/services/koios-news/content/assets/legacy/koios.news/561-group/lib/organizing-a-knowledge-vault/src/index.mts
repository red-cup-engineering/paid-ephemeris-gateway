/**
 * @emsenn/organizing-a-knowledge-vault  -  filepath-vault admission for content/.
 *
 * The package is downstream of @emsenn/organizing and specializes @emsenn/knowing's
 * epistemic carriers to the concrete path law of this repository's content trees.
 * The filesystem and markdown boundary still come from @emsenn/relating; the
 * memory/proof/research readings still come from @emsenn/knowing.
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
  readDocument,
  listEntries,
  gatherResources,
  confine,
  type VaultNode,
  type ResolvedNode,
  type NodeRole,
  type Resource,
  type VaultDocument,
  type Listing,
  type ListEntry,
} from "./vault/index.mjs";

export { createDocument, updateFrontmatter, type PreparedDocument } from "./mutating/index.mjs";

export {
  actions,
  researchAction,
  knowAction,
  introduceAction,
  studyAction,
  explainAction,
  teachAction,
  learnAction,
  tutorAction,
  browseAction,
  locateAction,
  readAction,
  listAction,
  settleMemoryAction,
  observeAction,
  conceptMapAction,
  inspectTopicAction,
  measureGapAction,
  inspectHealthAction,
  createDocumentAction,
  updateFrontmatterAction,
} from "./actions.mjs";

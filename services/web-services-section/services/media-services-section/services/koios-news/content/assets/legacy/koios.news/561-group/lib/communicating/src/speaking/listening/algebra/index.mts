/**
 * @emsenn/communicating/speaking/listening/algebra — the generative/compositional foundation of the
 * language chain.
 *
 * Three faces of the same algebraic layer:
 *  - charge readings: communicating-specific status and Lambek residuation over
 *    @emsenn/relating ChargeCarrier values; the bilattice carrier itself is
 *    owned upstream by relating.
 *  - fiber: the signature of a language — its generating lexicon, morphology,
 *    reference, attachment and segmentation data (the RawBundle/CompiledBundle).
 *  - morphology: the word-form generators that act over a fiber (conjugate,
 *    pluralize, indefiniteArticle, lemma).
 *
 * Everything here is upstream of communicating parsing, but downstream of
 * relating's Mark/Utterance and charge carriers.
 */
export { chargeStatus, fuse, implies } from "./charge.mjs";
export type { ChargeStatus } from "./charge.mjs";
export type {
  BundleMeta, BundleLexicon, SuffixRule, BundleMorphology,
  PronounFeatures, BundleReference, BundleAttachment, BundleSegmentation,
  RawBundle, CompiledBundle,
} from "./fiber.mjs";
export { conjugate, pluralize, indefiniteArticle, lemma } from "./morphology.mjs";
export { load } from "./compile.mjs";

/**
 * codecs/html/profiles — an inhabitant profile constrains an SHP packet to a
 * concrete HTML shape and structural-class vocabulary. RFC 7992 is the current
 * concrete profile; it is NOT the definition of SHP. New profiles inhabit the
 * same packet object with their own class vocabulary and constraints.
 */
import { lint, type LintReport } from "./lint.mjs";

/**
 * An inhabitant profile: constrains an SHP packet to a concrete HTML shape and
 * a structural-class vocabulary. `name` identifies the profile, `classes` is
 * the structural class vocabulary recognized as morphism identities, and `lint`
 * applies packet-safety plus profile constraints over an HTML packet.
 */
export interface Profile {
  readonly name: string;
  /** the structural class vocabulary this profile recognizes as morphism identities. */
  readonly classes: readonly string[];
  /** packet-safety + profile constraints over an HTML packet. */
  lint(html: string): LintReport;
}

/** RFC 7992 structural classes — its <span class> morphism identities. */
export const RFC7992_CLASSES = ["bcp14", "xref", "eref", "relref", "selfRef", "artwork", "sourcecode"] as const;
/**
 * The union of RFC 7992 structural class names: one element of
 * `RFC7992_CLASSES`.
 */
export type Rfc7992Class = (typeof RFC7992_CLASSES)[number];

/** The RFC 7992 inhabitant profile. */
export const rfc7992Profile: Profile = Object.freeze({
  name: "rfc7992",
  classes: RFC7992_CLASSES,
  lint,
});

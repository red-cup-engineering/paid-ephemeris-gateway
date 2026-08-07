/**
 * codecs/path/object/attribute
 *
 * Attribute restricts an addressable object by the predicate/attribute reading
 * of the path. Format-bearing descendants must pass through this node.
 */
import { restrict, type Projector } from "../../../../holography/index.mjs";
import { objectProjector } from "../index.mjs";

export const attributeProjector: Projector<unknown> = restrict(objectProjector, {
  type: "attribute",
});

export { objectProjector } from "../index.mjs";

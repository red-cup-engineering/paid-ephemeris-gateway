/**
 * codecs/path/object/attribute/file/flatfile/serialization/projector
 *
 * The serialization node in the path projector hierarchy. Kept separate from
 * the serialization barrel so leaf codecs can depend on the parent projector
 * without initializing sibling serializers.
 */
import { restrict, type Projector } from "../../../../../../../holography/index.mjs";
import { flatfileProjector } from "../index.mjs";

export const serializationProjector: Projector<unknown> = restrict(flatfileProjector, {
  type: "serialization",
});

export { flatfileProjector } from "../index.mjs";

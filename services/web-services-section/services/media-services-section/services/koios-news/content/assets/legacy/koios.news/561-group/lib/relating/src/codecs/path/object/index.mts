/**
 * codecs/path/object
 *
 * An object is an addressable path object: a path recognized as carrying an
 * object-position in the path category.
 */
import { restrict, type Projector } from "../../../holography/index.mjs";
import { pathProjector } from "../projector.mjs";

export const objectProjector: Projector<unknown> = restrict(pathProjector, {
  type: "object",
});

export { pathProjector } from "../projector.mjs";

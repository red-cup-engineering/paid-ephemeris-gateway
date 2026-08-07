/**
 * codecs/path/object/attribute/file
 *
 * File restricts an attributed path object to a boundary carrying text content.
 */
import { restrict, type Projector } from "../../../../../holography/index.mjs";
import { attributeProjector } from "../index.mjs";

export const fileProjector: Projector<unknown> = restrict(attributeProjector, {
  type: "file",
  recognize: (resource) => typeof resource.content === "string",
});

export { attributeProjector } from "../index.mjs";

/**
 * codecs/path/object/attribute/file/flatfile
 *
 * Flatfile restricts a file to a single textual byte stream. A NUL byte is not
 * valid flatfile content.
 */
import { restrict, type Projector } from "../../../../../../holography/index.mjs";
import { fileProjector } from "../index.mjs";

export const flatfileProjector: Projector<unknown> = restrict(fileProjector, {
  type: "flatfile",
  recognize: (resource) => !resource.content.includes("\u0000"),
});

export { fileProjector } from "../index.mjs";

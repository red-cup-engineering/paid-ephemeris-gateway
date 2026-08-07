/**
 * codecs/path/object/attribute/file/flatfile/text
 *
 * Text restricts a flatfile to human-oriented textual formats. Markdown lives
 * below this node; machine serialization formats live under serialization.
 */
import { restrict, type Projector } from "../../../../../../../holography/index.mjs";
import { flatfileProjector } from "../index.mjs";

export const textProjector: Projector<unknown> = restrict(flatfileProjector, {
  type: "text",
});

export { flatfileProjector } from "../index.mjs";

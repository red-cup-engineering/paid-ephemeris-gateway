/**
 * codecs/path/object/attribute/file/flatfile/serialization
 *
 * Serialization restricts a flatfile to a concrete external data format.
 * HTML, JSON, JSONL, EAVT, Datom, TOML, Turtle, and XML (with SVG below it) live
 * below this node.
 */
export { flatfileProjector, serializationProjector } from "./projector.mjs";
export { htmlProjector } from "./html/projector.mjs";
export { xmlProjector } from "./xml/projector.mjs";
export { svgProjector } from "./xml/svg/projector.mjs";

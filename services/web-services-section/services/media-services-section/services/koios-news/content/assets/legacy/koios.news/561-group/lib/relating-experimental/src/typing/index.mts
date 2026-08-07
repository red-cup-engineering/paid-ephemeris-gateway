/**
 * typing — objects are data; their TypeScript type is the forgetful functor.
 *
 * Each category's object lives in an `object.schema.json` (runtime validator,
 * transport documentation, and the source of its TS type). `realize` is the
 * forgetful functor `Sub(J) → StructuralTypes`; `print`/`generateDeclaration` is
 * the representation boundary that emits TypeScript. The structural-type carrier
 * is also the semantics the schema codec otherwise lacks.
 */
export {
  type StructuralType,
  type StructuralField,
  unknownType,
  neverType,
  primitive,
  literal,
  array,
  tuple,
  ref,
  objectType,
  union,
  intersection,
} from "./structural.mjs";

export { realize, realizeDefs } from "./realize.mjs";
export { printType, generateDeclaration } from "./print.mjs";

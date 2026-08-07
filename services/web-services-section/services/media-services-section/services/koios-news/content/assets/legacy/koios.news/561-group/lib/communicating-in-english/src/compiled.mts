/**
 * The compiled English bundle: the witnessed finite vocabulary the English fiber
 * is read over. `load` (the fiber-algebra functor) lives in the base; this
 * package supplies only the language data and its compilation.
 */
import { load } from "@emsenn/communicating/speaking/listening/algebra";
import { rawBundle } from "./bundle.mjs";

/** Compiled English bundle: raw fiber data lifted into a CompiledBundle. */
export const english = load(rawBundle);
export default english;

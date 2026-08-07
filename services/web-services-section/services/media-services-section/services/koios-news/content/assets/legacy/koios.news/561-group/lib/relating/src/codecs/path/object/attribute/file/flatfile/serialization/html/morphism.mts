/**
 * codecs/html/morphism — the class-as-morphism registry. In SHP an HTML `class`
 * names a morphism identity (a predicate), not a styling hint. The registry is
 * the correspondence between a carrier predicate and its packet class.
 */
import { slug, type HtmlValue } from "./escape.mjs";

/**
 * A class-to-predicate binding: pairs a packet `className` with the carrier
 * `predicate` it identifies in the registry.
 */
export interface Morphism {
  readonly className: string;
  readonly predicate: HtmlValue;
}

/**
 * The correspondence between carrier predicates and packet classes: maps a
 * predicate to the class that identifies its morphism, and a class back to the
 * predicate it identifies.
 */
export interface MorphismRegistry {
  /** the class that identifies this predicate's morphism in the packet. */
  className(predicate: HtmlValue): string;
  /** the predicate a class identifies (the class itself when not registered). */
  predicate(className: string): HtmlValue;
}

const keyOf = (predicate: HtmlValue): string =>
  typeof predicate === "string" ? predicate : JSON.stringify(predicate ?? null);

/** The default registry: class = slug(predicate). The inverse is lossy (slug is
 *  not injective), so it returns the class itself as the recoverable identity. */
export function defaultMorphisms(): MorphismRegistry {
  return {
    className: (predicate) => slug(predicate),
    predicate: (className) => className,
  };
}

/** A registry over an explicit class↔predicate vocabulary (e.g. RFC 7992's
 *  structural classes). Predicates not listed fall back to the slug default. */
export function morphismRegistry(morphisms: readonly Morphism[]): MorphismRegistry {
  const byPredicate = new Map<string, string>();
  const byClass = new Map<string, HtmlValue>();
  for (const m of morphisms) {
    byPredicate.set(keyOf(m.predicate), m.className);
    byClass.set(m.className, m.predicate);
  }
  return {
    className: (predicate) => byPredicate.get(keyOf(predicate)) ?? slug(predicate),
    predicate: (className) => byClass.get(className) ?? className,
  };
}

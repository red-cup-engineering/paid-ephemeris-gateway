/** The six engine concepts every Equivo register must cover -- equivo-design.md §6's table rows,
 * one per stage of the core loop (§1) plus the optional repair arc. */
export type EquivoConceptKey = 'distinguish' | 'relate' | 'measure' | 'settle' | 'observe' | 'repair';

export const EQUIVO_CONCEPT_KEYS: readonly EquivoConceptKey[] = ['distinguish', 'relate', 'measure', 'settle', 'observe', 'repair'];

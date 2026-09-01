/** equivo-design.md §5/§6.2: obsmetrologia is measurement-first. Every row here is corpus-
 * sourced (dossier §3 citations, reproduced verbatim into the `source` field), except `repair`,
 * which the design honestly reports as having no single named primitive in this lens. */
import type { PresentationRegister } from '../../../src/register.mts';
import type { EquivoConceptKey } from './concept-key.mts';

export const obsmetrologiaRegister: PresentationRegister<EquivoConceptKey> = {
  id: 'equivo-obsmetrologia',
  terms: {
    distinguish: { state: 'present', term: 'Mark / Kind (token / claim)', source: 'chapters/primitives/01-marks-and-kinds.tex' },
    relate: { state: 'present', term: 'Utterance / Articulating', source: 'Obsmetrologia.lean' },
    measure: { state: 'present', term: 'Charge (FOUR); measured vs. seeded', source: 'Obsmetrologia.Articulating.Cell' },
    settle: { state: 'present', term: 'Closure / settle (Knaster-Tarski lfp)', source: 'chapters/settling/03-*.tex' },
    observe: { state: 'present', term: 'Observation (light-cone reconstruction); Obstruction = H1', source: 'CausalSets...LightObservation; sheaf-cohomology/*.tex' },
    repair: { state: 'absent', reason: 'no single named repair primitive in this lens -- nearest analog is the self-correction ledger discipline, one level up from the executable pipeline (equivo-design.md §3)' },
  },
};

/** equivo-design.md §5/§6: semiotics is sign/interpretant-first. */
import type { PresentationRegister } from '@red-cup-engineering/education-platform-service/register';
import type { EquivoConceptKey } from './concept-key.mts';

export const semioticsRegister: PresentationRegister<EquivoConceptKey> = {
  id: 'equivo-semiotics',
  terms: {
    distinguish: { state: 'present', term: 'articulate / Mark (opaque atom), Token / Claim', source: 'articulating/utterance.mts' },
    relate: { state: 'present', term: 'predicate -- Cell = subject/predicate/object (Phi = E x Pi x E)', source: 'predicating/predication.mts' },
    measure: { state: 'present', term: 'posit -- "value enters predication by evidence"', source: 'positing/bilattice-charge.mts' },
    settle: { state: 'present', term: 'settle -- "the knowledge-least fixed point"', source: 'settling/document.mts' },
    observe: { state: 'present', term: 'analyze; H0/H1 sheaf-cohomology modules', source: 'settling/analysis/index.mts' },
    repair: { state: 'absent', reason: 'not directly named -- "abduction" is the nearest conceptual analog, not confirmed as a repair operator (equivo-design.md §3)' },
  },
};

/**
 * equivo-design.md §6.3, the non-negotiable case: the dossier checked all nine assigned corpora
 * against all six engine-concept rows and found ZERO Lakota-specific vocabulary -- a confirmed
 * absence, not a sampling gap. Every entry below is `{ state: 'absent', reason }`. No agent,
 * including whichever one built this file, may synthesize plausible-sounding terms here by
 * analogy from the other three registers -- doing so would misrepresent a fabrication as the
 * owner's own fourth lens. Populating this register is an authoring dependency on the owner.
 */
import type { PresentationRegister } from '../../../src/register.mts';
import type { EquivoConceptKey } from './concept-key.mts';

const REASON = 'owner-authored Lakotaean source material does not currently exist in any surveyed corpus (equivo-design.md §6.3) -- this is a confirmed absence across all nine assigned corpora, not a sampling gap, and no agent may synthesize a term here by analogy from the other three registers.';

export const lakotaeanRegister: PresentationRegister<EquivoConceptKey> = {
  id: 'equivo-lakotaean',
  terms: {
    distinguish: { state: 'absent', reason: REASON },
    relate: { state: 'absent', reason: REASON },
    measure: { state: 'absent', reason: REASON },
    settle: { state: 'absent', reason: REASON },
    observe: { state: 'absent', reason: REASON },
    repair: { state: 'absent', reason: REASON },
  },
};

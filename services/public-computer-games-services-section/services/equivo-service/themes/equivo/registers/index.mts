/** The full set of Equivo presentation registers, keyed by id, plus the player-facing list --
 * equivo-design.md §6.1: "a player picks a lens at theme/session start... the same underlying
 * exercise spec renders through whichever register is active." Open question §3.3 in the design
 * doc (list Lakotaean as a visibly-absent option, or hide it from selection?) is left to the
 * owner; this build lists it (honest absence, per §6.3's own preferred reading of that question),
 * with `shippedFull: false` so a UI can distinguish it in its own way if the owner decides
 * otherwise later -- nothing here decides that question for them.
 */
import { obsmetrologiaRegister } from './obsmetrologia.mts';
import { semioticsRegister } from './semiotics.mts';
import { relationalityRegister } from './relationality.mts';
import { lakotaeanRegister } from './lakotaean.mts';
import type { EquivoConceptKey } from './concept-key.mts';
import type { PresentationRegister } from '@red-cup-engineering/education-platform-service/register';

export const equivoRegisters: Record<string, PresentationRegister<EquivoConceptKey>> = {
  [obsmetrologiaRegister.id]: obsmetrologiaRegister,
  [semioticsRegister.id]: semioticsRegister,
  [relationalityRegister.id]: relationalityRegister,
  [lakotaeanRegister.id]: lakotaeanRegister,
};

/** The three MVP-in-scope lenses (equivo-design.md §8) -- shippable as a default selection list. */
export const MVP_REGISTER_IDS: readonly string[] = [obsmetrologiaRegister.id, semioticsRegister.id, relationalityRegister.id];

export { obsmetrologiaRegister, semioticsRegister, relationalityRegister, lakotaeanRegister };
export type { EquivoConceptKey };

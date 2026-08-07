/**
 * actions — knowing's registered epistemic operations.
 *
 * Knowing owns proof search, concept formation, and the cognizing comonad. Concrete
 * filepath memorystore admission lives downstream in @emsenn/organizing-a-knowledge-vault.
 */
import type { Action } from "@emsenn/relating";
import { cognizingActions } from "./cognizing/index.mjs";
import { findAction } from "./proving/index.mjs";
import { conceptualizeAction } from "./closing/index.mjs";
import { actionResearchCycleAction, actionResearchSequenceAction, aperiodicDreamAction, aperiodicHologramAction, aperiodicResidueAction, conjuncturalPraxisAction, discoveryLedgerAction, frontierAgendaAction, holographicPraxisAction, metastableTrajectoryAction, praxisFeedbackAction, praxisFrontierAction, praxisProbesAction, researchProgramAuditAction, worldMethodBraidAction, worldMethodConstellationAction, worldMethodEcologyAction, worldMethodFeedbackAction, worldMethodInterventionPlanAction, worldMethodRepertoireAction, worldMethodWayfindingAction } from "./dreaming/index.mjs";
import { memoryActions } from "./memory/index.mjs";
import { researchActions } from "./researching/index.mjs";

/** The package's actions — the source `induceBins` reads. */
export const actions: readonly Action[] = Object.freeze([
  findAction,
  conceptualizeAction,
  aperiodicResidueAction,
  aperiodicDreamAction,
  discoveryLedgerAction,
  aperiodicHologramAction,
  holographicPraxisAction,
  conjuncturalPraxisAction,
  actionResearchCycleAction,
  actionResearchSequenceAction,
  metastableTrajectoryAction,
  worldMethodRepertoireAction,
  worldMethodInterventionPlanAction,
  worldMethodFeedbackAction,
  worldMethodEcologyAction,
  worldMethodBraidAction,
  worldMethodConstellationAction,
  worldMethodWayfindingAction,
  frontierAgendaAction,
  researchProgramAuditAction,
  praxisProbesAction,
  praxisFrontierAction,
  praxisFeedbackAction,
  ...memoryActions,
  ...researchActions,
  ...cognizingActions,
]);

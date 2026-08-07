export { working } from "./working.mjs";
export type { AgentPresheaf } from "./working.mjs";

export {
  WORK_TYPES,
  meaningSettled,
  executionSettled,
  workTypeOf,
  deriveWorkType,
  settlementLeq,
} from "./work-type.mjs";
export type { WorkType, GoalCell, ClosureRule, TaskClosure } from "./work-type.mjs";

export {
  WORK_PREDICATES,
  workSubject,
  workAgent,
  workTask,
  workItem,
  assignWork,
  workProject,
  workReport,
} from "./work-item.mjs";
export type {
  WorkEvidenceCarrier,
  WorkId,
  OfficeName,
  CapabilityName,
  DutyName,
  WorkStatus,
  WorkTerm,
  WorkAgent,
  WorkTask,
  WorkItem,
  WorkAssignment,
  WorkProject,
  WorkReport,
} from "./work-item.mjs";

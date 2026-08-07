// researching/sourcing — the intake side of Koios.News.
//
// Sourcing reads the publication property as declared in
// content-production.config.json: beats, source endpoints, and seed terms. It
// does not fetch or rank by itself; it gives the newsroom a stable reading of
// what the farm is allowed to listen to.

import { koiosFarmProperty, SEED_KEYWORDS, type KoiosBeat, type SeedKeyword } from "../../demand.mjs";
import { researchPacket, type ResearchPacket } from "./research-packets.mjs";
import { sourceRollReading, type SourceRollReading } from "./sources.mjs";

export type BeatSourceReading = Readonly<{
  beat: KoiosBeat | string;
  sourceCount: number;
  sources: readonly string[];
  seedTerms: readonly string[];
}>;

export type SourcingDepartmentReading = Readonly<{
  department: "researching.sourcing";
  property: string;
  beats: readonly BeatSourceReading[];
  sourceRoll: SourceRollReading;
  researchPacketPolicy: Readonly<{
    route: string;
    assignmentRoute: string;
    note: string;
  }>;
  submissionDesk: Readonly<{
    route: string;
    note: string;
  }>;
  sourceCount: number;
  seedCount: number;
}>;

function seedTermsForBeat(seeds: readonly SeedKeyword[], beat: string): readonly string[] {
  return Object.freeze(seeds
    .filter((seed) => seed.beat === beat)
    .map((seed) => seed.term));
}

export function sourcingDepartmentReading(): SourcingDepartmentReading {
  const property = koiosFarmProperty();
  const seeds = SEED_KEYWORDS;
  const beats = Object.entries(property.beatSources)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([beat, sources]): BeatSourceReading => Object.freeze({
      beat,
      sourceCount: sources.length,
      sources: Object.freeze(sources.map((source) => String(source))),
      seedTerms: seedTermsForBeat(seeds, beat),
    }));
  return Object.freeze({
    department: "researching.sourcing",
    property: property.name,
    beats: Object.freeze(beats),
    sourceRoll: sourceRollReading(),
    researchPacketPolicy: Object.freeze({
      route: "/operators/research-packets.json?term={term}&beat={beat}",
      assignmentRoute: "/operators/assignments/{assignmentId}/research.json",
      note: "Research packets fold local wire evidence for a term and beat, then expose source URLs and candidate CSL references without writing manuscripts.",
    }),
    submissionDesk: Object.freeze({
      route: "/operators/sourcing/submit-source",
      note: "Submit one specific source material; the desk appraises beat fit, and if it belongs in a Koios beat, works it into a draft candidate through the same cultivation cycle every article runs through.",
    }),
    sourceCount: beats.reduce((sum, beat) => sum + beat.sourceCount, 0),
    seedCount: seeds.length,
  });
}

export {
  researchPacket,
} from "./research-packets.mjs";
export {
  sourceRollReading,
} from "./sources.mjs";
export type {
  ResearchPacket,
} from "./research-packets.mjs";
export type {
  SourceRollReading,
} from "./sources.mjs";

export {
  desksReading,
} from "./desks.mjs";
export type {
  DesksReading,
  DeskReading,
  DesksOptions,
} from "./desks.mjs";

export {
  keywordDiscoveryReading,
  googleTrendsProbe,
  readBeatIntake,
} from "./discovery.mjs";
export type {
  KeywordDiscoveryReading,
  KeywordDiscoveryOptions,
  CoverageGap,
  CandidateKeyword,
  CandidateSource,
  TrendSignal,
  TrendsReading,
  TrendProbeResult,
  TrendProbeItem,
} from "./discovery.mjs";

export {
  appraiseSubmission,
  gatherRelatedSources,
  isOutOfFrame,
  submitSource,
  syndicationItemFromSubmission,
} from "./source-submission.mjs";
export type {
  SubmittedSource,
  SubmitSourceOptions,
  SubmissionAppraisal,
  BeatFitScore,
  GatheredSources,
  SourceSubmissionJudgment,
  SourceSubmissionCultivated,
  SourceSubmissionOutOfFrame,
} from "./source-submission.mjs";

export {
  koiosSourceCyclePlan,
  runKoiosSourceCycle,
  sourceCycleRepairPacketsReading,
} from "./source-cycle.mjs";
export type {
  KoiosSourceCyclePlan,
  KoiosSourceCycleReading,
  KoiosSourceCycleOptions,
  SourceCycleRepairPacket,
  SourceCycleRepairPacketsReading,
  SourceCycleRepairTask,
} from "./source-cycle.mjs";

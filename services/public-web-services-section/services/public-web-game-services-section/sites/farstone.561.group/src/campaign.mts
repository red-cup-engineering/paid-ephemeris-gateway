import { awardCampaign, campaignStage } from "@red-cup-engineering/feltos/progression";

/** The Off-Season is expressed as monotone world requirements, not callbacks hidden in content. */
export const OFF_SEASON = Object.freeze([
  { id: "feet", title: "Find Your Feet", requirements: [{ predicate: "coin", atLeast: 60 }], reward: 25 },
  { id: "trade", title: "A Trade in Hand", requirements: [{ predicate: "skill", atLeast: 15 }], reward: 30 },
  { id: "eye", title: "A Keener Eye", requirements: [{ predicate: "thoughts-fixed", atLeast: 1 }], reward: 30 },
  { id: "roof", title: "A Roof of Your Own", requirements: [{ predicate: "structures-built", atLeast: 1 }], reward: 40 },
  { id: "permit", title: "A Hand in the Dispute", requirements: [{ predicate: "permit-resolved", atLeast: 1 }], reward: 50 },
  { id: "pillar", title: "Pillar of the Harbor", requirements: [{ predicate: "standing", atLeast: 40 }], reward: 80 },
]);

export const offSeasonStage = (world: unknown, actor: string): number => campaignStage(world, actor, OFF_SEASON);
export const settleOffSeason = (world: unknown, actor: string) => awardCampaign(world, actor, OFF_SEASON);
